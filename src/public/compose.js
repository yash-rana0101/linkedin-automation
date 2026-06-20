/**
 * LinkedIn Post Composer — Client-side logic.
 * Handles text editing, Unicode font formatting, emoji picker,
 * media uploads (via MediaUpload module), live preview, and post submission.
 *
 * Dependencies: UnicodeFonts, EmojiData, MediaUpload (loaded before this script).
 */

(function () {
  'use strict';

  // ─── DOM References ────────────────────────────────────────────
  var postText = document.getElementById('post-text');
  var charCount = document.getElementById('char-count');
  var dropzone = document.getElementById('dropzone');
  var fileInput = document.getElementById('file-input');
  var mediaPreview = document.getElementById('media-preview');
  var btnPost = document.getElementById('btn-post');
  var btnClear = document.getElementById('btn-clear');
  var previewBody = document.getElementById('preview-body');
  var previewMedia = document.getElementById('preview-media');
  var toast = document.getElementById('toast');
  var loadingOverlay = document.getElementById('loading-overlay');
  var toolbarHint = document.getElementById('toolbar-hint');
  var emojiPicker = document.getElementById('emoji-picker');
  var emojiGrid = document.getElementById('emoji-grid');
  var emojiTabs = document.getElementById('emoji-tabs');
  var emojiSearch = document.getElementById('emoji-search');
  var MAX_CHARS = 3000;

  // ─── Media Module Wiring ───────────────────────────────────────
  MediaUpload.onChange(function () {
    MediaUpload.renderThumbnails(mediaPreview);
    MediaUpload.renderPreview(previewMedia);
    updatePostButton();
  });
  MediaUpload.onError(function (msg) { showToast(msg, 'error'); });

  dropzone.addEventListener('dragover', function (e) { e.preventDefault(); dropzone.classList.add('media-upload__dropzone--active'); });
  dropzone.addEventListener('dragleave', function () { dropzone.classList.remove('media-upload__dropzone--active'); });
  dropzone.addEventListener('drop', function (e) { e.preventDefault(); dropzone.classList.remove('media-upload__dropzone--active'); MediaUpload.addFiles(e.dataTransfer.files); });
  fileInput.addEventListener('change', function () { MediaUpload.addFiles(fileInput.files); fileInput.value = ''; });

  // ─── Text Editor ───────────────────────────────────────────────
  postText.addEventListener('input', handleTextInput);

  function handleTextInput() {
    var len = postText.value.length;
    charCount.textContent = len.toLocaleString() + ' / 3,000';
    charCount.classList.remove('editor__charcount--warn', 'editor__charcount--limit');
    if (len > MAX_CHARS) charCount.classList.add('editor__charcount--limit');
    else if (len > 2700) charCount.classList.add('editor__charcount--warn');
    updatePreviewBody();
    updatePostButton();
  }

  // ─── Formatting Toolbar ────────────────────────────────────────
  document.querySelectorAll('[data-format]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      applyFormat(btn.getAttribute('data-format'));
    });
  });

  function applyFormat(format) {
    var start = postText.selectionStart;
    var end = postText.selectionEnd;
    var selected = postText.value.substring(start, end);
    if (!selected) {
      showHint('Select text first, then apply ' + (UnicodeFonts.FORMAT_LABELS[format] || format));
      return;
    }
    var converted = UnicodeFonts.convert(selected, format);
    postText.value = postText.value.substring(0, start) + converted + postText.value.substring(end);
    postText.setSelectionRange(start, start + converted.length);
    postText.focus();
    handleTextInput();
    showHint('Applied ' + (UnicodeFonts.FORMAT_LABELS[format] || format), true);
  }

  function showHint(message, isSuccess) {
    toolbarHint.textContent = message;
    toolbarHint.classList.toggle('toolbar__hint--applied', !!isSuccess);
    clearTimeout(showHint._timer);
    showHint._timer = setTimeout(function () {
      toolbarHint.textContent = '';
      toolbarHint.classList.remove('toolbar__hint--applied');
    }, 3000);
  }

  // ─── Hashtag & Line Break ──────────────────────────────────────
  document.getElementById('btn-hashtag').addEventListener('click', function () {
    insertAtCursor('#');
    postText.focus();
  });

  document.getElementById('btn-linebreak').addEventListener('click', function () {
    insertAtCursor('\n⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n');
    postText.focus();
    handleTextInput();
  });

  function insertAtCursor(text) {
    var start = postText.selectionStart;
    postText.value = postText.value.substring(0, start) + text + postText.value.substring(postText.selectionEnd);
    postText.selectionStart = postText.selectionEnd = start + text.length;
    handleTextInput();
  }

  // ─── Emoji Picker ──────────────────────────────────────────────
  var emojiOpen = false;
  var activeCategory = 0;

  document.getElementById('btn-emoji').addEventListener('click', function (e) {
    e.stopPropagation();
    emojiOpen = !emojiOpen;
    emojiPicker.classList.toggle('emoji-picker--visible', emojiOpen);
    if (emojiOpen) { initEmojiPicker(); emojiSearch.value = ''; emojiSearch.focus(); }
  });

  document.addEventListener('click', function (e) {
    if (emojiOpen && !emojiPicker.contains(e.target) && e.target.id !== 'btn-emoji') {
      emojiOpen = false;
      emojiPicker.classList.remove('emoji-picker--visible');
    }
  });

  function initEmojiPicker() {
    if (emojiTabs.children.length > 0) return;
    EmojiData.categories.forEach(function (cat, i) {
      var tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'emoji-tab' + (i === 0 ? ' emoji-tab--active' : '');
      tab.textContent = cat.icon;
      tab.title = cat.name;
      tab.addEventListener('click', function () { switchCategory(i); });
      emojiTabs.appendChild(tab);
    });
    renderEmojis(0);
  }

  function switchCategory(index) {
    activeCategory = index;
    emojiTabs.querySelectorAll('.emoji-tab').forEach(function (t, i) {
      t.classList.toggle('emoji-tab--active', i === index);
    });
    renderEmojis(index);
  }

  function renderEmojis(catIndex) {
    emojiGrid.innerHTML = '';
    EmojiData.categories[catIndex].emojis.forEach(function (emoji) {
      var cell = createEmojiCell(emoji);
      emojiGrid.appendChild(cell);
    });
  }

  function createEmojiCell(emoji) {
    var cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'emoji-cell';
    cell.textContent = emoji;
    cell.addEventListener('click', function () { insertAtCursor(emoji); postText.focus(); });
    return cell;
  }

  emojiSearch.addEventListener('input', function () {
    var q = emojiSearch.value.trim();
    if (!q) { renderEmojis(activeCategory); return; }
    var results = EmojiData.search(q);
    emojiGrid.innerHTML = '';
    if (results.length === 0) {
      emojiGrid.innerHTML = '<span style="color:var(--text-muted);font-size:0.8rem;grid-column:1/-1;text-align:center;padding:16px">No emojis found</span>';
      return;
    }
    results.forEach(function (r) { emojiGrid.appendChild(createEmojiCell(r.emoji)); });
  });

  // ─── Live Preview ──────────────────────────────────────────────
  function updatePreviewBody() {
    var text = postText.value.trim();
    if (!text) {
      previewBody.innerHTML = '<p class="linkedin-card__placeholder">Your post preview will appear here...</p>';
      return;
    }
    previewBody.textContent = text;
  }

  // ─── Post Button & Clear ───────────────────────────────────────
  function updatePostButton() {
    btnPost.disabled = !(postText.value.trim().length > 0 && postText.value.length <= MAX_CHARS);
  }

  btnClear.addEventListener('click', function () {
    postText.value = '';
    MediaUpload.clearAll();
    handleTextInput();
  });

  // ─── Post Submission ──────────────────────────────────────────
  btnPost.addEventListener('click', submitPost);

  async function submitPost() {
    if (btnPost.disabled) return;
    var text = postText.value.trim();
    if (!text) return;
    showLoading(true);
    try {
      var formData = new FormData();
      formData.append('text', text);
      MediaUpload.getAll().forEach(function (item) {
        formData.append('media', item.file, item.file.name);
      });
      var response = await fetch('/api/post', { method: 'POST', body: formData });
      var result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to post');
      showToast('🎉 Posted successfully! ID: ' + result.postId, 'success');
      postText.value = '';
      MediaUpload.clearAll();
      handleTextInput();
    } catch (error) {
      showToast('❌ ' + error.message, 'error');
    } finally {
      showLoading(false);
    }
  }

  // ─── Toast & Loading ──────────────────────────────────────────
  var toastTimer = null;
  function showToast(message, type) {
    if (toastTimer) clearTimeout(toastTimer);
    toast.textContent = message;
    toast.className = 'toast toast--' + type + ' toast--visible';
    toastTimer = setTimeout(function () { toast.classList.remove('toast--visible'); }, 5000);
  }

  function showLoading(visible) {
    loadingOverlay.classList.toggle('loading-overlay--visible', visible);
  }
})();
