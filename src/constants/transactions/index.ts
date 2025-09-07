export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELED = 'canceled',
}

export enum TransactionType {
  PAYMENT = 'payment',
  REFUND = 'refund',
  TRANSFER = 'transfer',
  WITHDRAWAL = 'withdrawal',
  DEPOSIT = 'deposit',
}
