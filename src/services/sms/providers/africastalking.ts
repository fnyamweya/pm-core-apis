import AfricasTalking from 'africastalking';
import { logger } from '../../../utils/logger';
import {
  SmsOptions,
  SmsProvider,
  SmsProviderError,
  SmsResponse,
} from './interfaces/smsProvider';

const africasTalkingConfig = {
  apiKey: process.env.AT_API_KEY || '',
  username: process.env.AT_USERNAME || 'sandbox',
};

class AfricasTalkingProvider implements SmsProvider {
  private africasTalkingClient: any;

  constructor() {
    this.africasTalkingClient = AfricasTalking(africasTalkingConfig);
  }

  async sendMessage(
    to: string,
    message: string,
    options?: SmsOptions
  ): Promise<SmsResponse> {
    if (options?.maskedNumber && options?.telco) {
      return this.sendToHashedNumber(message, options);
    }

    const from = options?.senderId || process.env.AT_SHORT_CODE || undefined;

    try {
      const response = await this.africasTalkingClient.SMS.send({
        to,
        message,
        from,
      });

      const recipient = response.SMSMessageData.Recipients[0];
      const status = recipient.statusCode === 101 ? 'sent' : 'failed';

      if (recipient.statusCode !== 101) {
        let errorMessage = `Failed to send SMS: ${recipient.status}`;
        if (recipient.statusCode === 406) {
          errorMessage = `The recipient ${recipient.number} is in a blacklist and cannot receive SMS messages.`;
        }

        logger.warn('SMS send failure', {
          number: recipient.number,
          status: recipient.status,
          statusCode: recipient.statusCode,
        });

        throw new SmsProviderError(errorMessage, 'SMS_SEND_FAILURE', {
          statusCode: recipient.statusCode,
          status: recipient.status,
          number: recipient.number,
        });
      }

      logger.info('SMS sent successfully', {
        to,
        message,
        recipient: {
          number: recipient.number,
          cost: recipient.cost,
          status: recipient.status,
        },
      });

      return {
        messageId: recipient.messageId || '',
        status,
        deliveryReport: {
          statusCode: recipient.statusCode,
          number: recipient.number,
          cost: recipient.cost,
          status: recipient.status,
        },
      };
    } catch (error) {
      if (error instanceof SmsProviderError) {
        // Handle SmsProviderError
        logger.error('SmsProviderError occurred while sending SMS', {
          message: error.message,
          context: error.context,
        });
      } else if (error instanceof Error) {
        // Handle general Error
        logger.error("Error sending SMS with Africa's Talking", {
          message: error.message,
          stack: error.stack,
        });
      } else {
        // Handle unknown error
        logger.error('Unknown error occurred while sending SMS', {
          error,
        });
      }

      throw new SmsProviderError('Failed to send SMS', 'SMS_SEND_FAILURE', {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async sendToHashedNumber(
    message: string,
    options: SmsOptions
  ): Promise<SmsResponse> {
    try {
      const response = await this.africasTalkingClient.SMS.send({
        username: africasTalkingConfig.username,
        message,
        maskedNumber: options.maskedNumber,
        telco: options.telco,
        phoneNumbers: [],
        from: options.senderId || process.env.AT_SHORT_CODE || undefined,
      });

      const recipient = response.SMSMessageData.Recipients[0];
      const status = recipient.statusCode === 101 ? 'sent' : 'failed';

      if (recipient.statusCode !== 101) {
        logger.warn('SMS send failure for hashed number', {
          maskedNumber: options.maskedNumber,
          status: recipient.status,
          statusCode: recipient.statusCode,
        });

        throw new SmsProviderError(
          `Failed to send SMS: ${recipient.status}`,
          'SMS_SEND_FAILURE',
          {
            statusCode: recipient.statusCode,
            status: recipient.status,
            number: recipient.number,
          }
        );
      }

      logger.info('SMS sent successfully to hashed number', {
        maskedNumber: options.maskedNumber,
        message,
        recipient: {
          number: recipient.number,
          cost: recipient.cost,
          status: recipient.status,
        },
      });

      return {
        messageId: recipient.messageId || '',
        status,
        deliveryReport: {
          statusCode: recipient.statusCode,
          number: recipient.number,
          cost: recipient.cost,
          status: recipient.status,
        },
      };
    } catch (error) {
      if (error instanceof SmsProviderError) {
        logger.error(
          'SmsProviderError occurred while sending SMS to hashed number',
          {
            message: error.message,
            context: error.context,
          }
        );
      } else if (error instanceof Error) {
        logger.error(
          "Error sending SMS to hashed number with Africa's Talking",
          {
            message: error.message,
            stack: error.stack,
          }
        );
      } else {
        logger.error(
          'Unknown error occurred while sending SMS to hashed number',
          {
            error,
          }
        );
      }

      throw new SmsProviderError(
        'Failed to send SMS to hashed number',
        'SMS_SEND_FAILURE',
        {
          originalError: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }
}

export default AfricasTalkingProvider;
