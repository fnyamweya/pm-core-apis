import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import ALLOWED_KINDS from '../../constants/allowedKinds';
import smsService from '../../services/sms/smsService';
import { logger } from '../../utils/logger';

const RESPONSE_MESSAGES = {
  SUCCESS: {
    SEND_SMS: 'SMS sent successfully',
  },
  ERROR: {
    SMS_SEND_FAILED: {
      message: 'Failed to send SMS',
      code: 'SMS_SEND_FAILED',
      statusCode: httpStatus.INTERNAL_SERVER_ERROR,
    },
  },
};

class SmsController {
  public async sendSms(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    logger.info('Attempting to send an SMS', { body: req.body });
    const { phoneNumber, message, action = 'generic', options } = req.body;

    try {
      const deliveryReport = await smsService.sendSms(
        phoneNumber,
        message,
        action,
        options
      );

      res.status(httpStatus.OK).json({
        kind: ALLOWED_KINDS.SMS.BASE,
        message: RESPONSE_MESSAGES.SUCCESS.SEND_SMS,
        deliveryReport,
      });
    } catch (error) {
      logger.error(RESPONSE_MESSAGES.ERROR.SMS_SEND_FAILED.message, { error });
      res.status(RESPONSE_MESSAGES.ERROR.SMS_SEND_FAILED.statusCode).json({
        error: {
          code: RESPONSE_MESSAGES.ERROR.SMS_SEND_FAILED.code,
          message: RESPONSE_MESSAGES.ERROR.SMS_SEND_FAILED.message,
        },
      });
    }
  }
}

export default new SmsController();
