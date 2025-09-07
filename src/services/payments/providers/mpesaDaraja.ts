import { PaymentInitiateRequest, PaymentInitiateResponse, PaymentProvider, PaymentWebhookEvent } from './interfaces/paymentProvider';
import { logger } from '../../../utils/logger';
import paymentProviderConfigRepository from '../../../repositories/payments/paymentProviderConfigRepository';
import crypto from 'crypto';

/**
 * Minimal Daraja provider scaffolding. Real HTTP calls omitted; wire your HTTP client and secrets via config.
 * Config keys per org (PaymentProviderConfig):
 * - consumerKey, consumerSecret, passkey, shortcode, tillNumber, paybillNumber, accountTemplate, callbackUrl, environment
 */
export class MpesaDarajaProvider implements PaymentProvider {
  code = 'MPESA';

  async initiatePayment(req: PaymentInitiateRequest, orgId: string): Promise<PaymentInitiateResponse> {
    const cfg = await this.loadConfig(orgId);
    const baseUrl = cfg.environment === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';
    const token = await this.getOAuthToken(baseUrl, cfg.consumerKey, cfg.consumerSecret);
    const timestamp = this.getTimestamp();
    const password = Buffer.from(`${cfg.shortcode}${cfg.passkey}${timestamp}`).toString('base64');

    const body: any = {
      BusinessShortCode: cfg.shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: cfg.paybillNumber ? 'CustomerPayBillOnline' : 'CustomerBuyGoodsOnline',
      Amount: req.amount,
      PartyA: req.payerPhone,
      PartyB: cfg.paybillNumber || cfg.tillNumber || cfg.shortcode,
      PhoneNumber: req.payerPhone,
      CallBackURL: cfg.callbackUrl,
      AccountReference: (req.metadata?.accountRef || this.renderAccountRef(cfg.accountTemplate, req.metadata) || 'LEASE'),
      TransactionDesc: req.description || 'Lease Payment',
    };

    const resp = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const text = await resp.text();
      logger.error('M-Pesa STK push failed', { status: resp.status, text });
      return { provider: this.code, status: 'FAILED', message: 'STK push failed' };
    }
    const data = await resp.json() as Record<string, any>;
    const checkoutId = data.CheckoutRequestID || data.MerchantRequestID || `MPESA-${Date.now()}`;
    return { provider: this.code, status: 'PENDING', checkoutId, reference: checkoutId, message: data.ResponseDescription || 'STK push initiated' };
  }

  /** Optional lightweight verification using a shared token per org (x-webhook-token). */
  async verifyWebhook(orgId: string, headers: Record<string, any>, rawBody?: string): Promise<boolean> {
    const cfg = await this.loadConfig(orgId);
    // HMAC verification if secret configured
    if (cfg.webhookSecret && rawBody) {
      const provided = (headers['x-signature'] || headers['X-Signature']) as string | undefined;
      if (!provided) return false;
      const h = crypto.createHmac('sha256', String(cfg.webhookSecret)).update(rawBody).digest('hex');
      if (provided !== h) return false;
      return true;
    }
    // fallback shared token header
    const token = (headers['x-webhook-token'] || headers['X-Webhook-Token'] || headers['x-webhook-token']) as string | undefined;
    if (!cfg.webhookToken) return true; // rely on infra if no token configured
    return token === cfg.webhookToken;
  }

  /** Parse C2B Validation payload */
  parseC2BValidation(payload: any): { accept: boolean; reason?: string } {
    const amount = Number(payload?.TransAmount || payload?.amount || 0);
    const msisdn = payload?.MSISDN || payload?.msisdn;
    if (!amount || amount <= 0) return { accept: false, reason: 'Invalid amount' };
    if (!msisdn) return { accept: false, reason: 'Missing MSISDN' };
    return { accept: true };
  }

  /** Parse C2B Confirmation payload */
  parseC2BConfirmation(payload: any) {
    const providerTransactionId = payload?.TransID;
    const amount = Number(payload?.TransAmount || 0);
    const account = payload?.BillRefNumber || payload?.AccountReference;
    const msisdn = payload?.MSISDN;
    return { providerTransactionId, amount, account, msisdn, metadata: payload };
  }

  parseWebhook(event: PaymentWebhookEvent): {
    ok: boolean;
    providerTransactionId?: string;
    amount?: number;
    status?: "PENDING" | "COMPLETED" | "FAILED";
    metadata?: Record<string, any>;
    message?: string;
  } {
    const payload = event.payload || {};
    const stk = payload?.Body?.stkCallback;
    const items = stk?.CallbackMetadata?.Item || [];
    const amountItem = Array.isArray(items) ? items.find((i: any) => i.Name === 'Amount') : undefined;
    const providerTransactionId: string | undefined = stk?.CheckoutRequestID || payload?.TransID;
    const resultCode = stk?.ResultCode ?? payload?.ResultCode;
    const amount: number | undefined = amountItem?.Value ?? payload?.TransAmount;
    const ok = Number(resultCode) === 0 || payload?.ResultCode === 0;
    return {
      ok,
      providerTransactionId,
      amount,
      status: ok ? 'COMPLETED' : 'FAILED',
      metadata: payload,
      message: ok ? 'Payment completed' : 'Payment failed',
    };
  }

  private async loadConfig(orgId: string): Promise<Record<string, any>> {
    // Prefer org-specific configs; fallback to global
    const orgCfg = await paymentProviderConfigRepository.getConfigsByProviderAndOrg(this.code, orgId);
    const cfgs = orgCfg.length ? orgCfg : await paymentProviderConfigRepository.getConfigsByProviderAndOrg(this.code, undefined);
    const map: Record<string, any> = {};
    for (const c of cfgs) map[c.key] = c.value;
    return map;
  }

  private async getOAuthToken(baseUrl: string, consumerKey: string, consumerSecret: string): Promise<string> {
    const basic = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    const resp = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, { method: 'GET', headers: { 'Authorization': `Basic ${basic}` } });
    if (!resp.ok) {
      const text = await resp.text();
      logger.error('M-Pesa OAuth failed', { status: resp.status, text });
      throw new Error('M-Pesa OAuth failed');
    }
    const data = await resp.json() as { access_token: string };
    return data.access_token;
  }

  private getTimestamp(): string {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  }

  private renderAccountRef(template?: string, meta?: Record<string, any>): string | undefined {
    if (!template) return undefined;
    return template.replace(/\{(\w+)\}/g, (_, key) => (meta?.[key] ?? ''));
  }
}

export default new MpesaDarajaProvider();
