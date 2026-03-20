const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const NAME_PREFIXES = /\b(Mr|Mrs|Ms|Dr|Prof)\.\s+[A-Z][a-z]+(\s+[A-Z][a-z]+)*/g;

const BSB_REGEX = /\b\d{3}-\d{3}\b/g;
const IBAN_REGEX = /\b[A-Z]{2}\d{2}[A-Z0-9]{4,30}\b/g;
const SWIFT_REGEX = /\b[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?\b/g;

export function maskPII(text: string): string {
  return text
    .replace(EMAIL_REGEX, '[EMAIL]')
    .replace(NAME_PREFIXES, '[NAME]')
    .replace(BSB_REGEX, '[BSB]')
    .replace(IBAN_REGEX, '[IBAN]')
    .replace(SWIFT_REGEX, (match) => {
      const upper = match.toUpperCase();
      if (['EQUITY', 'ALTERNATIVE', 'PRIVATE'].some((w) => upper.startsWith(w))) return match;
      return '[SWIFT]';
    });
}
