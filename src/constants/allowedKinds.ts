export const ALLOWED_KINDS = {
  USER: {
    BASE: 'USER',
    CREDENTIALS: 'CREDENTIALS',
  },
  ROLE: {
    BASE: 'ROLE',
    PERMISSION: 'PERMISSION',
  },
  ORGANIZATION: {
    BASE: 'ORGANIZATION',
  },
  SMS: {
    BASE: 'SMS',
  },
  PAYMENT_PROVIDER: {
    BASE: 'PAYMENT_PROVIDER',
    CONFIG: 'CONFIG',
  },
  APPLICATION: {
    BASE: 'APPLICATION',
    CONFIG: 'APPLICATION_CONFIG',
  },
  KYC_REQUIREMENT: {
    BASE: 'KYC_REQUIREMENT',
  },
  KYC_PROFILE: {
    BASE: 'KYC_PROFILE',
  },
  ORGANIZATION_TYPE: {
    BASE: 'ORGANIZATION_TYPE',
  },
  ORGANIZATION_KYC_PROFILE: {
    BASE: 'ORGANIZATION_KYC_PROFILE',
  },
  ORGANIZATION_USER: {
    BASE: 'ORGANIZATION_USER',
  },
  KYC_ATTACHMENT: {
    BASE: 'KYC_ATTACHMENT',
  },
  FILES: {
    BASE: 'FILE',
  },
  PROPERTY: {
    ADDRESS: 'ADDRESS',
    LEASE_AGREEMENT: 'LEASE_AGREEMENT',
    LEASE_PAYMENT: 'LEASE_PAYMENT',
  },
  LOCATION: {
    BASE: 'LOCATION',
  },
  ADDRESS: {
    ADDRESS_COMPONENT: 'ADDRESS_COMPONENT',
  }
} as const;

// General type for any allowed kind string
export type AllowedKind =
  (typeof ALLOWED_KINDS)[keyof typeof ALLOWED_KINDS][keyof (typeof ALLOWED_KINDS)[keyof typeof ALLOWED_KINDS]];

// Type guard if needed
export function isAllowedKind(value: unknown): value is AllowedKind {
  const isValid = (obj: any): boolean => {
    if (typeof obj === 'string') return true;
    if (typeof obj !== 'object' || obj === null) return false;
    return Object.values(obj).every(isValid);
  };
  return isValid(value);
}

export default ALLOWED_KINDS;
