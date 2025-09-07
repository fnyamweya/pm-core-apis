import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { logger } from './logger'; // Assuming you have a logger utility

// Ensure AWS_REGION is set in your environment, or default as needed
const region = process.env.AWS_REGION || 'eu-central-1';

const secretsManager = new SecretsManagerClient({ region });

/**
 * Fetch secrets from AWS Secrets Manager using AWS SDK v3.
 * @param secretName Name of the secret in AWS Secrets Manager.
 * @returns A Promise resolving to the secret as a key-value object.
 */
export const getSecrets = async (secretName: string): Promise<Record<string, string>> => {
  try {
    logger.info(`Fetching secret: ${secretName}`);

    const command = new GetSecretValueCommand({ SecretId: secretName });
    const data = await secretsManager.send(command);

    if (data.SecretString) {
      logger.info(`Secret fetched successfully: ${secretName}`);
      return JSON.parse(data.SecretString);
    } else {
      logger.error(`SecretString is empty or undefined for: ${secretName}`);
      throw new Error(`SecretString is empty for secret: ${secretName}`);
    }
  } catch (error) {
    logger.error(`Error fetching secret: ${secretName}`);
    logger.error('Full Error Details:', error);
    throw error; // Re-throw the error for handling at a higher level
  }
};
