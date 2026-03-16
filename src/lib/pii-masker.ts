const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(\+?\d{1,4}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g;
const ACCOUNT_REGEX = /\b\d{6,18}\b/g;
const NAME_PREFIXES = /\b(Mr|Mrs|Ms|Dr|Prof)\.\s+[A-Z][a-z]+(\s+[A-Z][a-z]+)*/g;

export function maskPII(text: string): string {
  return text
    .replace(EMAIL_REGEX, '[EMAIL]')
    .replace(PHONE_REGEX, (match) => {
      if (match.includes('.') || match.includes(',') || parseFloat(match) > 0) {
        if (match.replace(/[-.\s()]/g, '').length >= 8) {
          return '[PHONE]';
        }
      }
      return match;
    })
    .replace(NAME_PREFIXES, '[NAME]')
    .replace(ACCOUNT_REGEX, (match) => {
      if (match.length >= 8 && !match.includes('.')) {
        return '[ACCOUNT]';
      }
      return match;
    });
}
