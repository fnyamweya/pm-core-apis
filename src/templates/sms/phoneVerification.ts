import { FRAUD_ALERT } from '../../constants/sms';

/**
 * Generates a phone verification SMS message.
 * @param code - The verification code to send to the user.
 * @param validity - The number of minutes the code is valid for.
 * @param fraudAlert - Optional custom fraud alert message. Defaults to FRAUD_ALERT constant.
 * @returns A formatted verification SMS message.
 * @throws Error if the `code` or `validity` is missing or invalid.
 */
export const generateVerificationMessage = (
  code: string,
  validity: number,
  fraudAlert: string = FRAUD_ALERT
): string => {
  // Parameter validation
  if (!code || typeof code !== 'string') {
    throw new Error(
      'Invalid verification code. Code must be a non-empty string.'
    );
  }
  if (!validity || typeof validity !== 'number' || validity <= 0) {
    throw new Error(
      'Invalid validity period. Validity must be a positive number.'
    );
  }

  // Return the formatted message
  return `Your verification code is ${code}. Valid for ${validity} minutes. ${fraudAlert}`;
};
