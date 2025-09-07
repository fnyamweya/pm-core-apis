import { AuditLogger } from '../../utils/auditLogger';
import { logger } from '../../utils/logger';
import AfricasTalkingProvider from './providers/africastalking';
import { SmsProvider, SmsResponse } from './providers/interfaces/smsProvider';

class SmsService {
  constructor(private provider: SmsProvider) {}

  public async sendSms(
    phoneNumber: string,
    message: string,
    action: string,
    options?: {
      senderId?: string;
      trackDelivery?: boolean;
      priority?: 'high' | 'normal' | 'low';
    }
  ): Promise<SmsResponse> {
    const correlationId = `sms-${Date.now()}`;

    try {
      // Send the SMS
      const response = await this.provider.sendMessage(
        phoneNumber,
        message,
        options
      );
      logger.info(`Sent ${action} SMS to ${phoneNumber}`, { correlationId });

      // Audit log for successful SMS send
      await this.logAudit({
        phoneNumber,
        message,
        action,
        correlationId,
        status: 'success',
        severity: 'medium',
        responseId: response.messageId,
        success: true,
      });

      return response;
    } catch (error) {
      logger.error(`Failed to send ${action} SMS to ${phoneNumber}`, {
        error,
        correlationId,
      });

      // Audit log for failed SMS send
      await this.logAudit({
        phoneNumber,
        message,
        action,
        correlationId,
        status: 'failure',
        severity: 'high',
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      });

      throw error;
    }
  }

  private async logAudit({
    phoneNumber,
    message,
    action,
    correlationId,
    status,
    severity,
    responseId,
    error,
    success,
  }: {
    phoneNumber: string;
    message: string;
    action: string;
    correlationId: string;
    status: 'success' | 'failure';
    severity: 'low' | 'medium' | 'high' | 'critical';
    responseId?: string;
    error?: string;
    success: boolean;
  }) {
    await AuditLogger.logCRUD({
      userId: 'system',
      action: 'CREATE',
      status,
      severity,
      targetId: phoneNumber,
      details: {
        type: 'SMS',
        action,
        phoneNumber,
        messageLength: message.length,
        provider: this.provider.constructor.name,
        priority: 'normal',
        success,
        responseId,
        error,
      },
      correlationId,
    });
  }
}

const smsService = new SmsService(new AfricasTalkingProvider());
export default smsService;
