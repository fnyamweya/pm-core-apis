import * as argon2 from 'argon2';
import { randomBytes, randomFillSync, timingSafeEqual } from 'crypto';
import { logger } from '../utils/logger';
import { RateLimiter } from '../utils/rateLimiter';
import { EnvConfiguration } from './env';

// Custom error types with additional context
class Argon2Error extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'Argon2Error';
  }
}

export class HashingError extends Argon2Error {
  constructor(message: string, details?: unknown) {
    super(message, 'HASHING_ERROR', details);
  }
}

export class VerificationError extends Argon2Error {
  constructor(message: string, details?: unknown) {
    super(message, 'VERIFICATION_ERROR', details);
  }
}

export class InputValidationError extends Argon2Error {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', details);
  }
}

export class RateLimitExceededError extends Argon2Error {
  constructor(message: string, details?: unknown) {
    super(message, 'RATE_LIMIT_EXCEEDED', details);
  }
}

// Improved configuration interface
interface Argon2Config {
  readonly memoryCost: number;
  readonly timeCost: number;
  readonly parallelism: number;
  readonly saltLength: number;
  readonly hashLength: number;
  readonly variant: 'd' | 'i' | 'id'; // Using string literals instead of numbers
}

// Default configuration with strict typing
const DEFAULT_CONFIG: Readonly<Argon2Config> = {
  memoryCost: Number(EnvConfiguration.ARGON2_MEMORY_COST) || 65536, // 64 MB
  timeCost: Number(EnvConfiguration.ARGON2_TIME_COST) || 3,
  parallelism: Number(EnvConfiguration.ARGON2_PARALLELISM) || 4,
  saltLength: 16, // 128 bits
  hashLength: 32, // 256 bits
  variant: 'id', // argon2id
};

// Rate limiter with more granular controls
const hashingRateLimiter = new RateLimiter(
  {
    points: Number(EnvConfiguration.HASH_RATE_LIMIT_POINTS) || 10,
    duration: Number(EnvConfiguration.HASH_RATE_LIMIT_DURATION) || 60,
    blockDuration:
      Number(EnvConfiguration.HASH_RATE_LIMIT_BLOCK_DURATION) || 300,
  },
  undefined
);

const verificationRateLimiter = new RateLimiter(
  {
    points: Number(EnvConfiguration.VERIFY_RATE_LIMIT_POINTS) || 20,
    duration: Number(EnvConfiguration.VERIFY_RATE_LIMIT_DURATION) || 60,
    blockDuration:
      Number(EnvConfiguration.VERIFY_RATE_LIMIT_BLOCK_DURATION) || 300,
  },
  undefined
);

/**
 * Validates and sanitizes input data for hashing or verification.
 * @throws {InputValidationError} If validation fails
 */
function validateInput(data: unknown, context: string): asserts data is string {
  if (typeof data !== 'string') {
    throw new InputValidationError(
      `Invalid input: ${context} must be a string`,
      { type: typeof data }
    );
  }

  if (data.length === 0) {
    throw new InputValidationError(`Invalid input: ${context} cannot be empty`);
  }

  if (data.length > 1024) {
    // Reasonable maximum length
    throw new InputValidationError(
      `Invalid input: ${context} exceeds maximum length`,
      { length: data.length }
    );
  }
}

/**
 * Securely erases sensitive data from memory
 */
function secureErase(buffer: Buffer): void {
  try {
    randomFillSync(buffer);
  } catch (error) {
    logger.warn('Failed to securely erase buffer:', error);
  } finally {
    buffer.fill(0); // Fallback zeroing
  }
}

/**
 * Generates a configuration string for Argon2
 */
export function getArgon2ConfigString(
  config: Partial<Argon2Config> = {}
): string {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  return `$argon2${finalConfig.variant}$v=19$m=${finalConfig.memoryCost},t=${finalConfig.timeCost},p=${finalConfig.parallelism}$`;
}

