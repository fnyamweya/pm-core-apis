import { UserCredentialsEntity } from '../../entities/users/userCredentialsEntity';
import BaseRepository from '../baseRepository';

class UserCredentialRepository extends BaseRepository<UserCredentialsEntity> {
  constructor() {
    super(UserCredentialsEntity);
  }

  /**
   * Retrieves user credentials by user ID.
   * @param userId - The user ID to search for.
   * @returns The user credentials entity or null if not found.
   */
  async getUserCredentialsByUserId(
    userId: string
  ): Promise<UserCredentialsEntity | null> {
    try {
      return await this.findOne({ where: { userId } });
    } catch (error) {
      this.handleError(
        error,
        `Error finding user credentials by userId: ${userId}`
      );
    }
  }

  /**
   * Updates user credentials by user ID.
   * @param userId - The user ID associated with the credentials.
   * @param updateData - Partial data to update the user credentials.
   */
  async updateUserCredentials(
    userId: string,
    updateData: Partial<UserCredentialsEntity>
  ): Promise<void> {
    try {
      await this.repository.update({ userId } as any, updateData);
    } catch (error) {
      this.handleError(
        error,
        `Error updating user credentials for userId: ${userId}`
      );
    }
  }

  /**
   * Deletes user credentials by user ID.
   * @param userId - The user ID associated with the credentials.
   */
  async deleteByUserId(userId: string): Promise<void> {
    try {
      await this.repository.delete({ userId } as any);
    } catch (error) {
      this.handleError(
        error,
        `Error deleting user credentials for userId: ${userId}`
      );
    }
  }
}

const userCredentialRepository = new UserCredentialRepository();
export { userCredentialRepository as default, UserCredentialRepository };