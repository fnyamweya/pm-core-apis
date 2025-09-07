import AfricasTalking from 'africastalking';
import httpStatus from 'http-status-codes';
import { EnvConfiguration } from '../config/env';
import { ApiError } from '../errors/apiError';
import { logger } from '../utils/logger';

// Strong typing for Africa's Talking SDK
type AfricasTalkingSDK = {
  SMS: {
    send: (options: ISmsOptions) => Promise<ISmsResponse>;
    fetchMessages: (options: IFetchMessagesOptions) => Promise<IMessage[]>;
    fetchSubscriptions: (
      options: IFetchSubscriptionsOptions
    ) => Promise<ISubscription[]>;
    createSubscription: (
      options: ICreateSubscriptionOptions
    ) => Promise<ISubscriptionResponse>;
  };
};

// Interfaces for request options
interface ISmsOptions {
  to: string[];
  message: string;
  from?: string;
  enqueue?: boolean;
  bulkSMSMode?: 0 | 1;
  keyword?: string;
  linkId?: string;
  retryDurationInHours?: number;
}

interface IFetchMessagesOptions {
  lastReceivedId: number;
}

interface IFetchSubscriptionsOptions {
  shortCode: string;
  keyword: string;
  lastReceivedId: number;
}

interface ICreateSubscriptionOptions {
  shortCode: string;
  keyword: string;
  phoneNumber: string;
}

// Interfaces for response types
interface ISmsResponse {
  SMSMessageData: {
    Message: string;
    Recipients: Array<{
      number: string;
      cost: string;
      status: string;
      messageId: string;
    }>;
  };
}

interface IMessage {
  id: string;
  text: string;
  from: string;
  to: string;
  linkId: string;
  date: string;
}

interface ISubscription {
  id: number;
  phoneNumber: string;
  date: string;
}

interface ISubscriptionResponse {
  status: string;
  description: string;
}

class SMSManager {
  private static instance: SMSManager | null = null;
  private readonly smsService: AfricasTalkingSDK['SMS'];
  private static readonly REQUIRED_CONFIG = [
    'AT_API_KEY',
    'AT_USERNAME',
  ] as const;

  private constructor(apiKey: string, username: string) {
    const africasTalking = AfricasTalking({
      apiKey,
      username,
    }) as unknown as AfricasTalkingSDK;
    this.smsService = africasTalking.SMS;
  }

  public static async getInstance(): Promise<SMSManager> {
    if (!SMSManager.instance) {
      SMSManager.validateConfig();
      SMSManager.instance = new SMSManager(
        EnvConfiguration.AT_API_KEY!,
        EnvConfiguration.AT_USERNAME!
      );
    }
    return SMSManager.instance;
  }

  private static validateConfig(): void {
    const missingConfigs = this.REQUIRED_CONFIG.filter(
      (key) => !EnvConfiguration[key]
    );

    if (missingConfigs.length > 0) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        `Missing required configurations: ${missingConfigs.join(', ')}`
      );
    }
  }

  private handleError(error: unknown, operation: string): never {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to ${operation}: ${errorMessage}`, {
      error,
      operation,
      timestamp: new Date().toISOString(),
    });

    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Failed to ${operation}. Please try again later.`
    );
  }

  public async send(options: ISmsOptions): Promise<ISmsResponse> {
    try {
      this.validatePhoneNumbers(options.to);

      logger.info('Sending SMS', {
        recipients: options.to,
        messageLength: options.message.length,
        timestamp: new Date().toISOString(),
      });

      const response = await this.smsService.send(options);

      logger.info('SMS sent successfully', {
        response,
        timestamp: new Date().toISOString(),
      });

      return response;
    } catch (error) {
      return this.handleError(error, 'send SMS');
    }
  }

  public async fetchMessages(
    options: IFetchMessagesOptions
  ): Promise<IMessage[]> {
    try {
      const messages = await this.smsService.fetchMessages(options);

      logger.info('Messages fetched successfully', {
        count: messages.length,
        lastReceivedId: options.lastReceivedId,
        timestamp: new Date().toISOString(),
      });

      return messages;
    } catch (error) {
      return this.handleError(error, 'fetch messages');
    }
  }

  public async fetchSubscriptions(
    options: IFetchSubscriptionsOptions
  ): Promise<ISubscription[]> {
    try {
      const subscriptions = await this.smsService.fetchSubscriptions(options);

      logger.info('Subscriptions fetched successfully', {
        count: subscriptions.length,
        shortCode: options.shortCode,
        keyword: options.keyword,
        timestamp: new Date().toISOString(),
      });

      return subscriptions;
    } catch (error) {
      return this.handleError(error, 'fetch subscriptions');
    }
  }

  public async createSubscription(
    options: ICreateSubscriptionOptions
  ): Promise<ISubscriptionResponse> {
    try {
      this.validatePhoneNumbers([options.phoneNumber]);

      const response = await this.smsService.createSubscription(options);

      logger.info('Subscription created successfully', {
        phoneNumber: options.phoneNumber,
        shortCode: options.shortCode,
        keyword: options.keyword,
        timestamp: new Date().toISOString(),
      });

      return response;
    } catch (error) {
      return this.handleError(error, 'create subscription');
    }
  }

  private validatePhoneNumbers(phoneNumbers: string[]): void {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/; // E.164 format
    const invalidNumbers = phoneNumbers.filter((num) => !phoneRegex.test(num));

    if (invalidNumbers.length > 0) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Invalid phone numbers: ${invalidNumbers.join(', ')}`
      );
    }
  }
}

// Factory function
export const getSMSManagerInstance = async (): Promise<SMSManager> => {
  return SMSManager.getInstance();
};
