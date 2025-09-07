import { DeepPartial } from 'typeorm';
import {
  TransactionStatus,
  TransactionType,
} from '../../constants/transactions';
import { Transaction } from '../../entities/transactions/transactionEntity';
import BaseRepository from '../baseRepository';

class TransactionRepository extends BaseRepository<Transaction> {
  constructor() {
    super(Transaction);
  }

  /**
   * Creates a new Transaction.
   * @param transactionData - Data for the new Transaction.
   * @returns The created Transaction entity.
   */
  async createTransaction(
    transactionData: DeepPartial<Transaction>
  ): Promise<Transaction> {
    return this.create(transactionData);
  }

  /**
   * Ensures a Transaction exists by its ID.
   * @param id - The ID of the Transaction.
   * @returns The Transaction entity.
   * @throws Error if the Transaction does not exist.
   */
  async ensureTransactionExistsById(id: string): Promise<Transaction> {
    const transaction = await this.findById(id);
    if (!transaction) {
      throw new Error(`Transaction not found with ID: ${id}`);
    }
    return transaction;
  }

  /**
   * Updates a Transaction by its ID.
   * @param id - The ID of the Transaction to update.
   * @param updateData - Partial data to update the Transaction with.
   * @returns The updated Transaction entity.
   */
  async updateTransaction(
    id: string,
    updateData: DeepPartial<Transaction>
  ): Promise<Transaction> {
    const transaction = await this.ensureTransactionExistsById(id);
    await this.update(id, updateData);
    return transaction; // Return the ensured transaction
  }

  /**
   * Finds a Transaction by its provider transaction ID.
   * @param providerTransactionId - The provider transaction ID.
   * @returns The Transaction entity or null if not found.
   */
  async getTransactionByProviderId(
    providerTransactionId: string
  ): Promise<Transaction | null> {
    return this.findOne({ where: { providerTransactionId } });
  }

  /**
   * Finds all Transactions by a specific status.
   * @param status - The status of the transactions (e.g., PENDING, COMPLETED).
   * @returns Array of Transaction entities with the specified status.
   */
  async getTransactionsByStatus(
    status: TransactionStatus
  ): Promise<Transaction[]> {
    return this.find({ where: { status } });
  }

  /**
   * Finds all Transactions of a specific type.
   * @param type - The type of transactions (e.g., PAYMENT, REFUND).
   * @returns Array of Transaction entities with the specified type.
   */
  async getTransactionsByType(type: TransactionType): Promise<Transaction[]> {
    return this.find({ where: { type } });
  }

  /**
   * Soft deletes a Transaction by its ID.
   * @param id - The ID of the Transaction to soft delete.
   */
  async softDeleteTransaction(id: string): Promise<void> {
    await this.ensureTransactionExistsById(id);
    await this.softDelete(id);
  }

  /**
   * Restores a soft-deleted Transaction by its ID.
   * @param id - The ID of the Transaction to restore.
   */
  async restoreTransaction(id: string): Promise<void> {
    await this.ensureTransactionExistsById(id);
    await this.repository.restore(id);
  }

  /**
   * Updates the status of a Transaction by its ID.
   * @param id - The ID of the Transaction.
   * @param status - The new status for the Transaction.
   */
  async updateTransactionStatus(
    id: string,
    status: TransactionStatus
  ): Promise<void> {
    await this.ensureTransactionExistsById(id);
    await this.update(id, { status });
  }

  /**
   * Retrieves metadata for a specific Transaction by ID.
   * @param id - The ID of the Transaction.
   * @returns The metadata object associated with the Transaction.
   */
  async getTransactionMetadata(
    id: string
  ): Promise<Record<string, any> | null> {
    const transaction = await this.findById(id);
    return transaction?.metadata ?? null;
  }

  /**
   * Updates metadata for a specific Transaction by ID.
   * @param id - The ID of the Transaction.
   * @param metadata - The metadata to update or replace.
   */
  async updateTransactionMetadata(
    id: string,
    metadata: Record<string, any>
  ): Promise<void> {
    await this.ensureTransactionExistsById(id);
    await this.update(id, { metadata });
  }
}

const transactionRepository = new TransactionRepository();
export { transactionRepository as default, TransactionRepository };
