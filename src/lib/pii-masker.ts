const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const NAME_PREFIXES = /\b(Mr|Mrs|Ms|Dr|Prof)\.\s+[A-Z][a-z]+(\s+[A-Z][a-z]+)*/g;

const BSB_REGEX = /\b\d{3}-\d{3}\b/g;
const IBAN_REGEX = /\b[A-Z]{2}\d{2}[A-Z0-9]{4,30}\b/g;

// SWIFT/BIC codes: 4-letter bank code + 2-letter ISO country + 2-char location + optional 3-char branch.
// Positions 5-6 must be a valid ISO 3166-1 alpha-2 country code to avoid false positives on
// common English words like HOLDINGS, PREVIOUS, SNAPSHOT, ETHEREUM, CURRENCY, EXPOSURE, etc.
const ISO_COUNTRY_CODES = new Set([
  'AD','AE','AF','AG','AI','AL','AM','AO','AQ','AR','AS','AT','AU','AW','AX','AZ',
  'BA','BB','BD','BE','BF','BG','BH','BI','BJ','BL','BM','BN','BO','BQ','BR','BS','BT','BV','BW','BY','BZ',
  'CA','CC','CD','CF','CG','CH','CI','CK','CL','CM','CN','CO','CR','CU','CV','CW','CX','CY','CZ',
  'DE','DJ','DK','DM','DO','DZ',
  'EC','EE','EG','EH','ER','ES','ET',
  'FI','FJ','FK','FM','FO','FR',
  'GA','GB','GD','GE','GF','GG','GH','GI','GL','GM','GN','GP','GQ','GR','GS','GT','GU','GW','GY',
  'HK','HM','HN','HR','HT','HU',
  'ID','IE','IL','IM','IN','IO','IQ','IR','IS','IT',
  'JE','JM','JO','JP',
  'KE','KG','KH','KI','KM','KN','KP','KR','KW','KY','KZ',
  'LA','LB','LC','LI','LK','LR','LS','LT','LU','LV','LY',
  'MA','MC','MD','ME','MF','MG','MH','MK','ML','MM','MN','MO','MP','MQ','MR','MS','MT','MU','MV','MW','MX','MY','MZ',
  'NA','NC','NE','NF','NG','NI','NL','NO','NP','NR','NU','NZ',
  'OM',
  'PA','PE','PF','PG','PH','PK','PL','PM','PN','PR','PS','PT','PW','PY',
  'QA',
  'RE','RO','RS','RU','RW',
  'SA','SB','SC','SD','SE','SG','SH','SI','SJ','SK','SL','SM','SN','SO','SR','SS','ST','SV','SX','SY','SZ',
  'TC','TD','TF','TG','TH','TJ','TK','TL','TM','TN','TO','TR','TT','TV','TW','TZ',
  'UA','UG','UM','US','UY','UZ',
  'VA','VC','VE','VG','VI','VN','VU',
  'WF','WS',
  'XK',
  'YE','YT',
  'ZA','ZM','ZW',
]);

const SWIFT_REGEX = /\b[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?\b/g;

// Common English/financial words that happen to match the SWIFT regex pattern.
// These must never be masked.
const SWIFT_FALSE_POSITIVES = new Set([
  'HOLDINGS', 'PREVIOUS', 'SNAPSHOT', 'CURRENCY', 'EXPOSURE', 'ETHEREUM',
  'COMMODIT', 'BREAKING', 'EMERGING', 'ENSURING', 'EXISTING', 'FLAGGING',
  'FLOATING', 'FOLLOWED', 'GROUPING', 'MANAGING', 'OFFERING', 'OPPOSING',
  'PLANNING', 'PRINTING', 'REQUIRED', 'RESEARCH', 'SHIFTING', 'SPENDING',
  'STARTING', 'STRIKING', 'STRONGLY', 'WATCHING', 'STERLING', 'WEIGHTED',
  'BALANCED', 'RETURNED', 'TRACKING', 'COMBINED', 'OVERVIEW', 'COVERING',
  'DECLINED', 'ESTIMATE', 'ASSESSED', 'EXCHANGE', 'INVESTED', 'ASSUMING',
  'CHANGING', 'DOMESTIC', 'YEARNING', 'YIELDING', 'VALUATION',
]);

export function maskPII(text: string): string {
  return text
    .replace(EMAIL_REGEX, '[EMAIL]')
    .replace(NAME_PREFIXES, '[NAME]')
    .replace(BSB_REGEX, '[BSB]')
    .replace(IBAN_REGEX, '[IBAN]')
    .replace(SWIFT_REGEX, (match) => {
      // Skip common English words that match the SWIFT pattern
      if (SWIFT_FALSE_POSITIVES.has(match)) return match;
      // Real SWIFT/BIC codes have an ISO country code at positions 5-6 (0-indexed: 4-5)
      const countryPart = match.substring(4, 6);
      if (!ISO_COUNTRY_CODES.has(countryPart)) return match;
      return '[SWIFT]';
    });
}
