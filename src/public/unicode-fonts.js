/**
 * Unicode Font Converter — Client-side font transformation for LinkedIn.
 * Since LinkedIn doesn't support rich text, we use Unicode math symbol ranges
 * to create the appearance of bold, italic, monospace, script, etc.
 */

/* exported UnicodeFonts */
var UnicodeFonts = (function () {
  'use strict';

  // ─── Unicode Code Point Offset Maps ────────────────────────────
  // Each font maps [uppercase start, lowercase start, digit start (or null)]
  var FONT_OFFSETS = {
    bold:          { upper: 0x1D5D4, lower: 0x1D5EE, digit: 0x1D7EC },
    italic:        { upper: 0x1D608, lower: 0x1D622, digit: null },
    boldItalic:    { upper: 0x1D63C, lower: 0x1D656, digit: null },
    monospace:     { upper: 0x1D670, lower: 0x1D68A, digit: 0x1D7F6 },
    script:        { upper: 0x1D49C, lower: 0x1D4B6, digit: null },
    boldScript:    { upper: 0x1D4D0, lower: 0x1D4EA, digit: null },
    fraktur:       { upper: 0x1D504, lower: 0x1D51E, digit: null },
    doublestruck:  { upper: 0x1D538, lower: 0x1D552, digit: 0x1D7D8 },
  };

  // Script font has exceptions for certain letters that are pre-existing Unicode chars
  var SCRIPT_EXCEPTIONS = {
    'B': '\u212C', 'E': '\u2130', 'F': '\u2131', 'H': '\u210B',
    'I': '\u2110', 'L': '\u2112', 'M': '\u2133', 'R': '\u211B',
    'e': '\u212F', 'g': '\u210A', 'o': '\u2134',
  };

  // Fraktur exceptions
  var FRAKTUR_EXCEPTIONS = {
    'C': '\u212D', 'H': '\u210C', 'I': '\u2111', 'R': '\u211C', 'Z': '\u2128',
  };

  // Double-struck exceptions
  var DOUBLESTRUCK_EXCEPTIONS = {
    'C': '\u2102', 'H': '\u210D', 'N': '\u2115', 'P': '\u2119',
    'Q': '\u211A', 'R': '\u211D', 'Z': '\u2124',
  };

  // Circled letters: Ⓐ=0x24B6, ⓐ=0x24D0, ⓪=0x24EA, ①=0x2460
  var CIRCLED = {
    upper: 0x24B6, lower: 0x24D0,
    digits: [0x24EA, 0x2460, 0x2461, 0x2462, 0x2463, 0x2464, 0x2465, 0x2466, 0x2467, 0x2468],
  };

  // Squared letters: 🄰=0x1F130
  var SQUARED = { upper: 0x1F130 };

  // Combining character maps for underline and strikethrough
  var COMBINING_UNDERLINE = '\u0332';     // ̲
  var COMBINING_STRIKETHROUGH = '\u0336'; // ̶

  /**
   * Convert a single character using offset-based font mapping.
   */
  function convertCharOffset(ch, offsets, exceptions) {
    if (exceptions && exceptions[ch]) return exceptions[ch];

    var code = ch.charCodeAt(0);
    // Uppercase A-Z
    if (code >= 65 && code <= 90 && offsets.upper) {
      return String.fromCodePoint(offsets.upper + (code - 65));
    }
    // Lowercase a-z
    if (code >= 97 && code <= 122 && offsets.lower) {
      return String.fromCodePoint(offsets.lower + (code - 97));
    }
    // Digits 0-9
    if (code >= 48 && code <= 57 && offsets.digit) {
      return String.fromCodePoint(offsets.digit + (code - 48));
    }
    return ch;
  }

  /**
   * Convert text using a combining character (appended after each char).
   */
  function applyCombining(text, combiningChar) {
    var result = '';
    for (var i = 0; i < text.length; i++) {
      result += text[i];
      // Only apply to visible characters, not spaces/newlines
      if (text[i] !== ' ' && text[i] !== '\n' && text[i] !== '\r' && text[i] !== '\t') {
        result += combiningChar;
      }
    }
    return result;
  }

  /**
   * Convert text to circled letters.
   */
  function toCircled(text) {
    var result = '';
    for (var i = 0; i < text.length; i++) {
      var code = text.charCodeAt(i);
      if (code >= 65 && code <= 90) {
        result += String.fromCodePoint(CIRCLED.upper + (code - 65));
      } else if (code >= 97 && code <= 122) {
        result += String.fromCodePoint(CIRCLED.lower + (code - 97));
      } else if (code >= 48 && code <= 57) {
        result += String.fromCodePoint(CIRCLED.digits[code - 48]);
      } else {
        result += text[i];
      }
    }
    return result;
  }

  /**
   * Convert text to squared letters (uppercase only).
   */
  function toSquared(text) {
    var result = '';
    var upper = text.toUpperCase();
    for (var i = 0; i < upper.length; i++) {
      var code = upper.charCodeAt(i);
      if (code >= 65 && code <= 90) {
        result += String.fromCodePoint(SQUARED.upper + (code - 65));
      } else {
        result += upper[i];
      }
    }
    return result;
  }

  // ─── Public API ────────────────────────────────────────────────

  /**
   * Convert text to a specific Unicode font style.
   * @param {string} text - The plain text to convert
   * @param {string} format - The format name
   * @returns {string} Unicode-formatted text
   */
  function convert(text, format) {
    switch (format) {
      case 'bold':
        return convertAll(text, FONT_OFFSETS.bold, null);
      case 'italic':
        return convertAll(text, FONT_OFFSETS.italic, null);
      case 'boldItalic':
        return convertAll(text, FONT_OFFSETS.boldItalic, null);
      case 'monospace':
        return convertAll(text, FONT_OFFSETS.monospace, null);
      case 'script':
        return convertAll(text, FONT_OFFSETS.script, SCRIPT_EXCEPTIONS);
      case 'boldScript':
        return convertAll(text, FONT_OFFSETS.boldScript, null);
      case 'fraktur':
        return convertAll(text, FONT_OFFSETS.fraktur, FRAKTUR_EXCEPTIONS);
      case 'doublestruck':
        return convertAll(text, FONT_OFFSETS.doublestruck, DOUBLESTRUCK_EXCEPTIONS);
      case 'underline':
        return applyCombining(text, COMBINING_UNDERLINE);
      case 'strikethrough':
        return applyCombining(text, COMBINING_STRIKETHROUGH);
      case 'circled':
        return toCircled(text);
      case 'squared':
        return toSquared(text);
      default:
        return text;
    }
  }

  function convertAll(text, offsets, exceptions) {
    var result = '';
    for (var i = 0; i < text.length; i++) {
      result += convertCharOffset(text[i], offsets, exceptions);
    }
    return result;
  }

  /** Display name for each format. */
  var FORMAT_LABELS = {
    bold: '𝗕𝗼𝗹𝗱',
    italic: '𝘐𝘵𝘢𝘭𝘪𝘤',
    underline: 'U̲n̲d̲e̲r̲l̲i̲n̲e̲',
    strikethrough: 'S̶t̶r̶i̶k̶e̶',
    monospace: '𝙼𝚘𝚗𝚘',
    script: '𝒮𝒸𝓇𝒾𝓅𝓉',
    doublestruck: '𝔻𝕠𝕦𝕓𝕝𝕖',
    fraktur: '𝔉𝔯𝔞𝔨𝔱𝔲𝔯',
    circled: 'Ⓒⓘⓡⓒⓛⓔⓓ',
    squared: '🅂🅀🅄🄰🅁🄴🄳',
  };

  return {
    convert: convert,
    FORMAT_LABELS: FORMAT_LABELS,
  };
})();
