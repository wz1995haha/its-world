/* media.js — 照片/视频：压一压，然后存进 IndexedDB（localStorage 装不下这些字节） */
(function () {
  'use strict';
  var PT = (window.PT = window.PT || {});

  var DB_NAME = 'pawseye.media.v1';
  var STORE = 'files';
  var _db = null;

  function db() {
    if (_db) return _db;
    _db = new Promise(function (resolve, reject) {
      if (!window.indexedDB) { reject(new Error('这个浏览器不支持本地存文件')); return; }
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () {
        var d = req.result;
        if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE);
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error('打不开本地库')); };
    });
    return _db;
  }

  function put(id, blob) {
    return db().then(function (d) {
      return new Promise(function (res, rej) {
        var t = d.transaction(STORE, 'readwrite');
        t.objectStore(STORE).put(blob, id);
        t.oncomplete = function () { res(id); };
        t.onerror = function () { rej(friendly(t.error)); };
        t.onabort = function () { rej(friendly(t.error)); };
      });
    });
  }

  /* 空间满了 / 私密模式禁写：换成一句人话 */
  function friendly(err) {
    var name = (err && err.name) || '';
    if (name === 'QuotaExceededError') {
      return new Error('这台设备上放不下了，先删几个旧视频再试');
    }
    if (name === 'InvalidStateError' || name === 'NotAllowedError') {
      return new Error('浏览器不让存（可能是无痕模式）');
    }
    return new Error((err && err.message) || '存不进去');
  }

  function get(id) {
    return db().then(function (d) {
      return new Promise(function (res, rej) {
        var t = d.transaction(STORE, 'readonly');
        var r = t.objectStore(STORE).get(id);
        r.onsuccess = function () { res(r.result || null); };
        r.onerror = function () { rej(r.error); };
      });
    }).catch(function () { return null; });
  }

  function del(id) {
    return db().then(function (d) {
      return new Promise(function (res) {
        var t = d.transaction(STORE, 'readwrite');
        t.objectStore(STORE).delete(id);
        t.oncomplete = function () { res(true); };
        t.onerror = function () { res(false); };
      });
    }).catch(function () { return false; });
  }

  function clear() {
    return db().then(function (d) {
      return new Promise(function (res) {
        var t = d.transaction(STORE, 'readwrite');
        t.objectStore(STORE).clear();
        t.oncomplete = function () { res(true); };
        t.onerror = function () { res(false); };
      });
    }).catch(function () { return false; });
  }

  function uid() {
    return 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function pickSize(w, h, max) {
    var s = Math.min(1, max / Math.max(w || 1, h || 1));
    return { w: Math.max(1, Math.round((w || 1) * s)), h: Math.max(1, Math.round((h || 1) * s)) };
  }

  function toBlob(canvas, type, q) {
    return new Promise(function (res) { canvas.toBlob(res, type, q); });
  }

  function loadImage(file) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () { res({ img: img, url: url }); };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('这张图打不开')); };
      img.src = url;
    });
  }

  /* 照片：最长边 1800、JPEG 0.86，够看清又够小 */
  function readPhoto(file) {
    if (file.size > 40 * 1024 * 1024) return Promise.reject(new Error('这张照片超过 40MB 了'));
    return loadImage(file).then(function (o) {
      var img = o.img;
      var size = pickSize(img.naturalWidth || img.width, img.naturalHeight || img.height, 1800);
      var c = document.createElement('canvas');
      c.width = size.w; c.height = size.h;
      var ctx = c.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, size.w, size.h);
      ctx.drawImage(img, 0, 0, size.w, size.h);
      URL.revokeObjectURL(o.url);
      return toBlob(c, 'image/jpeg', 0.86).then(function (blob) {
        if (!blob) throw new Error('图片处理失败');
        return { blob: blob, w: size.w, h: size.h, type: 'image/jpeg', kind: 'photo' };
      });
    });
  }

  /* 视频：原样存本地，另外抽一张封面。
     抽不到封面不算失败 —— 视频照样存下来、照样能放，只是缩略图空着。
     手机上（尤其是 iPhone 的 HEVC .mov）canvas 经常抓不到帧，
     以前这种情况整条上传就废了，现在不会。 */
  function readVideo(file) {
    if (file.size > 500 * 1024 * 1024) return Promise.reject(new Error('这个视频超过 500MB 了，剪短一点再传'));
    var url = URL.createObjectURL(file);
    var v = document.createElement('video');
    v.preload = 'metadata';
    v.muted = true;
    v.setAttribute('playsinline', '');
    v.setAttribute('webkit-playsinline', '');
    v.src = url;

    return new Promise(function (resolve) {
      var settled = false, captureTimer = null, metaTimer = null;
      var hardTimer = setTimeout(function () { finish(); }, 20000);

      function cleanup() {
        clearTimeout(hardTimer);
        if (captureTimer) clearTimeout(captureTimer);
        if (metaTimer) clearTimeout(metaTimer);
        try { v.removeAttribute('src'); v.load(); } catch (e) { }
        try { URL.revokeObjectURL(url); } catch (e) { }
      }
      function finish(poster) {
        if (settled) return;
        settled = true;
        cleanup();
        resolve({
          blob: file,
          kind: 'video',
          w: v.videoWidth || 0,
          h: v.videoHeight || 0,
          dur: isFinite(v.duration) ? (v.duration || 0) : 0,
          type: file.type || 'video/mp4',
          poster: poster || null
        });
      }
      function grab() {
        if (settled) return;
        var w = v.videoWidth || 0, h = v.videoHeight || 0;
        if (!w || !h) { finish(null); return; }
        var size = pickSize(w, h, 900);
        var c = document.createElement('canvas');
        c.width = size.w; c.height = size.h;
        var ctx = c.getContext('2d');
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, size.w, size.h);
        try { ctx.drawImage(v, 0, 0, size.w, size.h); } catch (e) { finish(null); return; }
        toBlob(c, 'image/jpeg', 0.82).then(function (poster) {
          finish(poster && poster.size > 2000 ? poster : null);
        }, function () { finish(null); });
      }
      v.onloadedmetadata = function () {
        /* 有些文件 duration 是 Infinity，先跳一下再回来 */
        if (!isFinite(v.duration)) { try { v.currentTime = 1e101; } catch (e) { } }
        try { v.currentTime = Math.min(0.3, (isFinite(v.duration) ? v.duration : 1) * 0.2); } catch (e) { finish(null); return; }
        captureTimer = setTimeout(function () { grab(); }, 2500);
      };
      v.onseeked = function () { grab(); };
      v.onerror = function () { finish(null); };
      /* 有些容器 metadata 永远不触发，别让用户干等 */
      metaTimer = setTimeout(function () { grab(); }, 6000);
    });
  }

  PT.MEDIA = { put: put, get: get, del: del, clear: clear, uid: uid, readPhoto: readPhoto, readVideo: readVideo };
})();
