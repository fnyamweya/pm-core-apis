const COUNTRY_CODE_PREFIX = /^(?:254|\+254|0)?/;

export const PHONE_REGEX = {
  SAFARICOM: {
    GEN1: new RegExp(`${COUNTRY_CODE_PREFIX.source}(7[0-9]{8})$`),
    GEN2: new RegExp(`${COUNTRY_CODE_PREFIX.source}(7[4-9][0-9]{7})$`),
    MPESA: new RegExp(
      `${COUNTRY_CODE_PREFIX.source}(74[0-9]{7}|748|757|758|759)$`
    ),
  },
  AIRTEL: {
    GEN1: new RegExp(`${COUNTRY_CODE_PREFIX.source}(7[38][0-9]{7})$`),
    GEN2: new RegExp(`${COUNTRY_CODE_PREFIX.source}(10[0-2][0-9]{6})$`),
  },
  TELKOM: {
    GEN1: new RegExp(`${COUNTRY_CODE_PREFIX.source}(77[0-9]{7})$`),
  },
  EQUITEL: {
    GEN1: new RegExp(`${COUNTRY_CODE_PREFIX.source}(76[0-9]{7})$`),
  },
  STANDARD_FORMAT: {
    FORMAT: new RegExp(`^(?:254|0)?(1[0-2][0-9]{7}|7[0-9]{8})$`),
  },
} as const;
