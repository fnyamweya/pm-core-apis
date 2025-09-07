export enum KycProfileStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  REQUIRES_REVIEW = 'REQUIRES_REVIEW',
}

export enum KycVerificationMethod {
  SMS = 'sms',
  EMAIL_LINK = 'email_link',
  CALL = 'call',
  DOCUMENT = 'document',
}

export enum KycProfileType {
  USER = 'USER',
  ORGANIZATION = 'ORGANIZATION',
}
