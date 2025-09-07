// Standard fraud alert message
export const FRAUD_ALERT =
  'Do not share this code with anyone. Beware of fraud.';

// Template for phone verification SMS
export const PHONE_VERIFICATION_TEMPLATE = (
  code: string,
  validity: number
): string =>
  `Your verification code is ${code}. Valid for ${validity} minutes. ${FRAUD_ALERT}`;

// Template for password reset SMS
export const PASSWORD_RESET_TEMPLATE = (
  code: string,
  validity: number
): string =>
  `Your password reset code is ${code}. It will expire in ${validity} minutes. ${FRAUD_ALERT}`;
