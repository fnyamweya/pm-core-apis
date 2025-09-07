import { randomBytes } from 'crypto';
import {
  hashCodeVerifier as cryptoHashCodeVerifier,
  generateSecureCode,
} from '../../utils/crypto';
import { logger } from '../../utils/logger';
import RedisCache from '../../utils/redisCache';

interface PKCECacheData {
  appId: string;
  redirectUri: string;
  codeChallenge: string;
}

class PKCEService {
  private redisCache: RedisCache<PKCECacheData>;
  private readonly authorizationCodeTTL = 300; // 5 minutes TTL for authorization codes
  private readonly redisKeyPrefix = 'auth_code'; // Prefix for Redis keys

  constructor() {
    this.redisCache = new RedisCache<PKCECacheData>(this.authorizationCodeTTL);
  }

  /**
   * Generate a new authorization code and store PKCE-related data.
   * @param appId - The app ID of the application.
   * @param redirectUri - The redirect URI to validate during token exchange.
   * @param codeChallenge - The code challenge for PKCE validation.
   * @returns The generated authorization code.
   */
  async generateAuthorizationCode(
    appId: string,
    redirectUri: string,
    codeChallenge: string
  ): Promise<string> {
    const authorizationCode = generateSecureCode(
      32,
      'letters',
      'Authorization Code'
    );

    // Store authorization code data in Redis
    const cacheData: PKCECacheData = { appId, redirectUri, codeChallenge };
    await this.redisCache.setToCache(
      this.redisKeyPrefix,
      authorizationCode,
      cacheData,
      this.authorizationCodeTTL
    );

    logger.info('Authorization code generated and stored', {
      authorizationCode,
      appId,
    });
    return authorizationCode;
  }

  /**
   * Validate the authorization code and exchange it for a token.
   * @param authorizationCode - The authorization code to validate.
   * @param codeVerifier - The code verifier for PKCE validation.
   * @param appId - The app ID of the application.
   * @param redirectUri - The redirect URI provided in the token request.
   * @returns A boolean indicating whether the validation was successful.
   */
  async validateAuthorizationCode(
    authorizationCode: string,
    codeVerifier: string,
    appId: string,
    redirectUri: string
  ): Promise<boolean> {
    const cachedDataRaw = await this.redisCache.getFromCache(
      this.redisKeyPrefix,
      authorizationCode
    );

    if (!cachedDataRaw) {
      logger.error('Authorization code not found or expired', {
        authorizationCode,
      });
      return false;
    }

    // Parse and validate the cached data
    let cachedData: PKCECacheData;
    if (typeof cachedDataRaw === 'string') {
      try {
        cachedData = JSON.parse(cachedDataRaw) as PKCECacheData;
      } catch (error) {
        logger.error('Failed to parse cached authorization code data', {
          error,
          cachedDataRaw,
        });
        return false;
      }
    } else {
      cachedData = cachedDataRaw;
    }

    const {
      codeChallenge,
      appId: storedClientId,
      redirectUri: storedRedirectUri,
    } = cachedData;

    // Validate appId and redirectUri
    if (appId !== storedClientId || redirectUri !== storedRedirectUri) {
      logger.error('Client ID or Redirect URI mismatch', {
        appId,
        redirectUri,
      });
      return false;
    }

    // Validate code verifier against the code challenge using the crypto util
    const hashedVerifier = cryptoHashCodeVerifier(codeVerifier);
    if (hashedVerifier !== codeChallenge) {
      logger.error('Code verifier does not match code challenge', {
        authorizationCode,
      });
      return false;
    }

    // Authorization code successfully validated; remove it from the cache
    const deletionSuccess = await this.redisCache.deleteKey(
      this.redisKeyPrefix,
      authorizationCode
    );
    if (deletionSuccess) {
      logger.info('Authorization code validated and deleted', {
        authorizationCode,
      });
    } else {
      logger.warn('Failed to delete authorization code from cache', {
        authorizationCode,
      });
    }
    return true;
  }

  /**
   * Generate a secure code verifier for PKCE.
   * @returns A randomly generated code verifier.
   */
  generateCodeVerifier(): string {
    const codeVerifier = randomBytes(32).toString('base64url');
    logger.info('Code verifier generated', { codeVerifier });
    return codeVerifier;
  }

  /**
   * Generate a code challenge from a code verifier for PKCE.
   * @param codeVerifier - The code verifier to hash.
   * @returns The corresponding code challenge.
   */
  generateCodeChallenge(codeVerifier: string): string {
    const codeChallenge = cryptoHashCodeVerifier(codeVerifier);
    logger.info('Code challenge generated from code verifier', {
      codeChallenge,
    });
    return codeChallenge;
  }
}

export default new PKCEService();
