/**
 * Interface for an SMS provider.
 */
export interface SmsProvider {
  /**
   * Sends an SMS message.
   * @param to - The recipient's phone number in international format (e.g., "+1234567890").
   * @param message - The message content to send (typically limited to 160 characters).
   * @param options - Optional configuration such as sender ID, delivery tracking, or priority.
   * @returns A Promise that resolves with a response containing message ID or status details.
   * @throws {SmsProviderError} Throws an error if sending fails.
   */
  sendMessage(
    to: string,
    message: string,
    options?: SmsOptions
  ): Promise<SmsResponse>;
}

/**
 * Optional configuration for sending SMS, such as sender ID or message type.
 */
export interface SmsOptions {
  senderId?: string; // Custom sender ID or short code
  trackDelivery?: boolean; // Enable delivery tracking if supported by provider
  priority?: 'high' | 'normal' | 'low'; // Set message priority if provider supports it
  maskedNumber?: string; // For hashed numbers
  telco?: string; // Specifies the telco provider
}

/**
 * Represents the response from an SMS provider.
 */
export interface SmsResponse {
  messageId: string; // Unique identifier for the sent message
  status: 'sent' | 'queued' | 'failed'; // Status of the message
  error?: string; // Error message if sending failed
  deliveryReport?: {
    statusCode: number; // Status code of the SMS delivery
    number: string; // Recipient's phone number
    cost: string; // Cost incurred to send the SMS
    status: string; // Status description of the SMS (e.g., 'Success' or 'Failed')
  };
}

/**
 * Custom error type for SMS provider-related errors.
 */
export class SmsProviderError extends Error {
  public code: string;
  public details?: Record<string, any>;
  public context?: Record<string, any>; // Optional context for additional metadata

  constructor(
    message: string,
    code: string = 'SMS_PROVIDER_ERROR',
    details?: Record<string, any>,
    context?: Record<string, any> // Add the context parameter
  ) {
    super(message);
    this.name = 'SmsProviderError';
    this.code = code;
    this.details = details;
    this.context = context;

    // Ensure the prototype chain is properly set (necessary for extending built-ins in TypeScript)
    Object.setPrototypeOf(this, SmsProviderError.prototype);
  }
}
