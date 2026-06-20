/**
 * Emoji Data — Curated emoji collection organized by category.
 * Used by the emoji picker in the LinkedIn Post Composer.
 */

/* exported EmojiData */
var EmojiData = (function () {
  'use strict';

  var categories = [
    {
      name: 'Frequent',
      icon: '🕐',
      emojis: [
        '🚀', '🔥', '💡', '✅', '🎯', '💪', '🙌', '👏',
        '📈', '🏆', '⭐', '💼', '🤝', '📊', '🎉', '✨',
        '💎', '🌟', '❤️', '👍', '🔑', '📣', '🧠', '💰',
      ],
    },
    {
      name: 'Smileys',
      icon: '😊',
      emojis: [
        '😊', '😄', '😁', '🤩', '😎', '🤔', '🧐', '😏',
        '😅', '😂', '🤣', '🥲', '😇', '🥰', '😍', '😘',
        '😮', '😲', '🤯', '😤', '😱', '🙄', '😴', '🤗',
      ],
    },
    {
      name: 'Hands',
      icon: '👋',
      emojis: [
        '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏',
        '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆',
        '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜',
      ],
    },
    {
      name: 'Business',
      icon: '💼',
      emojis: [
        '💼', '📊', '📈', '📉', '📋', '📌', '📎', '🔗',
        '📧', '📩', '📬', '🗓️', '⏰', '💻', '🖥️', '📱',
        '📝', '✏️', '📁', '📂', '🗂️', '💳', '🏦', '🏢',
      ],
    },
    {
      name: 'Tech',
      icon: '💻',
      emojis: [
        '💻', '⌨️', '🖱️', '🖥️', '📱', '🔌', '💾', '💿',
        '🔧', '🔨', '⚙️', '🛠️', '🧪', '🔬', '🔭', '📡',
        '🤖', '👾', '🌐', '☁️', '🔒', '🔓', '🛡️', '⚡',
      ],
    },
    {
      name: 'Symbols',
      icon: '✨',
      emojis: [
        '✨', '⭐', '🌟', '💫', '✅', '❌', '❓', '❗',
        '💯', '🔥', '💥', '💢', '🎵', '🎶', '♻️', '⚠️',
        '🚫', '⬆️', '⬇️', '➡️', '⬅️', '↩️', '↪️', '🔄',
      ],
    },
    {
      name: 'Celebrate',
      icon: '🎉',
      emojis: [
        '🎉', '🎊', '🥳', '🎂', '🎁', '🎈', '🎀', '🎗️',
        '🏅', '🏆', '🥇', '🥈', '🥉', '🎖️', '🎯', '🎪',
        '🎤', '🎧', '🎬', '📸', '🎨', '🖌️', '🎭', '🎻',
      ],
    },
    {
      name: 'Nature',
      icon: '🌿',
      emojis: [
        '🌿', '🍀', '🌱', '🌳', '🌲', '🌻', '🌹', '🌺',
        '🌊', '🌅', '🌄', '⛰️', '🏔️', '🌈', '☀️', '🌙',
        '🦁', '🦊', '🐝', '🦋', '🐸', '🐢', '🦅', '🐬',
      ],
    },
  ];

  /**
   * Search emojis across all categories.
   * @param {string} query
   * @returns {{ emoji: string, category: string }[]}
   */
  function search(query) {
    if (!query) return [];
    var lower = query.toLowerCase();
    var results = [];
    categories.forEach(function (cat) {
      // Simple name-based matching
      if (cat.name.toLowerCase().includes(lower)) {
        cat.emojis.forEach(function (e) {
          results.push({ emoji: e, category: cat.name });
        });
      }
    });
    // Deduplicate
    var seen = {};
    return results.filter(function (r) {
      if (seen[r.emoji]) return false;
      seen[r.emoji] = true;
      return true;
    });
  }

  return {
    categories: categories,
    search: search,
  };
})();