/**
 * Validates Argon2 configuration parameters
 * @throws {InputValidationError} If configuration is invalid
 */
function validateConfig(config: Partial<Argon2Config>): void {
  if (
    config.memoryCost &&
    (config.memoryCost < 16384 || config.memoryCost > 4194304)
  ) {
    throw new InputValidationError('Invalid memoryCost parameter');
  }
  if (config.timeCost && (config.timeCost < 2 || config.timeCost > 10)) {
    throw new InputValidationError('Invalid timeCost parameter');
  }
  if (
    config.parallelism &&
    (config.parallelism < 1 || config.parallelism > 16)
  ) {
    throw new InputValidationError('Invalid parallelism parameter');
  }
  if (config.saltLength && (config.saltLength < 16 || config.saltLength > 32)) {
    throw new InputValidationError('Invalid saltLength parameter');
  }
  if (config.hashLength && (config.hashLength < 16 || config.hashLength > 64)) {
    throw new InputValidationError('Invalid hashLength parameter');
  }
}

interface HashOptions {
  config?: Partial<Argon2Config>;
  associatedData?: Buffer;
  salt?: Buffer;
}

/**
 * Enhanced credential hashing function with rate limiting and additional security features
 */
export async function hashCredential(
  reqKey: string,
  credential: string,
  options: HashOptions = {}
): Promise<string> {
  try {
    await hashingRateLimiter.consume(reqKey); // Rate limiting
  } catch (error) {
    throw new RateLimitExceededError('Hash rate limit exceeded', { reqKey });
  }

  validateInput(credential, 'credential');
  if (options.config) {
    validateConfig(options.config);
  }

  const finalConfig = { ...DEFAULT_CONFIG, ...options.config };
  const salt = options.salt || randomBytes(finalConfig.saltLength);
  const credentialBuffer = Buffer.from(credential);

  try {
    const hash = await argon2.hash(credential, {
      memoryCost: finalConfig.memoryCost,
      timeCost: finalConfig.timeCost,
      parallelism: finalConfig.parallelism,
      salt,
      hashLength: finalConfig.hashLength,
      ...(options.associatedData && { associatedData: options.associatedData }),
    });

    return hash;
  } catch (error) {
    logger.error('Credential hashing failed:', error);
    throw new HashingError('Credential hashing failed', error);
  } finally {
    secureErase(credentialBuffer);
    if (!options.salt) {
      secureErase(salt);
    }
  }
}

/**
 * Enhanced credential verification with rate limiting and timing attack protection
 */
export async function verifyCredential(
  reqKey: string,
  credential: string,
  hash: string
): Promise<boolean> {
  try {
    await verificationRateLimiter.consume(reqKey); // Rate limiting
  } catch (error) {
    throw new RateLimitExceededError('Verification rate limit exceeded', {
      reqKey,
    });
  }

  validateInput(credential, 'credential');
  validateInput(hash, 'hash');

  const credentialBuffer = Buffer.from(credential);

  try {
    const isValid = await argon2.verify(hash, credential);

    // Use timing-safe comparison to prevent timing attacks
    return timingSafeEqual(Buffer.from([isValid ? 1 : 0]), Buffer.from([1]));
  } catch (error) {
    logger.error('Credential verification failed:', error);
    throw new VerificationError('Credential verification failed', error);
  } finally {
    secureErase(credentialBuffer);
  }
}

/**
 * Updates a credential hash if needed (e.g., if parameters need upgrading)
 */
export async function needsRehash(
  hash: string,
  config: Partial<Argon2Config> = {}
): Promise<boolean> {
  validateInput(hash, 'hash');

  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  try {
    return await argon2.needsRehash(hash, {
      memoryCost: finalConfig.memoryCost,
      timeCost: finalConfig.timeCost,
      parallelism: finalConfig.parallelism,
    });
  } catch (error) {
    logger.error('Error checking if hash needs rehash:', error);
    throw new HashingError('Failed to check if hash needs rehash', error);
  }
}
