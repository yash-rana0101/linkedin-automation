/**
 * Media Upload Handler — manages file uploads, validation, and thumbnail rendering.
 */

/* exported MediaUpload */
var MediaUpload = (function () {
  'use strict';

  var MAX_IMAGES = 9;
  var MAX_IMAGE_SIZE = 10 * 1024 * 1024;
  var MAX_VIDEO_SIZE = 200 * 1024 * 1024;

  /** @type {{ file: File, url: string, type: 'image' | 'video' }[]} */
  var files = [];

  /** @type {function|null} */
  var onChangeCallback = null;

  /** @type {function|null} */
  var onErrorCallback = null;

  function getAll() { return files; }

  function onChange(fn) { onChangeCallback = fn; }
  function onError(fn) { onErrorCallback = fn; }

  function notifyChange() { if (onChangeCallback) onChangeCallback(files); }
  function notifyError(msg) { if (onErrorCallback) onErrorCallback(msg); }

  function addFiles(fileList) {
    for (var i = 0; i < fileList.length; i++) {
      var file = fileList[i];
      var type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : null;
      if (!type) { notifyError('Unsupported file: ' + file.name); continue; }
      if (type === 'image' && file.size > MAX_IMAGE_SIZE) { notifyError(file.name + ' exceeds 10MB'); continue; }
      if (type === 'video' && file.size > MAX_VIDEO_SIZE) { notifyError(file.name + ' exceeds 200MB'); continue; }
      var hasVideo = files.some(function (m) { return m.type === 'video'; });
      var hasImage = files.some(function (m) { return m.type === 'image'; });
      if ((type === 'video' && hasImage) || (type === 'image' && hasVideo)) { notifyError('Cannot mix images and video'); continue; }
      if (type === 'video' && files.length >= 1) { notifyError('Only one video allowed'); continue; }
      if (type === 'image' && files.length >= MAX_IMAGES) { notifyError('Max ' + MAX_IMAGES + ' images'); continue; }
      files.push({ file: file, url: URL.createObjectURL(file), type: type });
    }
    notifyChange();
  }

  function remove(index) {
    URL.revokeObjectURL(files[index].url);
    files.splice(index, 1);
    notifyChange();
  }

  function clearAll() {
    files.forEach(function (m) { URL.revokeObjectURL(m.url); });
    files = [];
    notifyChange();
  }

  function renderThumbnails(container) {
    container.innerHTML = '';
    files.forEach(function (item, idx) {
      var thumb = document.createElement('div');
      thumb.className = 'media-thumb';
      var el;
      if (item.type === 'video') {
        el = document.createElement('video');
        el.className = 'media-thumb__video';
        el.src = item.url;
        el.muted = true;
        el.addEventListener('mouseenter', function () { el.play(); });
        el.addEventListener('mouseleave', function () { el.pause(); el.currentTime = 0; });
        thumb.appendChild(el);
        var badge = document.createElement('span');
        badge.className = 'media-thumb__badge';
        badge.textContent = 'VIDEO';
        thumb.appendChild(badge);
      } else {
        el = document.createElement('img');
        el.className = 'media-thumb__img';
        el.src = item.url;
        el.alt = item.file.name;
        thumb.appendChild(el);
      }
      var rm = document.createElement('button');
      rm.className = 'media-thumb__remove';
      rm.textContent = '×';
      rm.addEventListener('click', function () { remove(idx); });
      thumb.appendChild(rm);
      container.appendChild(thumb);
    });
  }

  function renderPreview(container) {
    container.innerHTML = '';
    if (files.length === 0) return;
    if (files.length === 1) {
      var item = files[0];
      var el = document.createElement(item.type === 'video' ? 'video' : 'img');
      el.src = item.url;
      if (item.type === 'video') { el.controls = true; el.muted = true; }
      else { el.alt = 'Post image'; }
      container.appendChild(el);
      return;
    }
    var grid = document.createElement('div');
    grid.className = 'preview-media-grid';
    var cls = files.length === 2 ? '--2' : files.length === 3 ? '--3' : '--multi';
    grid.classList.add('preview-media-grid' + cls);
    var maxShow = Math.min(files.length, 4);
    for (var j = 0; j < maxShow; j++) {
      var img = document.createElement('img');
      img.src = files[j].url;
      img.alt = 'Post image ' + (j + 1);
      grid.appendChild(img);
    }
    if (files.length > 4) {
      var last = grid.lastChild;
      var wrapper = document.createElement('div');
      wrapper.style.position = 'relative';
      wrapper.appendChild(last.cloneNode(true));
      var overlay = document.createElement('div');
      overlay.style.cssText = 'position:absolute;inset:0;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;font-size:1.5rem;font-weight:700;color:white;pointer-events:none';
      overlay.textContent = '+' + (files.length - 4);
      wrapper.appendChild(overlay);
      grid.replaceChild(wrapper, last);
    }
    container.appendChild(grid);
  }

  return {
    getAll: getAll,
    addFiles: addFiles,
    remove: remove,
    clearAll: clearAll,
    renderThumbnails: renderThumbnails,
    renderPreview: renderPreview,
    onChange: onChange,
    onError: onError,
  };
})();
