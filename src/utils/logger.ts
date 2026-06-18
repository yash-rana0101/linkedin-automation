/**
 * Safe console logger with IST timestamps.
 * Automatically masks strings that look like API keys.
 */

const IST_LOCALE_OPTIONS: Intl.DateTimeFormatOptions = {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
};

function getISTTimestamp(): string {
  return new Date().toLocaleString('en-IN', IST_LOCALE_OPTIONS);
}

/** Masks any string segment that looks like an API key / token. */
function maskSecrets(message: string): string {
  // Matches long alphanumeric strings (16+ chars) that could be API keys
  return message.replace(/[A-Za-z0-9_\-]{20,}/g, (match) => {
    // Preserve common non-secret long strings (URLs, URNs, file paths)
    if (match.includes('http') || match.includes('urn:') || match.includes('/')) {
      return match;
    }
    return `${match.slice(0, 4)}****${match.slice(-4)}`;
  });
}

function formatMessage(level: string, message: string): string {
  return `[${getISTTimestamp()}] [${level}] ${maskSecrets(message)}`;
}

export const log = {
  info: (message: string): void => {
    console.log(formatMessage('INFO', message));
  },

  warn: (message: string): void => {
    console.warn(formatMessage('WARN', message));
  },

  error: (message: string, error?: Error): void => {
    console.error(formatMessage('ERROR', message));
    if (error?.stack) {
      const trimmedStack = error.stack.split('\n').slice(0, 5).join('\n');
      console.error(maskSecrets(trimmedStack));
    }
  },
};
