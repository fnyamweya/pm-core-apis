// auditActions.ts
export const AuditActions = {
  General: {
    CREATE: 'create',
    READ: 'read',
    UPDATE: 'update',
    DELETE: 'delete',
  },
  Sms: {
    SEND: 'sms_send',
    RECEIVE: 'sms_receive',
  },
  User: {
    LOGIN: 'user_login',
    LOGOUT: 'user_logout',
    PASSWORD_RESET: 'password_reset',
  },
  Payment: {
    INITIATE: 'payment_initiate',
    COMPLETE: 'payment_complete',
    REFUND: 'payment_refund',
  },
} as const;

// Extract literal types from the AuditActions object
type GeneralActions =
  (typeof AuditActions.General)[keyof typeof AuditActions.General];
type SmsActions = (typeof AuditActions.Sms)[keyof typeof AuditActions.Sms];
type UserActions = (typeof AuditActions.User)[keyof typeof AuditActions.User];
type PaymentActions =
  (typeof AuditActions.Payment)[keyof typeof AuditActions.Payment];

// Combined union type for all possible audit actions
export type AuditAction =
  | GeneralActions
  | SmsActions
  | UserActions
  | PaymentActions;
