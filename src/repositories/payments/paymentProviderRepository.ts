import { DeepPartial } from 'typeorm';
import { PaymentProvider } from '../../entities/payments/paymentProviderEntity';
import BaseRepository from '../baseRepository';

class PaymentProviderRepository extends BaseRepository<PaymentProvider> {
  constructor() {
    super(PaymentProvider);
  }

  /**
   * Ensures a PaymentProvider exists by its code or throws an error.
   * @param code - The unique code of the PaymentProvider.
   * @returns The PaymentProvider entity.
   */
  private async ensurePaymentProviderExistsByCode(
    code: string
  ): Promise<PaymentProvider> {
    const provider = await this.getPaymentProviderByCode(code);
    if (!provider) {
      throw new Error(`PaymentProvider not found for code: ${code}`);
    }
    return provider;
  }

  /**
   * Creates a new PaymentProvider.
   * @param providerData - Data for the new PaymentProvider.
   * @returns The created PaymentProvider entity.
   */
  async createPaymentProvider(
    providerData: DeepPartial<PaymentProvider>
  ): Promise<PaymentProvider> {
    return await this.create(providerData);
  }

  /**
   * Updates a PaymentProvider by its code.
   * @param code - The unique code of the PaymentProvider.
   * @param updateData - Partial data to update the PaymentProvider with.
   * @returns The updated PaymentProvider entity.
   */
  async updatePaymentProviderByCode(
    code: string,
    updateData: DeepPartial<PaymentProvider>
  ): Promise<PaymentProvider> {
    const provider = await this.ensurePaymentProviderExistsByCode(code);
    await this.update(provider.id, updateData);
    const updatedProvider = await this.findById(provider.id);

    if (!updatedProvider) {
      throw new Error(
        `Failed to retrieve updated PaymentProvider with ID: ${provider.id}`
      );
    }

    return updatedProvider;
  }

  /**
   * Finds a PaymentProvider by its code.
   * @param code - The unique code of the PaymentProvider.
   * @returns The PaymentProvider entity or null if not found.
   */
  async getPaymentProviderByCode(
    code: string
  ): Promise<PaymentProvider | null> {
    return await this.findOne({ where: { paymentProviderCode: code } });
  }

  /**
   * Retrieves all PaymentProviders.
   * @returns Array of PaymentProvider entities.
   */
  async getAllPaymentProviders(): Promise<PaymentProvider[]> {
    return await this.find();
  }

  /**
   * Deletes a PaymentProvider by its code.
   * @param code - The unique code of the PaymentProvider to delete.
   */
  async deletePaymentProviderByCode(code: string): Promise<void> {
    const provider = await this.ensurePaymentProviderExistsByCode(code);
    await this.delete(provider.id);
  }
}

const paymentProviderRepository = new PaymentProviderRepository();
export { paymentProviderRepository as default, PaymentProviderRepository };
