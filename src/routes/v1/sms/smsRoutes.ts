import { Router } from 'express';
import SmsController from '../../../controllers/sms/smsController';
import asyncHandler from '../../../middlewares/common/asyncHandler';

const router = Router();

/**
 * @route POST /sms/send
 * @description Send an SMS message
 * @access Public
 */
router.post('/send', asyncHandler(SmsController.sendSms.bind(SmsController)));

export default router;
