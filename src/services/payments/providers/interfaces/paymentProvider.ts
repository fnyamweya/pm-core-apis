export type PaymentInitiateRequest = {
  amount: number;
  currency: string;
  payerPhone: string;
  description?: string;
  metadata?: Record<string, any>;
};

export type PaymentInitiateResponse = {
  provider: string;
  status: 'PENDING' | 'REDIRECT' | 'COMPLETED' | 'FAILED';
  checkoutId?: string;
  reference?: string;
  redirectUrl?: string;
  message?: string;
};

export interface PaymentWebhookEvent {
  provider: string;
  payload: any;
}

export interface PaymentProvider {
  code: string;
  initiatePayment(req: PaymentInitiateRequest, orgId: string): Promise<PaymentInitiateResponse>;
  parseWebhook(event: PaymentWebhookEvent): {
    ok: boolean;
    providerTransactionId?: string;
    amount?: number;
    status?: 'COMPLETED' | 'FAILED' | 'PENDING';
    metadata?: Record<string, any>;
    message?: string;
  };
}

