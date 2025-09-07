import * as crypto from 'crypto';

// Enhanced type definitions with additional constraints
export type CharsetType =
  | 'letters'
  | 'numbers'
  | 'mixed'
  | 'uppercaseDigits'
  | 'secure'
  | 'uppercaseLetters';
export type SecureEncoding = 'hex' | 'base64' | 'base64url';
export type HashAlgorithm = 'sha256' | 'sha384' | 'sha512';

// Improved interface definitions with readonly properties
interface CharsetConfig {
  readonly charset: string;
  readonly minLength: number;
  readonly maxLength: number;
  readonly entropyBitsPerChar?: number;
  readonly purpose?: string;
}

interface SecurityOptions {
  readonly algorithm?: HashAlgorithm;
  readonly encoding?: SecureEncoding;
  readonly iterations?: number;
  readonly keyLength?: number;
}

// Enhanced charset configurations with additional secure option
const CHARSET_CONFIGS: Readonly<Record<CharsetType, CharsetConfig>> = {
  secure: {
    charset:
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{}|;:,.<>?',
    minLength: 12,
    maxLength: 128,
    entropyBitsPerChar: Math.log2(60),
    purpose: 'High-security tokens and keys',
  },
  letters: {
    charset: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
    minLength: 8,
    maxLength: 64,
    entropyBitsPerChar: Math.log2(52),
    purpose: 'Alphabetic identifiers',
  },
  numbers: {
    charset: '0123456789',
    minLength: 6,
    maxLength: 12,
    entropyBitsPerChar: Math.log2(10),
    purpose: 'Numeric codes',
  },
  uppercaseDigits: {
    charset: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
    minLength: 16,
    maxLength: 32,
    entropyBitsPerChar: Math.log2(36),
    purpose: 'Human-readable identifiers',
  },
  uppercaseLetters: {
    charset: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    minLength: 8,
    maxLength: 64,
    purpose: 'Alphabetic identifiers',
  },
  mixed: {
    charset: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
    minLength: 8,
    maxLength: 64,
    entropyBitsPerChar: Math.log2(62),
    purpose: 'General-purpose identifiers',
  },
};

// Enhanced security constants
const SECURITY_CONSTANTS = Object.freeze({
  MIN_ENTROPY_BITS: 128, // Increased from 64
  MIN_KEY_LENGTH: 32,
  DEFAULT_HASH_ALGORITHM: 'sha512' as HashAlgorithm,
  DEFAULT_ENCODING: 'base64' as SecureEncoding,
  PBKDF2_ITERATIONS: 310000, // OWASP recommended minimum
  SALT_LENGTH: 32,
  TIMING_SAFE_EQUAL_PAD_LENGTH: 64,
});

// Improved error classes with error codes and stack traces
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'VALIDATION_ERROR',
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ValidationError';
    Error.captureStackTrace(this, ValidationError);
  }
}

export class CryptoError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'CRYPTO_ERROR',
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'CryptoError';
    Error.captureStackTrace(this, CryptoError);
  }
}

// Enhanced type guard with additional checks
function isSecureEncoding(encoding: unknown): encoding is SecureEncoding {
  return (
    typeof encoding === 'string' &&
    ['hex', 'base64', 'base64url'].includes(encoding)
  );
}

function isHashAlgorithm(algorithm: unknown): algorithm is HashAlgorithm {
  return (
    typeof algorithm === 'string' &&
    ['sha256', 'sha384', 'sha512'].includes(algorithm)
  );
}

// Improved entropy validation with additional checks
function validateEntropy(length: number, config: CharsetConfig): void {
  if (!Number.isFinite(length) || length <= 0) {
    throw new ValidationError(
      'Length must be a positive finite number',
      'INVALID_LENGTH',
      { providedLength: length }
    );
  }

  // Add a default entropy bits per char if not provided
  const entropyBitsPerChar = config.entropyBitsPerChar ?? 4;

  const totalBitsOfEntropy = length * entropyBitsPerChar;

  if (totalBitsOfEntropy < SECURITY_CONSTANTS.MIN_ENTROPY_BITS) {
    throw new ValidationError(
      `Insufficient entropy: ${totalBitsOfEntropy.toFixed(2)} bits. Minimum required: ${SECURITY_CONSTANTS.MIN_ENTROPY_BITS} bits.`,
      'INSUFFICIENT_ENTROPY',
      {
        providedEntropy: totalBitsOfEntropy,
        requiredEntropy: SECURITY_CONSTANTS.MIN_ENTROPY_BITS,
        recommendedLength: Math.ceil(
          SECURITY_CONSTANTS.MIN_ENTROPY_BITS / entropyBitsPerChar
        ),
      }
    );
  }
}

