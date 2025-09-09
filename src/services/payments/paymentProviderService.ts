import { DeepPartial } from 'typeorm';
import { PaymentProvider } from '../../entities/payments/paymentProviderEntity';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../../errors/httpErrors';
import paymentProviderRepository from '../../repositories/payments/paymentProviderRepository';
import { logger } from '../../utils/logger';
import RedisCache from '../../utils/redisCache';
import { BaseService } from '../baseService';

const CACHE_KEYS = {
  SINGLE_PROVIDER: 'paymentProvider',
  ALL_PROVIDERS: 'allPaymentProviders',
};

interface CreatePaymentProviderDTO {
  paymentProviderCode: string;
  name: string;
  metadata?: Record<string, any>;
}

interface UpdatePaymentProviderDTO {
  name?: string;
  metadata?: Record<string, any>;
}

class PaymentProviderService extends BaseService<PaymentProvider> {
  private providerCache: RedisCache<PaymentProvider>;
  private providersListCache: RedisCache<PaymentProvider[]>;

  constructor() {
    super(
      {
        repository: paymentProviderRepository,
        redisCache: new RedisCache<PaymentProvider>(3600),
        logger,
      },
      'paymentProvider'
    );

    this.providerCache = new RedisCache<PaymentProvider>(3600);
    this.providersListCache = new RedisCache<PaymentProvider[]>(3600);
    this.logger.info('PaymentProviderService initialized');
  }

  /**
   * Creates a new PaymentProvider and invalidates the all providers cache.
   * @param data - Data for creating a new PaymentProvider.
   * @returns The created PaymentProvider entity.
   * @throws BadRequestError if the payment provider code or name is missing.
   * @throws ConflictError if the payment provider code already exists.
   */
  async createPaymentProvider(
    data: CreatePaymentProviderDTO
  ): Promise<PaymentProvider> {
    this.logger.info('Creating new PaymentProvider', { data });

    if (!data.paymentProviderCode || !data.name) {
      throw new BadRequestError('Payment provider code and name are required');
    }

    try {
      const providerData: DeepPartial<PaymentProvider> = {
        paymentProviderCode: data.paymentProviderCode,
        name: data.name,
        metadata: data.metadata,
      };

      const provider =
        await paymentProviderRepository.createPaymentProvider(providerData);

      await this.providerCache.setToCache(
        CACHE_KEYS.SINGLE_PROVIDER,
        provider.paymentProviderCode,
        provider
      );

      await this.providersListCache.deleteKey(
        CACHE_KEYS.SINGLE_PROVIDER,
        CACHE_KEYS.ALL_PROVIDERS
      );

      return provider;
    } catch (error: any) {
      this.logger.error('Error creating PaymentProvider', { data, error });

      const pgCode = error?.details?.originalError?.code || error?.code;
      if (pgCode === '23505') {
        throw new ConflictError('PaymentProvider with this code already exists');
      }
      // best effort: inspect message
      if (error instanceof Error && /unique/i.test(error.message)) {
        throw new ConflictError('PaymentProvider with this code already exists');
      }

      throw new Error('Unable to create payment provider');
    }
  }

  /**
   * Retrieves a PaymentProvider by its code.
   * @param code - The unique code of the PaymentProvider.
   * @returns The PaymentProvider entity or null if not found.
   * @throws BadRequestError if the payment provider code is missing.
   * @throws NotFoundError if the payment provider is not found.
   */
  async getPaymentProviderByCode(
    code: string
  ): Promise<PaymentProvider | null> {
    this.logger.info('Fetching PaymentProvider by code', { code });

    if (!code) {
      throw new BadRequestError('Payment provider code is required');
    }

    try {
      let provider = await this.providerCache.getFromCache(
        CACHE_KEYS.SINGLE_PROVIDER,
        code
      );

      if (!provider) {
        provider =
          await paymentProviderRepository.getPaymentProviderByCode(code);

        if (provider) {
          await this.providerCache.setToCache(
            CACHE_KEYS.SINGLE_PROVIDER,
            code,
            provider
          );
        } else {
          throw new NotFoundError('PaymentProvider not found');
        }
      }

      if (typeof provider === 'string') {
        throw new Error('Invalid provider type');
      }

      return provider;
    } catch (error) {
      this.logger.error('Error fetching PaymentProvider by code', {
        code,
        error,
      });
      throw new Error('Unable to fetch payment provider');
    }
  }

