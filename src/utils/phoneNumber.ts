/**
 * Common regex patterns used across different providers.
 * @constant
 */
const PATTERNS = {
  COUNTRY_CODE: '(?:254|\\+254|0)?',
  NUMBER_ONLY: '[0-9]',
} as const;

/**
 * Defines the number of remaining digits needed based on prefix length.
 * - 2-digit prefixes require 7 additional digits.
 * - 3-digit prefixes require 6 additional digits.
 * @constant
 */
const REMAINING_DIGITS: Record<number, number> = {
  2: 7, // For 2-digit prefixes like '72'
  3: 6, // For 3-digit prefixes like '740'
} as const;

/**
 * Type definition for each provider's generation patterns.
 */
type ProviderGenerations = {
  GEN_1: string[];
  GEN_2?: string[];
  GEN_3?: string[];
};

/**
 * Type definition for provider prefixes.
 */
type ProviderPrefixes = {
  SAFARICOM: Required<ProviderGenerations>;
  AIRTEL: Pick<ProviderGenerations, 'GEN_1' | 'GEN_2'>;
  TELKOM: Pick<ProviderGenerations, 'GEN_1'>;
  EQUITEL: Pick<ProviderGenerations, 'GEN_1'>;
};

/**
 * Prefix ranges for different providers and their generations.
 * To add a new provider or generation:
 * 1. Add a new entry to this object with the provider's name.
 * 2. Specify the generation (GEN_1, GEN_2, etc.) and an array of prefixes.
 * 3. Ensure each prefix matches a length in `REMAINING_DIGITS`.
 * @constant
 */
const PREFIX_RANGES: ProviderPrefixes = {
  SAFARICOM: {
    GEN_1: ['72'],
    GEN_2: [
      '70',
      '71',
      '72',
      '740',
      '741',
      '742',
      '743',
      '745',
      '746',
      '748',
      '757',
      '758',
      '759',
      '768',
      '769',
      '79',
    ],
    GEN_3: ['112', '113', '114', '115'],
  },
  AIRTEL: {
    GEN_1: ['73', '78'],
    GEN_2: ['100', '101', '102'],
  },
  TELKOM: {
    GEN_1: ['77'],
  },
  EQUITEL: {
    GEN_1: ['76'],
  },
} as const;

/**
 * Type definition for regex validation patterns.
 */
type RegexPatterns = {
  [P in keyof ProviderPrefixes]: {
    [G in keyof ProviderPrefixes[P]]: RegExp;
  };
};

/**
 * Validates if a prefix has a valid length based on REMAINING_DIGITS.
 * @param {string} prefix - The prefix to validate.
 * @returns {boolean} - True if valid; otherwise, false.
 */
const isValidPrefix = (prefix: string): boolean => {
  return prefix.length in REMAINING_DIGITS;
};

/**
 * Gets the number of remaining digits required for a prefix based on its length.
 * @param {string} prefix - The prefix to evaluate.
 * @throws {Error} If prefix length is invalid.
 * @returns {number} - Number of remaining digits needed.
 */
const getRemainingDigits = (prefix: string): number => {
  if (!isValidPrefix(prefix)) {
    throw new Error(`Invalid prefix length: ${prefix}`);
  }
  return REMAINING_DIGITS[prefix.length as keyof typeof REMAINING_DIGITS];
};

/**
 * Builds a regex pattern for a specific prefix.
 * @param {string} prefix - The prefix to create a pattern for.
 * @returns {string} - The regex pattern string.
 */
const buildPrefixPattern = (prefix: string): string => {
  const remainingDigits = getRemainingDigits(prefix);
  return `${PATTERNS.COUNTRY_CODE}(${prefix}${PATTERNS.NUMBER_ONLY}{${remainingDigits}})`;
};

/**
 * Builds a complete regex pattern from an array of prefixes.
 * @param {readonly string[]} prefixes - Array of prefixes to combine.
 * @returns {RegExp} - The complete regex pattern for validation.
 */
const buildRegexFromPrefixes = (prefixes: readonly string[]): RegExp => {
  const patterns = prefixes.filter(isValidPrefix).map(buildPrefixPattern);

  if (patterns.length === 0) {
    throw new Error('No valid prefixes provided');
  }

  return new RegExp(`^(?:${patterns.join('|')})$`);
};

/**
 * Generated regular expressions for validating phone numbers based on provider and generation.
 * This object is dynamically constructed using PREFIX_RANGES and the buildRegexFromPrefixes function.
 * @constant
 */
export const PHONE_REGEX: RegexPatterns = {
  SAFARICOM: {
    GEN_1: buildRegexFromPrefixes(PREFIX_RANGES.SAFARICOM.GEN_1),
    GEN_2: buildRegexFromPrefixes(PREFIX_RANGES.SAFARICOM.GEN_2),
    GEN_3: buildRegexFromPrefixes(PREFIX_RANGES.SAFARICOM.GEN_3),
  },
  AIRTEL: {
    GEN_1: buildRegexFromPrefixes(PREFIX_RANGES.AIRTEL.GEN_1),
    GEN_2: buildRegexFromPrefixes(PREFIX_RANGES.AIRTEL.GEN_2 ?? []),
  },
  TELKOM: {
    GEN_1: buildRegexFromPrefixes(PREFIX_RANGES.TELKOM.GEN_1),
  },
  EQUITEL: {
    GEN_1: buildRegexFromPrefixes(PREFIX_RANGES.EQUITEL.GEN_1),
  },
};

/**
 * Gets all valid prefixes across all providers and generations in PREFIX_RANGES.
 * @returns {string[]} - An array of all prefixes.
 */
const getAllPrefixes = (): string[] => {
  const prefixes: string[] = [];
  Object.values(PREFIX_RANGES).forEach((provider) => {
    Object.values(provider).forEach((generation) => {
      if (generation) {
        prefixes.push(...generation);
      }
    });
  });
  return prefixes;
};

/**
 * Formats a phone number to the standard +2547XXXXXXXX format.
 * @param {string} phone - The phone number to format.
 * @returns {string | undefined} - Formatted phone number or undefined if invalid.
 */
export const formatPhoneNumber = (phone: string): string | undefined => {
  const allPrefixes = getAllPrefixes()
    .filter(isValidPrefix)
    .map(
      (prefix) =>
        `${prefix}${PATTERNS.NUMBER_ONLY}{${getRemainingDigits(prefix)}}`
    )
    .join('|');

  const match = phone.match(
    new RegExp(`^${PATTERNS.COUNTRY_CODE}(${allPrefixes})$`)
  );
  return match ? `+254${match[1]}` : undefined;
};

/**
 * Type-safe provider keys.
 * @typedef {keyof typeof PHONE_REGEX} Provider
 */
export type Provider = keyof typeof PHONE_REGEX;

/**
 * Type-safe pattern keys for a given provider.
 * @typedef {keyof (typeof PHONE_REGEX)[T]} ProviderPattern
 * @template T
 */
export type ProviderPattern<T extends Provider> = keyof (typeof PHONE_REGEX)[T];

/**
 * Validates a phone number based on the provider and generation.
 * @param {string} phone - The phone number to validate.
 * @param {Provider} provider - The provider to validate against.
 * @param {ProviderPattern<Provider>} pattern - The generation or main pattern.
 * @returns {boolean} - True if valid, false otherwise.
 */
export const validatePhoneNumber = <T extends Provider>(
  phone: string,
  provider: T,
  pattern: ProviderPattern<T>
): boolean => {
  const regex = PHONE_REGEX[provider][pattern];
  return regex.test(phone);
};
