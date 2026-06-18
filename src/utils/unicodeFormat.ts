/**
 * Unicode text formatter for LinkedIn.
 * LinkedIn does NOT render markdown (*bold*, _italic_).
 * This module converts markdown-style markers to Unicode bold/italic characters.
 *
 * Bold:   𝗔-𝗭, 𝗮-𝘇, 𝟬-𝟵 (Mathematical Sans-Serif Bold)
 * Italic: 𝘈-𝘡, 𝘢-𝘻 (Mathematical Sans-Serif Italic)
 */

// Unicode offset maps for sans-serif bold
const BOLD_UPPER_START = 0x1D5D4; // 𝗔
const BOLD_LOWER_START = 0x1D5EE; // 𝗮
const BOLD_DIGIT_START = 0x1D7EC; // 𝟬

// Unicode offset maps for sans-serif italic
const ITALIC_UPPER_START = 0x1D608; // 𝘈
const ITALIC_LOWER_START = 0x1D622; // 𝘢

/** Converts a single character to its Unicode bold variant. */
function toBoldChar(ch: string): string {
  const code = ch.charCodeAt(0);
  if (code >= 65 && code <= 90) return String.fromCodePoint(BOLD_UPPER_START + (code - 65));
  if (code >= 97 && code <= 122) return String.fromCodePoint(BOLD_LOWER_START + (code - 97));
  if (code >= 48 && code <= 57) return String.fromCodePoint(BOLD_DIGIT_START + (code - 48));
  return ch;
}

/** Converts a single character to its Unicode italic variant. */
function toItalicChar(ch: string): string {
  const code = ch.charCodeAt(0);
  if (code >= 65 && code <= 90) return String.fromCodePoint(ITALIC_UPPER_START + (code - 65));
  if (code >= 97 && code <= 122) return String.fromCodePoint(ITALIC_LOWER_START + (code - 97));
  return ch; // No italic digits in Unicode, keep as-is
}

/** Converts a string to Unicode bold. */
export function toBold(text: string): string {
  return [...text].map(toBoldChar).join('');
}

/** Converts a string to Unicode italic. */
export function toItalic(text: string): string {
  return [...text].map(toItalicChar).join('');
}

/**
 * Formats a post by converting markdown-style bold/italic markers to Unicode.
 * - `**text**` or `*text*` → Unicode Bold
 * - `_text_` → Unicode Italic
 */
export function formatForLinkedIn(text: string): string {
  let result = text;

  // Convert **bold** (double asterisks first to avoid conflict)
  result = result.replace(/\*\*(.+?)\*\*/g, (_, content: string) => toBold(content));

  // Convert *bold* (single asterisks — LinkedIn convention)
  result = result.replace(/\*(.+?)\*/g, (_, content: string) => toBold(content));

  // Convert _italic_
  result = result.replace(/(?<!\w)_(.+?)_(?!\w)/g, (_, content: string) => toItalic(content));

  return result;
}