// Enhanced secure memory cleanup with additional protections
function secureMemoryCleanup(
  data: Buffer | string | number[] | Uint8Array | undefined
): void {
  try {
    if (!data) return;

    if (Buffer.isBuffer(data) || data instanceof Uint8Array) {
      crypto.randomFillSync(data); // Overwrite with random data first
      data.fill(0);
    } else if (Array.isArray(data)) {
      const uint8Array = new Uint8Array(data);
      crypto.randomFillSync(uint8Array); // Overwrite with random data
      uint8Array.fill(0);
    } else if (typeof data === 'string') {
      // Create a new string of same length filled with zeros
      // Note: This is best-effort as strings are immutable
      data = '0'.repeat(data.length);
    }
  } catch (error) {
    // Silent catch - we don't want to throw during cleanup
    console.error('Error during secure memory cleanup:', error);
  }
}

// New utility function for constant-time string comparison
function constantTimeStringCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);

    // Pad both buffers to same length to prevent timing attacks
    const paddedLength = Math.max(
      bufA.length,
      bufB.length,
      SECURITY_CONSTANTS.TIMING_SAFE_EQUAL_PAD_LENGTH
    );

    const paddedA = Buffer.alloc(paddedLength, 0);
    const paddedB = Buffer.alloc(paddedLength, 0);

    bufA.copy(paddedA);
    bufB.copy(paddedB);

    return crypto.timingSafeEqual(paddedA, paddedB);
  } catch (error) {
    throw new CryptoError(
      'Failed to perform constant-time string comparison',
      'COMPARISON_ERROR',
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
}

export function hashCodeVerifier(codeVerifier: string): string {
  return crypto.createHash('sha256').update(codeVerifier).digest('base64url');
}

/**
 * Enhanced code generation with improved security
 */
export function generateSecureCode(
  length: number,
  type: CharsetType,
  purpose?: string
): string {
  const config = CHARSET_CONFIGS[type];

  if (purpose && purpose.length > 0) {
    // Log purpose for audit trails (if logging is implemented)
    console.debug(`Generating secure code for purpose: ${purpose}`);
  }

  validateEntropy(length, config);

  try {
    // Use a larger buffer for better unbiasing
    const bytes = crypto.randomBytes(length * 4);
    const result = new Uint8Array(length);
    const charset = config.charset;
    const charsetLength = charset.length;

    // Improved unbiasing with a larger modulus
    const maxUnbiasedValue =
      Math.floor(0xffffffff / charsetLength) * charsetLength;
    let resultIndex = 0;

    for (let i = 0; resultIndex < length; i += 4) {
      // Use all 4 bytes for better distribution
      const randomValue =
        (bytes[i] << 24) |
        (bytes[i + 1] << 16) |
        (bytes[i + 2] << 8) |
        bytes[i + 3];

      if (randomValue < maxUnbiasedValue) {
        result[resultIndex] = charset.charCodeAt(randomValue % charsetLength);
        resultIndex++;
      }
    }

    const finalResult = String.fromCharCode(...result);

    // Enhanced cleanup
    secureMemoryCleanup(bytes);
    secureMemoryCleanup(result);

    return finalResult;
  } catch (error) {
    throw new CryptoError(
      'Failed to generate secure random code',
      'GENERATION_ERROR',
      {
        type,
        length,
        error: error instanceof Error ? error.message : String(error),
      }
    );
  }
}

/**
 * Generates a unique transaction code
 * @param length - Length of the transaction code (default: 12)
 * @returns A unique transaction code as a string
 */
export function generateTransactionCode(length = 12): string {
  // Alphanumeric characters without confusing characters like I, O, 1, 0
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(length);
  let result = '';

  for (let i = 0; i < length; i++) {
    // Map each byte to a character in the charset
    result += charset[bytes[i] % charset.length];
  }

  return result;
}

/**
 * Enhanced transaction signature creation with additional security options
 */
export function createTransactionSignature(
  transactionData: Record<string, unknown>,
  secretKey: string,
  options: SecurityOptions = {}
): string {
  // Validate inputs
  if (
    !secretKey?.length ||
    secretKey.length < SECURITY_CONSTANTS.MIN_KEY_LENGTH
  ) {
    throw new ValidationError(
      `Secret key must be at least ${SECURITY_CONSTANTS.MIN_KEY_LENGTH} characters`,
      'INVALID_KEY_LENGTH',
      { keyLength: secretKey?.length ?? 0 }
    );
  }

  if (
    !transactionData ||
    typeof transactionData !== 'object' ||
    Array.isArray(transactionData)
  ) {
    throw new ValidationError(
      'Transaction data must be a non-null object',
      'INVALID_TRANSACTION_DATA'
    );
  }

  const algorithm = isHashAlgorithm(options.algorithm)
    ? options.algorithm
    : SECURITY_CONSTANTS.DEFAULT_HASH_ALGORITHM;

  const encoding = isSecureEncoding(options.encoding)
    ? options.encoding
    : SECURITY_CONSTANTS.DEFAULT_ENCODING;

  try {
    // Generate a unique salt for each signature
    const salt = crypto.randomBytes(SECURITY_CONSTANTS.SALT_LENGTH);

    // Create derived key using PBKDF2
    const derivedKey = crypto.pbkdf2Sync(
      secretKey,
      salt,
      SECURITY_CONSTANTS.PBKDF2_ITERATIONS,
      32,
      'sha512'
    );

    // Sort object keys for consistent ordering
    const sortedData = JSON.parse(JSON.stringify(transactionData));
    Object.keys(sortedData)
      .sort()
      .forEach((key) => {
        const value = sortedData[key];
        delete sortedData[key];
        sortedData[key] = value;
      });

    // Create HMAC with derived key
    const hmac = crypto.createHmac(algorithm, derivedKey);
    hmac.update(salt); // Include salt in signature
    hmac.update(JSON.stringify(sortedData));

    // Combine salt and signature
    const signature = Buffer.concat([salt, Buffer.from(hmac.digest())]);

    return signature.toString(encoding);
  } catch (error) {
    throw new CryptoError(
      'Failed to create transaction signature',
      'SIGNATURE_CREATION_ERROR',
      {
        algorithm,
        encoding,
        error: error instanceof Error ? error.message : String(error),
      }
    );
  } finally {
    secureMemoryCleanup(secretKey);
  }
}

/**
 * Enhanced signature verification with additional security measures
 */
export function verifyTransactionSignature(
  transactionData: Record<string, unknown>,
  signature: string,
  secretKey: string,
  options: SecurityOptions = {}
): boolean {
  try {
    if (!signature || typeof signature !== 'string') {
      throw new ValidationError(
        'Invalid signature format',
        'INVALID_SIGNATURE_FORMAT'
      );
    }

    const encoding = isSecureEncoding(options.encoding)
      ? options.encoding
      : SECURITY_CONSTANTS.DEFAULT_ENCODING;

    const algorithm = isHashAlgorithm(options.algorithm)
      ? options.algorithm
      : SECURITY_CONSTANTS.DEFAULT_HASH_ALGORITHM;

    // Extract salt and signature parts
    const signatureBuffer = Buffer.from(signature, encoding);
    const salt = signatureBuffer.slice(0, SECURITY_CONSTANTS.SALT_LENGTH);
    const providedSignature = signatureBuffer.slice(
      SECURITY_CONSTANTS.SALT_LENGTH
    );

    // Create derived key using PBKDF2
    const derivedKey = crypto.pbkdf2Sync(
      secretKey,
      salt,
      SECURITY_CONSTANTS.PBKDF2_ITERATIONS,
      32,
      'sha512'
    );

    // Sort object keys for consistent ordering
    const sortedData = JSON.parse(JSON.stringify(transactionData));
    Object.keys(sortedData)
      .sort()
      .forEach((key) => {
        const value = sortedData[key];
        delete sortedData[key];
        sortedData[key] = value;
      });

    // Create HMAC with derived key
    const hmac = crypto.createHmac(algorithm, derivedKey);
    hmac.update(salt);
    hmac.update(JSON.stringify(sortedData));

    const expectedSignature = hmac.digest();

    // Use constant-time comparison
    return crypto.timingSafeEqual(providedSignature, expectedSignature);
  } catch (error) {
    if (error instanceof ValidationError || error instanceof CryptoError) {
      throw error;
    }
    throw new CryptoError(
      'Failed to verify transaction signature',
      'SIGNATURE_VERIFICATION_ERROR',
      {
        error: error instanceof Error ? error.message : String(error),
      }
    );
  } finally {
    secureMemoryCleanup(secretKey);
  }
}

// Export enhanced constants
export const CRYPTO_CONSTANTS = Object.freeze({
  ...SECURITY_CONSTANTS,
  SUPPORTED_ALGORITHMS: ['sha256', 'sha384', 'sha512'] as HashAlgorithm[],
  SUPPORTED_ENCODINGS: ['hex', 'base64', 'base64url'] as SecureEncoding[],
});

export class NamespaceGenerator {
  /**
   * Converts a given string into a namespace-friendly format
   * @param input - The string to be converted (e.g., "Super Admin")
   * @returns A namespace-safe string (e.g., "super_admin")
   */
  static generateNamespace(input: string): string {
    if (!input || typeof input !== 'string') {
      throw new Error('Input must be a non-empty string');
    }

    // Normalize and sanitize the input
    const sanitized = input
      .trim() // Remove leading/trailing whitespace
      .toLowerCase() // Convert to lowercase
      .replace(/[^a-z0-9\s]/g, '') // Remove non-alphanumeric characters except spaces
      .replace(/\s+/g, '_'); // Replace spaces with underscores

    if (!sanitized) {
      throw new Error('Generated namespace is empty or invalid');
    }

    return sanitized;
  }

  /**
   * Capitalizes the first letter of each word
   * @param input - The string to capitalize (e.g., "super admin")
   * @returns A string with each word capitalized (e.g., "Super Admin")
   */
  static capitalize(input: string): string {
    if (!input || typeof input !== 'string') {
      throw new Error('Input must be a non-empty string');
    }

    return input
      .trim() // Remove leading/trailing whitespace
      .toLowerCase() // Normalize case
      .replace(/\b\w/g, (char) => char.toUpperCase()); // Capitalize first letter of each word
  }
}

/**
 * Generates a secure appSecret using the 'secure' charset configuration
 * @param length Optional length of the secret (defaults to minLength if not specified)
 * @returns A secure appSecret as a string
 * @throws Error if length is outside allowed bounds
 */
export function generateAppSecret(length?: number): string {
  const config = CHARSET_CONFIGS['mixed'];

  // If no length specified, use minimum length
  const secretLength = length || config.minLength;

  // Validate length
  if (secretLength < config.minLength || secretLength > config.maxLength) {
    throw new Error(
      `Secret length must be between ${config.minLength} and ${config.maxLength} characters`
    );
  }

  const charset = config.charset;
  const charsetLength = charset.length;

  // Calculate how many random bytes we need
  // We multiply by 2 to ensure we have enough random bytes to avoid modulo bias
  const randomBytesNeeded = secretLength * 2;
  const bytes = crypto.randomBytes(randomBytesNeeded);
  let result = '';

  // Generate the secret using rejection sampling to avoid modulo bias
  for (let i = 0; i < randomBytesNeeded && result.length < secretLength; i++) {
    // Use two bytes for better distribution
    const randomValue = (bytes[i * 2] << 8) | bytes[i * 2 + 1];
    const maxAcceptable = Math.floor(65536 / charsetLength) * charsetLength;

    if (randomValue < maxAcceptable) {
      result += charset[randomValue % charsetLength];
    }
  }

  // In the extremely unlikely case we didn't get enough characters,
  // generate more bytes and continue
  while (result.length < secretLength) {
    const extraBytes = crypto.randomBytes(2);
    const randomValue = (extraBytes[0] << 8) | extraBytes[1];
    const maxAcceptable = Math.floor(65536 / charsetLength) * charsetLength;

    if (randomValue < maxAcceptable) {
      result += charset[randomValue % charsetLength];
    }

    // Clean up extra bytes
    if (typeof extraBytes.fill === 'function') {
      extraBytes.fill(0);
    }
  }

  // Clean up sensitive data
  if (typeof bytes.fill === 'function') {
    bytes.fill(0);
  }

  return result;
}

/**
 * Generates a unique appId using the 'uppercaseDigits' charset
 * @returns A unique appId as a string
 */
export function generateAppId(): string {
  const config = CHARSET_CONFIGS['uppercaseDigits'];
  const length = 10;
  const bytes = crypto.randomBytes(length);
  let result = '';

  for (let i = 0; i < length; i++) {
    result += config.charset[bytes[i] % config.charset.length];
  }

  return result;
}

/**
 * Generates a unique organization ID with 25 characters using the 'uppercaseDigits' charset.
 * @returns A unique organization ID as a string.
 */
export function generateOrganizationId(): string {
  const config = CHARSET_CONFIGS['uppercaseLetters'];
  const length = 16;
  const bytes = crypto.randomBytes(length);
  let result = '';

  for (let i = 0; i < length; i++) {
    result += config.charset[bytes[i] % config.charset.length];
  }

  return result;
}

export function generateCustomImageKey(): string {
  const config = CHARSET_CONFIGS['numbers'];
  const length = 20;
  const bytes = crypto.randomBytes(length);
  let result = '';

  for (let i = 0; i < length; i++) {
    result += config.charset[bytes[i] % config.charset.length];
  }

  return result;
}