  /**
   * Updates a PaymentProvider by its code and invalidates the all providers cache.
   * @param code - The unique code of the PaymentProvider.
   * @param data - Partial data to update the PaymentProvider with.
   * @returns The updated PaymentProvider entity or null if not found.
   * @throws BadRequestError if the payment provider code is missing.
   * @throws NotFoundError if the payment provider is not found.
   */
  async updatePaymentProviderByCode(
    code: string,
    data: UpdatePaymentProviderDTO
  ): Promise<PaymentProvider | null> {
    this.logger.info('Updating PaymentProvider by code', { code, data });

    if (!code) {
      throw new BadRequestError('Payment provider code is required');
    }

    try {
      const updateData: DeepPartial<PaymentProvider> = { ...data };

      const updatedProvider =
        await paymentProviderRepository.updatePaymentProviderByCode(
          code,
          updateData
        );

      if (updatedProvider) {
        await this.providerCache.setToCache(
          CACHE_KEYS.SINGLE_PROVIDER,
          code,
          updatedProvider
        );

        await this.providersListCache.deleteKey(
          CACHE_KEYS.SINGLE_PROVIDER,
          CACHE_KEYS.ALL_PROVIDERS
        );
      } else {
        throw new NotFoundError('PaymentProvider not found');
      }

      return updatedProvider;
    } catch (error) {
      this.logger.error('Error updating PaymentProvider', {
        code,
        data,
        error,
      });
      throw new Error('Unable to update payment provider');
    }
  }

  /**
   * Deletes a PaymentProvider by its code and invalidates caches.
   * @param code - The unique code of the PaymentProvider.
   * @returns A void promise, meaning it doesn't return any value.
   * @throws BadRequestError if the payment provider code is missing.
   * @throws NotFoundError if the payment provider is not found.
   */
  async deletePaymentProviderByCode(code: string): Promise<void> {
    this.logger.info('Deleting PaymentProvider by code', { code });

    if (!code) {
      throw new BadRequestError('Payment provider code is required');
    }

    try {
      await paymentProviderRepository.deletePaymentProviderByCode(code);

      const deletedFromSingleCache = await this.providerCache.deleteKey(
        CACHE_KEYS.SINGLE_PROVIDER,
        code
      );
      const deletedFromListCache = await this.providersListCache.deleteKey(
        CACHE_KEYS.SINGLE_PROVIDER,
        CACHE_KEYS.ALL_PROVIDERS
      );

      if (!deletedFromSingleCache) {
        this.logger.warn(
          `Failed to delete cache key for single provider: ${code}`
        );
      }

      if (!deletedFromListCache) {
        this.logger.warn('Failed to delete cache key for all providers');
      }
    } catch (error) {
      this.logger.error('Error deleting PaymentProvider', { code, error });

      if (error instanceof NotFoundError) {
        throw error;
      }

      throw new Error('Unable to delete payment provider');
    }
  }

  /**
   * Retrieves all PaymentProviders with caching.
   * @returns An array of PaymentProvider entities.
   * @throws Error if unable to fetch all payment providers.
   */
  async getAllPaymentProviders(): Promise<PaymentProvider[]> {
    this.logger.info('Fetching all PaymentProviders');

    try {
      const cachedProviders = await this.providersListCache.getFromCache(
        CACHE_KEYS.SINGLE_PROVIDER,
        CACHE_KEYS.ALL_PROVIDERS
      );

      let providers: PaymentProvider[] | null = Array.isArray(cachedProviders)
        ? cachedProviders
        : null;

      if (!providers) {
        providers = await paymentProviderRepository.getAllPaymentProviders();
        providers = providers ?? []; // Ensure providers is always an array

        await this.providersListCache.setToCache(
          CACHE_KEYS.SINGLE_PROVIDER,
          CACHE_KEYS.ALL_PROVIDERS,
          providers
        );
      }

      return providers;
    } catch (error) {
      this.logger.error('Error fetching all PaymentProviders', { error });
      throw new Error('Unable to fetch payment providers');
    }
  }
}

export default new PaymentProviderService();
