import { AccessPolicy } from '../../entities/accessControl/accessPolicyEntity';
import { logger } from '../../utils/logger';
import BaseRepository from '../baseRepository';

class AccessPolicyRepository extends BaseRepository<AccessPolicy> {
  constructor() {
    super(AccessPolicy);
  }

  /**
   * Finds a policy by its resource and action.
   * @param resource - The resource of the policy.
   * @param action - The action of the policy.
   * @returns The policy entity or null if not found.
   */
  async getPolicyByResourceAndAction(
    resource: string,
    action: string
  ): Promise<AccessPolicy | null> {
    try {
      const policy = await this.findOne({ where: { resource, action } });
      if (!policy) {
        logger.info(
          `Policy for resource ${resource} and action ${action} not found.`
        );
      }
      return policy;
    } catch (error) {
      this.handleError(
        error,
        `Error finding policy by resource and action: ${resource}, ${action}`
      );
    }
  }

  /**
   * Finds policies by effect.
   * @param effect - The effect of the policies.
   * @returns Array of policy entities matching the effect.
   */
  async getPoliciesByEffect(
    effect: 'ALLOW' | 'DENY' | 'LOG' | 'NOTIFY' | 'AUDIT'
  ): Promise<AccessPolicy[]> {
    try {
      return await this.find({ where: { effect } });
    } catch (error) {
      this.handleError(error, `Error finding policies by effect: ${effect}`);
    }
  }

  /**
   * Updates a policy by its resource and action.
   * @param resource - The resource of the policy to update.
   * @param action - The action of the policy to update.
   * @param updateData - Partial data to update the policy.
   */
  async updatePolicyByResourceAndAction(
    resource: string,
    action: string,
    updateData: Partial<AccessPolicy>
  ): Promise<void> {
    try {
      await this.repository.update({ resource, action } as any, updateData);
    } catch (error) {
      this.handleError(
        error,
        `Error updating policy for resource ${resource} and action ${action}`
      );
    }
  }

  /**
   * Deletes a policy by its resource and action.
   * @param resource - The resource of the policy to delete.
   * @param action - The action of the policy to delete.
   */
  async deletePolicyByResourceAndAction(
    resource: string,
    action: string
  ): Promise<void> {
    try {
      await this.repository.delete({ resource, action } as any);
    } catch (error) {
      this.handleError(
        error,
        `Error deleting policy for resource ${resource} and action ${action}`
      );
    }
  }

  /**
   * Soft deletes a policy by its resource and action if soft delete is supported.
   * @param resource - The resource of the policy to soft delete.
   * @param action - The action of the policy to soft delete.
   */
  async softDeletePolicyByResourceAndAction(
    resource: string,
    action: string
  ): Promise<void> {
    try {
      await this.repository.softDelete({ resource, action } as any);
    } catch (error) {
      this.handleError(
        error,
        `Error soft deleting policy for resource ${resource} and action ${action}`
      );
    }
  }

  /**
   * Restores a soft-deleted policy by its resource and action if soft delete is supported.
   * @param resource - The resource of the policy to restore.
   * @param action - The action of the policy to restore.
   */
  async restorePolicyByResourceAndAction(
    resource: string,
    action: string
  ): Promise<void> {
    try {
      await this.repository.restore({ resource, action } as any);
    } catch (error) {
      this.handleError(
        error,
        `Error restoring policy for resource ${resource} and action ${action}`
      );
    }
  }
}

// Export an instance of `AccessPolicyRepository`
const accessPolicyRepository = new AccessPolicyRepository();
export { AccessPolicyRepository, accessPolicyRepository as default };
