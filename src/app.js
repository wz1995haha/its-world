/* app.js — 界面与交互 */
(function () {
  'use strict';
  var PT = window.PT, S = PT.STORE;
  var $app = document.getElementById('app');
  var esc = PT.escape;

  var view = { name: 'today', key: null };
  var writing = null;
  var toastTimer = null;

  var PERSON = [
    { id: 'tsundere', label: '傲娇', desc: '嘴上不在乎，行动很诚实' },
    { id: 'clingy', label: '黏人', desc: '你去哪，它就去哪' },
    { id: 'aloof', label: '高冷', desc: '允许你待在附近' },
    { id: 'greedy', label: '贪吃', desc: '心里只有开饭的声音' },
    { id: 'curious', label: '好奇', desc: '所有柜子都要检查一遍' }
  ];

  /* ---------------- 小工具 ---------------- */

  function dayNo(key) {
    var pet = S.active() || {};
    var start = pet.homeDate || pet.birthday || (S.get().createdAt || '').slice(0, 10);
    if (!start) return 1;
    return Math.max(1, PT.daysBetween(start, key) + 1);
  }

  function moodObj(k) { return PT.MOODS[k] || PT.MOODS.calm; }

  function toast(msg) {
    var el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 1600);
  }

  function paragraphs(body, animate) {
    return String(body || '').split('\n').filter(Boolean).map(function (p, i) {
      var st = animate ? ' style="animation-delay:' + (i * 110) + 'ms"' : '';
      return '<p class="para"' + st + '>' + esc(p) + '</p>';
    }).join('');
  }

  function factsHTML(d) {
    var items = (d.events || []).map(function (e) {
      var t = typeInfo(e);
      var extra = '';
      if (e.num != null) extra = ' ' + e.num + (t.num ? t.num.unit : '');
      if (e.opt) extra = ' ' + e.opt;
      return '<span class="fact">' + esc(t.icon) + ' ' + esc(t.label) + esc(extra) + '</span>';
    }).join('');
    var note = d.note ? '<div class="fact-note">你写下：' + esc(d.note) + '</div>' : '';
    return '<div class="fact-list">' + (items || '<span class="fact dim">没有留下事实</span>') + '</div>' + note;
  }

  function entryCard(key, opts) {
    opts = opts || {};
    var d = S.day(key);
    if (!d || !d.diary) return '';
    var mo = moodObj(d.diary.mood);
    var body = paragraphs(d.diary.body, opts.animate);
    return '' +
      '<article class="entry card" id="entry-' + key + '">' +
      '<div class="entry-top">' +
      '<span class="entry-day">' + PT.fmtShort(key) + ' · 第 ' + dayNo(key) + ' 天</span>' +
      '<span class="mood" style="color:' + mo.color + ';border-color:' + mo.color + '33">' + mo.emoji + ' ' + mo.label + '</span>' +
      '</div>' +
      '<h2 class="entry-title">' + esc(d.diary.title) + '</h2>' +
      '<div class="entry-body">' + body + '</div>' +
      mediaGrid(key) +
      (d.diary.stale ? '<div class="stale">这一天的事实后来改过，这篇是当时的版本。</div>' : '') +
      '<details class="facts"><summary>那天的事实</summary>' + factsHTML(d) + '</details>' +
      (opts.hideActions ? '' :
        '<div class="entry-actions">' +
        '<button class="mini" data-act="reroll" data-key="' + key + '">重写</button>' +
        '<button class="mini" data-act="share" data-key="' + key + '">存成图片</button>' +
        (d.diary ? '<button class="mini ghost" data-act="cleardiary" data-key="' + key + '">删掉这篇</button>' : '') +
        '</div>') +
      '</article>';
  }

  /* ---------------- 照片 / 视频 ---------------- */

  var objUrls = [];
  var urlCache = {};

  function posterId(m) {
    if (m.kind !== 'video') return m.id;
    return m.hasPoster ? m.id + '-p' : '';
  }

  function mediaStrip(key) {
    var media = S.mediaOf(key);
    var tiles = media.map(function (m) {
      var pid = posterId(m);
      return '<div class="mtile' + (m.kind === 'video' ? ' vid' : '') + '" data-act="media-open" data-mid="' + m.id + '">' +
        (pid ? '<img data-mid="' + pid + '" alt="">' : '<span class="mblank">视频</span>') +
        (m.kind === 'video' ? '<span class="mplay"></span>' : '') +
        '<button class="mtile-x" data-act="media-del" data-mid="' + m.id + '" data-key="' + key + '" aria-label="删除">×</button>' +
        '</div>';
    }).join('');
    return '<div class="mstrip">' + tiles +
      '<div class="madds">' +
      '<button class="madd" data-act="pick-photo" data-key="' + key + '"><span>＋</span>照片</button>' +
      '<button class="madd" data-act="pick-video" data-key="' + key + '"><span>＋</span>视频</button>' +
      '</div></div>' +
      (media.length ? '<div class="mtip">点开看原图；长视频建议剪短再传，它只存在这台设备上。</div>' : '') +
      '<input type="file" class="mfile" id="file-photo" data-key="' + key + '" accept="image/*" multiple hidden>' +
      '<input type="file" class="mfile" id="file-video" data-key="' + key + '" accept="video/*" multiple hidden>';
  }

  function mediaGrid(key) {
    var media = S.mediaOf(key);
    if (!media.length) return '';
    var cells = media.map(function (m) {
      var pid = posterId(m);
      return '<div class="mcell' + (m.kind === 'video' ? ' vid' : '') + '" data-act="media-open" data-mid="' + m.id + '">' +
        (pid ? '<img data-mid="' + pid + '" alt="">' : '<span class="mblank">视频</span>') +
        (m.kind === 'video' ? '<span class="mplay"></span>' : '') +
        '</div>';
    }).join('');
    return '<div class="mgrid n' + Math.min(media.length, 4) + '">' + cells + '</div>';
  }

  /* 把 IndexedDB 里的字节贴回 <img> 上（objectURL 每次渲染重建） */
  function hydrateMedia() {
    objUrls.forEach(function (u) { URL.revokeObjectURL(u); });
    objUrls = [];
    urlCache = {};
    var imgs = document.querySelectorAll('img[data-mid]');
    Array.prototype.forEach.call(imgs, function (img) {
      var id = img.getAttribute('data-mid');
      if (!id) return;
      if (urlCache[id]) { img.src = urlCache[id]; return; }
      PT.MEDIA.get(id).then(function (blob) {
        if (!blob) { img.classList.add('muted'); img.alt = '文件已丢失'; return; }
        var url = URL.createObjectURL(blob);
        urlCache[id] = url;
        objUrls.push(url);
        if (img.isConnected) img.src = url;
      });
    });
  }

  /* 头像：有照片用照片，没有就用画的那张 */
  function faceOf(pet, mood, opts) {
    if (pet && pet.photo) {
      return '<img class="face-photo" src="' + pet.photo + '" alt="">';
    }
    return PT.ART.face(pet.species, mood, opts || {});
  }

  /* 把选中的图片缩成 320×320 的方图，存成 dataURL（不放 IndexedDB，换设备导出时一起带走） */
  function shrinkAvatar(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        try {
          var S0 = 320;
          var w = img.naturalWidth, h = img.naturalHeight;
          var side = Math.min(w, h);
          var cv = document.createElement('canvas');
          cv.width = S0; cv.height = S0;
          var g = cv.getContext('2d');
          g.drawImage(img, (w - side) / 2, (h - side) / 2, side, side, 0, 0, S0, S0);
          URL.revokeObjectURL(url);
          resolve(cv.toDataURL('image/jpeg', 0.84));
        } catch (e) { URL.revokeObjectURL(url); reject(e); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('这张图打不开')); };
      img.src = url;
    });
  }

  /* 换头像的浮层：画的那 11/15 张任选，或者传一张自己的照片 */
  function openAvatar(isDraft) {
    var pet = isDraft ? null : S.active();
    if (!isDraft && !pet) return;
    var sp = isDraft ? ob.species : pet.species;
    var curBreed = isDraft ? ob.breedId : pet.breedId;
    var hasPhoto = !!(isDraft ? ob.photo : pet.photo);
    var breeds = PT.breedList(sp);

    var ov = document.createElement('div');
    ov.className = 'sheetwrap';
    ov.innerHTML =
      '<div class="sheetmask"></div>' +
      '<div class="avsheet">' +
      '<div class="avs-h"><b>' + (isDraft ? '给它挑个样子' : '换它的头像') + '</b>' +
      '<button class="avs-x" aria-label="关闭">×</button></div>' +
      '<p class="avs-tip">照片会裁成正方形 320×320 存下来，跟着「导出备份」一起走。</p>' +
      '<div class="avs-btns">' +
      '<button class="mini accent" data-a="photo">上传一张照片</button>' +
      (hasPhoto ? '<button class="mini ghost" data-a="drawn">用回画的</button>' : '') +
      '</div>' +
      '<div class="avs-sep"><span>或者，选一张画的</span></div>' +
      '<div class="breeds avs-grid">' +
      breeds.map(function (b) {
        return '<button class="breed' + (b.id === curBreed ? ' on' : '') + '" data-b="' + b.id + '">' +
          (b.custom ? '<span class="bdel" data-db="' + b.id + '" aria-label="删掉">×</span>' : '') +
          '<span class="bd-face">' + PT.ART.face(sp, 'calm', { tilt: 0, breed: b }) + '</span>' +
          '<span class="bd-name">' + esc(b.label) + '</span></button>';
      }).join('') +
      '<button class="breed addb" data-ab="1"><span class="bd-face">＋</span><span class="bd-name">自己加</span></button>' +
      '</div>' +
      '<input type="file" id="file-avatar" accept="image/*" hidden>' +
      '</div>';

    var inp = ov.querySelector('#file-avatar');

    function applyBreed(id) {
      if (isDraft) { harvestOb(); ob.breedId = id; ob.photo = ''; close(); render({}); return; }
      S.updatePet(pet.id, { breedId: id, breed: id, photo: '' });
      close(); render({}); toast('换好了');
    }

    function applyPhoto(dataUrl) {
      if (isDraft) { harvestOb(); ob.photo = dataUrl; close(); render({}); return; }
      S.updatePet(pet.id, { photo: dataUrl });
      close(); render({}); toast('换好了');
    }

    function clearPhoto() {
      if (isDraft) { harvestOb(); ob.photo = ''; close(); render({}); return; }
      S.updatePet(pet.id, { photo: '' });
      close(); render({}); toast('用回画的了');
    }

    ov.addEventListener('click', function (ev) {
      var t = ev.target;
      var dBtn = t.closest ? t.closest('[data-db]') : null;
      if (dBtn) {
        if (!confirm('删掉这个品种？已经用它建的宠物头像不会变。')) return;
        S.removeBreed(dBtn.dataset.db);
        close(); render({}); return;
      }
      var abBtn = t.closest ? t.closest('[data-ab]') : null;
      if (abBtn) { close(); openBreedSheet(isDraft); return; }
      var bBtn = t.closest ? t.closest('[data-b]') : null;
      if (bBtn) { applyBreed(bBtn.dataset.b); return; }
      var aBtn = t.closest ? t.closest('[data-a]') : null;
      if (aBtn) {
        if (aBtn.dataset.a === 'photo') { inp.click(); return; }
        clearPhoto();
        return;
      }
      if (t === ov || t.classList.contains('sheetmask') || t.classList.contains('avs-x')) close();
    });

    inp.addEventListener('change', function () {
      var f = inp.files && inp.files[0];
      if (!f) return;
      toast('正在处理照片…');
      shrinkAvatar(f).then(applyPhoto).catch(function (e) {
        toast(e && e.message ? e.message : '这张图用不了');
      });
      inp.value = '';
    });

    function close() { ov.remove(); }
    document.body.appendChild(ov);
  }
  /* 加一个自己的品种：起名字、挑毛色花纹耳朵，实时预览 */
  var brState = null;

  function openBreedSheet(isDraft) {
    brState = { draft: !!isDraft, pal: 0, pattern: '', ears: 'flop' };
    var sp = isDraft ? ob.species : ((S.active() || {}).species || 'cat');
    brState.species = sp;
    var isDog = sp === 'dog';
    var pals = PT.BREED_PALETTE;
    var pats = isDog ? PT.DOG_PATTERNS : PT.CAT_PATTERNS;
    var ears = PT.DOG_EARS;

    function breedNow() {
      var pl = pals[brState.pal];
      return {
        id: 'preview', species: sp, label: '',
        fur: pl.fur, furD: pl.furD, eye: pl.eye,
        pattern: brState.pattern, ears: isDog ? brState.ears : ''
      };
    }

    var ov = document.createElement('div');
    ov.className = 'sheetwrap';
    ov.innerHTML =
      '<div class="sheetmask"></div>' +
      '<div class="avsheet">' +
      '<div class="avs-h"><b>加一个自己的品种</b><button class="avs-x" aria-label="关闭">×</button></div>' +
      '<p class="avs-tip">起个名字、挑个毛色，它就会出现在品种里，以后随时能选。</p>' +
      '<div class="brprev"><span class="brpv-face">' + PT.ART.face(sp, 'calm', { tilt: 0, breed: breedNow() }) + '</span>' +
      '<i class="brpv-name">还没起名字</i></div>' +
      '<input id="br-name" class="input" maxlength="8" autocomplete="off" placeholder="比如：小土狗、布偶串串">' +
      '<div class="avs-sep"><span>毛色</span></div>' +
      '<div class="sws">' +
      pals.map(function (x, i) {
        return '<button class="sw' + (i === 0 ? ' on' : '') + '" data-pal="' + i + '" aria-label="毛色 ' + (i + 1) + '">' +
          '<i style="background:' + x.fur + ';border-color:' + x.furD + '"></i></button>';
      }).join('') +
      '</div>' +
      '<div class="avs-sep"><span>花纹</span></div>' +
      '<div class="segs">' +
      pats.map(function (x) {
        return '<button class="seg' + (x.id === '' ? ' on' : '') + '" data-pat="' + x.id + '">' + x.label + '</button>';
      }).join('') +
      '</div>' +
      (isDog
        ? '<div class="avs-sep"><span>耳朵</span></div>' +
          '<div class="segs">' +
          ears.map(function (x) {
            return '<button class="seg' + (x.id === 'flop' ? ' on' : '') + '" data-ear="' + x.id + '">' + x.label + '</button>';
          }).join('') +
          '</div>'
        : '') +
      '<div class="avs-btns" style="margin-top:16px">' +
      '<button class="mini accent" data-br="save">加进去</button></div>' +
      '</div>';

    var nameEl = ov.querySelector('#br-name');
    var prevEl = ov.querySelector('.brpv-face');
    var prevName = ov.querySelector('.brpv-name');

    function repaint() {
      prevEl.innerHTML = PT.ART.face(sp, 'calm', { tilt: 0, breed: breedNow() });
      var v = (nameEl.value || '').trim();
      prevName.textContent = v || '还没起名字';
    }

    ov.addEventListener('input', repaint);

    ov.addEventListener('click', function (ev) {
      var t = ev.target;
      var pel = t.closest ? t.closest('[data-pal]') : null;
      if (pel) {
        brState.pal = Number(pel.dataset.pal) || 0;
        ov.querySelectorAll('.sw').forEach(function (x) { x.classList.toggle('on', x === pel); });
        repaint(); return;
      }
      var pat = t.closest ? t.closest('[data-pat]') : null;
      if (pat) {
        brState.pattern = pat.dataset.pat || '';
        ov.querySelectorAll('[data-pat]').forEach(function (x) { x.classList.toggle('on', x === pat); });
        repaint(); return;
      }
      var ear = t.closest ? t.closest('[data-ear]') : null;
      if (ear) {
        brState.ears = ear.dataset.ear || 'flop';
        ov.querySelectorAll('[data-ear]').forEach(function (x) { x.classList.toggle('on', x === ear); });
        repaint(); return;
      }
      var save = t.closest ? t.closest('[data-br="save"]') : null;
      if (save) {
        var label = (nameEl.value || '').trim();
        if (!label) { toast('先给它起个名字'); nameEl.focus(); return; }
        var pl = PT.BREED_PALETTE[brState.pal];
        var made = S.addBreed({
          species: sp, label: label,
          fur: pl.fur, furD: pl.furD, eye: pl.eye,
          pattern: brState.pattern, ears: isDog ? brState.ears : ''
        });
        if (!made) { toast('这个名字已经有了'); return; }
        if (brState.draft) { harvestOb(); ob.breedId = made.id; ob.photo = ''; }
        else { var pet = S.active(); if (pet) S.updatePet(pet.id, { breedId: made.id, breed: made.id, photo: '' }); }
        close(); render({}); toast('加好了：' + made.label);
        return;
      }
      if (t === ov || t.classList.contains('sheetmask') || t.classList.contains('avs-x')) close();
    });

    function close() { ov.remove(); }
    document.body.appendChild(ov);
    nameEl.focus();
  }

  /* 备份码：整份数据压缩 + base64，方便复制粘贴到另一台设备
     1: 开头是 deflate 压缩过的，0: 开头是没压缩的老格式 */
  function b64FromBytes(bytes) {
    var bin = '', step = 0x8000;
    for (var i = 0; i < bytes.length; i += step) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
    }
    return btoa(bin);
  }

  function bytesFromB64(b64) {
    var bin = atob(b64), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function codeFromJson(json) {
    var bytes = new TextEncoder().encode(json);
    if (window.CompressionStream) {
      return new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw')))
        .arrayBuffer()
        .then(function (buf) { return '1:' + b64FromBytes(new Uint8Array(buf)); });
    }
    return Promise.resolve('0:' + btoa(unescape(encodeURIComponent(json))));
  }

  function jsonFromCode(code) {
    var raw = String(code || '').trim().replace(/\s+/g, '');
    if (raw.indexOf('1:') === 0) {
      if (!window.DecompressionStream) return Promise.reject(new Error('这个浏览器不支持'));
      var bytes = bytesFromB64(raw.slice(2));
      return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')))
        .arrayBuffer()
        .then(function (buf) { return new TextDecoder().decode(new Uint8Array(buf)); });
    }
    var plain = raw.indexOf('0:') === 0 ? raw.slice(2) : raw;
    return Promise.resolve(decodeURIComponent(escape(atob(plain))));
  }

  function openCodeSheet() {
    var ov = document.createElement('div');
    ov.className = 'sheetwrap';
    ov.innerHTML =
      '<div class="sheetmask"></div>' +
      '<div class="avsheet">' +
      '<div class="avs-h"><b>用备份码恢复</b><button class="avs-x" aria-label="关闭">×</button></div>' +
      '<p class="avs-tip">把旧手机上「复制备份码」得到的那串字符粘进来。会覆盖这台设备现在的记录。</p>' +
      '<textarea id="code-in" class="input note" rows="6" placeholder="粘贴备份码…"></textarea>' +
      '<div class="avs-btns" style="margin-top:14px"><button class="mini accent" data-code="go">恢复</button></div>' +
      '</div>';
    var ta = ov.querySelector('#code-in');
    ov.addEventListener('click', function (ev) {
      var t = ev.target;
      var go = t.closest ? t.closest('[data-code="go"]') : null;
      if (go) {
        if (!(ta.value || '').trim()) { toast('还没有粘贴'); return; }
        toast('正在恢复…');
        jsonFromCode(ta.value).then(function (json) {
          S.importJSON(json);
          ov.remove();
          render({});
          toast('恢复了 ' + S.pets().length + ' 只');
        }).catch(function () { toast('这串码读不出来'); });
        return;
      }
      if (t === ov || t.classList.contains('sheetmask') || t.classList.contains('avs-x')) ov.remove();
    });
    document.body.appendChild(ov);
    ta.focus();
  }

  function copyCode() {
    codeFromJson(S.exportJSON()).then(function (code) {
      var done = function (ok) {
        toast(ok ? '备份码已复制（' + code.length + ' 个字），粘到新手机就能恢复'
                 : '复制不了，码有 ' + code.length + ' 个字，可以手动全选复制');
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(function () { done(true); }, function () { done(false); });
        return;
      }
      var ta = document.createElement('textarea');
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(true); } catch (e) { done(false); }
      ta.remove();
    }).catch(function () { toast('这台设备上生成不了备份码'); });
  }

  function openMedia(mid) {    PT.MEDIA.get(mid).then(function (blob) {
      if (!blob) { toast('这个文件已经找不到了'); return; }
      var url = URL.createObjectURL(blob);
      var meta = null;
      Object.keys(S.get().days).forEach(function (pid) {
        Object.keys(S.get().days[pid] || {}).forEach(function (k) {
          var d = S.get().days[pid][k];
          (d && d.media ? d.media : []).forEach(function (m) { if (m.id === mid) meta = m; });
        });
      });
      var isVideo = meta ? meta.kind === 'video' : (blob.type || '').indexOf('video') === 0;
      var lb = document.createElement('div');
      lb.className = 'lb';
      lb.innerHTML = (isVideo
        ? '<video src="' + url + '" controls autoplay playsinline></video>'
        : '<img src="' + url + '" alt="">') +
        '<button class="lb-x" aria-label="关闭">×</button>';
      lb.addEventListener('click', function (ev) {
        if (ev.target === lb || ev.target.classList.contains('lb-x')) {
          if (isVideo) { var v = lb.querySelector('video'); if (v) v.pause(); }
          URL.revokeObjectURL(url);
          lb.remove();
        }
      });
      document.body.appendChild(lb);
    });
  }

  function ingest(files, kind, key) {
    var list = [].slice.call(files || []);
    if (!list.length) return;
    var ok = 0;
    toast(kind === 'photo' ? '正在处理照片…' : '正在读视频，稍等…');
    var chain = Promise.resolve();
    list.forEach(function (f) {
      chain = chain.then(function () {
        var p = kind === 'photo' ? PT.MEDIA.readPhoto(f) : PT.MEDIA.readVideo(f);
        return p.then(function (r) {
          var id = PT.MEDIA.uid();
          var meta = { id: id, kind: r.kind, w: r.w, h: r.h, dur: r.dur || 0, type: r.type, hasPoster: !!r.poster };
          return PT.MEDIA.put(id, r.blob).then(function () {
            if (r.poster) return PT.MEDIA.put(id + '-p', r.poster);
          }).then(function () {
            S.addMedia(key, meta);
            ok++;
          });
        }).catch(function (err) {
          toast((err && err.message) || '这个文件处理不了');
        });
      });
    });
    chain.then(function () {
      render({});
      if (ok) toast(ok + ' 个' + (kind === 'photo' ? '照片' : '视频') + '存好了');
    });
  }

  /* ---------------- 引导 ---------------- */

  var ob = { species: 'cat', breedId: 'orange', personality: 'tsundere', ptext: '', editing: false, mode: 'first', draft: null, photo: '' };

  /* 表单重渲染前先收一遍已输入的内容，别让用户白打 */
  /* 档案节点表单：换表情时先把已输入的内容收起来 */
  function harvestMs() {
    var l = document.getElementById('ms-label');
    var d = document.getElementById('ms-date');
    if (l) ms.label = l.value;
    if (d) ms.date = d.value;
  }

  function harvestOb() {
    var n = document.getElementById('ob-name');
    var b = document.getElementById('ob-bio');
    var h = document.getElementById('ob-home');
    var p = document.getElementById('ob-ptext');
    ob.draft = {
      name: n ? n.value : (ob.draft ? ob.draft.name : ''),
      bio: b ? b.value : (ob.draft ? ob.draft.bio : ''),
      home: h ? h.value : (ob.draft ? ob.draft.home : '')
    };
    if (p) ob.ptext = p.value;
  }

  function breedOfSpecies(sp, id) {
    var b = PT.breedById(sp, id);
    if (b) return b;
    return (PT.BREEDS[sp === 'dog' ? 'dog' : 'cat'] || [])[0] || null;
  }

  function renderOnboarding() {
    var prev = ob.editing ? S.active() : null;
    var adding = ob.mode === 'new';
    /* 只在「第一次进入这个表单」时用现有资料铺底，之后以用户的选择为准 */
    if (prev && ob.seedFor !== prev.id) {
      ob.seedFor = prev.id;
      ob.species = prev.species === 'dog' ? 'dog' : 'cat';
      ob.personality = prev.personality || 'tsundere';
      ob.ptext = prev.personalityText || '';
      if (prev.breedId) ob.breedId = prev.breedId;
      ob.photo = prev.photo || '';
      ob.draft = null;
    }
    if (!prev) ob.seedFor = '';
    var breed = breedOfSpecies(ob.species, ob.breedId);
    ob.breedId = breed ? breed.id : '';
    var hero = ob.photo
      ? '<img class="face-photo" src="' + ob.photo + '" alt="">'
      : PT.ART.face(ob.species, 'calm', { tilt: -2, breed: breed });
    var dval = function (k, fallback) {
      if (ob.draft) return ob.draft[k] || '';
      return fallback || '';
    };

    var breeds = PT.breedList(ob.species).map(function (b) {
      return '<button class="breed' + (ob.breedId === b.id ? ' on' : '') + '" data-act="ob-breed" data-id="' + b.id + '">' +
        (b.custom ? '<span class="bdel" data-act="breed-del" data-id="' + b.id + '" aria-label="删掉">×</span>' : '') +
        '<span class="bd-face">' + PT.ART.face(ob.species, 'calm', { tilt: 0, breed: b }) + '</span>' +
        '<span class="bd-name">' + esc(b.label) + '</span></button>';
    }).join('') +
      '<button class="breed addb" data-act="breed-new"><span class="bd-face">＋</span><span class="bd-name">自己加</span></button>' +
      '<button class="breed addb" data-act="avatar"><span class="bd-face"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7.5" width="18" height="12.5" rx="3"/><circle cx="12" cy="14" r="3.3"/><path d="M8.6 7.5l1.3-2.1h4.2l1.3 2.1"/></svg></span><span class="bd-name">用照片</span></button>';

    var isCustom = ob.personality === 'custom';
    var person = PERSON.map(function (p) {
      return '<button class="pchip' + (ob.personality === p.id ? ' on' : '') + '" data-act="ob-person" data-id="' + p.id + '">' +
        '<b>' + p.label + '</b><span>' + p.desc + '</span></button>';
    }).join('') +
      '<button class="pchip' + (isCustom ? ' on' : '') + '" data-act="ob-person" data-id="custom">' +
      '<b>自己写</b><span>用你的话形容它</span></button>';

    var title = prev ? '改一改它的资料' : adding ? '再添一只' : '它眼里的世界';
    var sub = prev ? '改完之后，它还是它。'
      : adding ? '它和别的家伙共用一个本子，<br>但说话的方式是它自己的。'
        : '你只记事实，它来写日记。<br>日子久了，你就有它的一生。';
    return '' +
      '<div class="onboard">' +
      '<button class="ob-art" data-act="avatar" aria-label="换头像">' + hero + '</button>' +
      '<button class="ob-hint" data-act="avatar">换个品种，或者用它的照片</button>' +
      '<h1 class="ob-title">' + title + '</h1>' +
      '<p class="ob-sub">' + sub + '</p>' +

      '<div class="ob-field"><label>它叫什么</label>' +
      '<input id="ob-name" class="input" maxlength="12" placeholder="麻薯" autocomplete="off" value="' + esc(dval('name', prev ? prev.name : '')) + '"></div>' +

      '<div class="ob-field"><label>它是</label>' +
      '<div class="species">' +
      '<button class="sp' + (ob.species === 'cat' ? ' on' : '') + '" data-act="ob-species" data-id="cat"><span>🐱</span>猫</button>' +
      '<button class="sp' + (ob.species === 'dog' ? ' on' : '') + '" data-act="ob-species" data-id="dog"><span>🐶</span>狗</button>' +
      '</div></div>' +

      '<div class="ob-field"><label>什么品种 <em>决定它长什么样</em></label>' +
      '<div class="breeds">' + breeds + '</div></div>' +

      '<div class="ob-field"><label>它的性格 <em>决定它写日记的语气</em></label>' +
      '<div class="pchips">' + person + '</div>' +
      (isCustom
        ? '<input id="ob-ptext" class="input" maxlength="24" autocomplete="off" placeholder="比如：胆小、怕打雷，只对家里人黏人" value="' + esc(ob.ptext) + '">'
        : '') +
      '</div>' +

      '<div class="ob-field"><label>一句话介绍它 <em>选填，会显示在它的页面</em></label>' +
      '<textarea id="ob-bio" class="input note" rows="2" maxlength="60" placeholder="一句话介绍它，比如：三岁半的橘猫，怕生。">' + esc(dval('bio', prev ? prev.bio : '')) + '</textarea></div>' +

      '<div class="ob-field"><label>它到家的日子 <em>选填，用来数「第几天」</em></label>' +
      '<input id="ob-home" class="input" type="date" value="' + esc(dval('home', prev ? prev.homeDate : '')) + '"></div>' +

      '<button class="primary big" data-act="ob-start">' + (prev ? '保存' : adding ? '添上它' : '开始记录') + '</button>' +
      (prev || adding
        ? '<button class="ghost link" data-act="' + (prev ? 'cancel-edit' : 'cancel-new') + '">算了，不改了</button>'
        : '<button class="ghost link" data-act="demo">先看看一只叫麻薯的猫的日记</button>') +
      '<p class="ob-foot">数据只存在这台设备上，不上传。</p>' +
      '</div>';
  }

  /* ---------------- 今天 ---------------- */

  function petSwitcher() {
    var pets = S.pets();
    if (pets.length < 2) return '';
    var cur = S.active() || {};
    return '<div class="petswitch">' + pets.map(function (p) {
      var on = p.id === cur.id;
      return '<button class="psw' + (on ? ' on' : '') + '" data-act="switch-pet" data-id="' + p.id + '">' +
        '<span class="psw-face">' + faceOf(p, on ? 'happy' : 'calm', { tilt: 0, breed: PT.breedOf(p) }) + '</span>' +
        '<span class="psw-name">' + esc(p.name) + '</span></button>';
    }).join('') + '</div>';
  }

  /* ---------------- 自定义事件 ---------------- */

  var composer = { open: false, icon: '⭐️' };


  /* ---------------- 主题 ---------------- */

  function curThemeId() { return S.setting('theme', 'paper'); }

  /* ---------------- 「发生了什么」的按钮：排序 / 收起 / 加回来 ---------------- */

  var chips = { edit: false };

  function allChipIds() {
    return PT.TYPES.map(function (t) { return t.id; })
      .concat(S.customTypes().map(function (t) { return t.id; }));
  }

  function chipIds() {
    var saved = S.setting('chips', null);
    if (!saved || !saved.length) return allChipIds();
    return saved.filter(function (id) { return PT.TYPE[id] || S.customType(id); });
  }

  function saveChips(ids) { S.setSetting('chips', ids); }

  function chipMeta(id) {
    var t = PT.TYPE[id];
    if (t) return { id: id, label: t.label, icon: t.icon, mine: false };
    var c = S.customType(id);
    return c ? { id: id, label: c.label, icon: c.icon, mine: true } : null;
  }

  function chipsHTML() {
    var html = chipIds().map(function (id) {
      var m = chipMeta(id);
      if (!m) return '';
      return '<button class="chip' + (m.mine ? ' mine' : '') + (chips.edit ? ' editing' : '') + '" data-act="add" data-id="' + id + '">' +
        '<span class="ci">' + esc(m.icon) + '</span>' + esc(m.label) +
        (chips.edit ? '<span class="cx" data-act="chip-hide" data-id="' + id + '">×</span>' : '') +
        '</button>';
    }).join('');
    if (!chips.edit) {
      html += '<button class="chip add' + (composer.open ? ' on' : '') + '" data-act="composer"><span class="ci">＋</span>自定义</button>';
    }
    return html;
  }

  function chipPalette() {
    var ids = chipIds();
    var hidden = allChipIds().filter(function (id) { return ids.indexOf(id) < 0; });
    if (!hidden.length) {
      return '<p class="cp-tip">按住一个按钮拖着走，就能换位置；点它右上角的 × 收起来，想加回来随时可以。</p>';
    }
    return '<div class="cp-label">收起来了，点一下加回来</div><div class="chips palette">' +
      hidden.map(function (id) {
        var m = chipMeta(id);
        return m ? '<button class="chip off" data-act="chip-show" data-id="' + id + '"><span class="ci">' + esc(m.icon) + '</span>' + esc(m.label) + '</button>' : '';
      }).join('') + '</div>';
  }

  function composerPanel(key) {
    var emo = PT.EMOJIS.map(function (e) {
      return '<button class="eo' + (composer.icon === e ? ' on' : '') + '" data-act="cp-emoji" data-id="' + e + '">' + e + '</button>';
    }).join('');
    var mine = S.customTypes().map(function (t) {
      return '<span class="mtag"><i>' + esc(t.icon) + '</i>' + esc(t.label) +
        '<button class="mtx" data-act="del-type" data-id="' + t.id + '" aria-label="删掉">×</button></span>';
    }).join('');
    return '<div class="composer">' +
      '<div class="cp-row">' +
      '<input id="cp-name" class="input" maxlength="8" autocomplete="off" placeholder="比如：打疫苗、剪指甲、刷牙">' +
      '<button class="mini primary" data-act="cp-add" data-key="' + key + '">加上</button>' +
      '</div>' +
      '<div class="cp-label">配个表情</div>' +
      '<div class="emoji-grid">' + emo + '</div>' +
      '<p class="cp-tip">加上之后，它就一直留在这排按钮里，点一下就记一条。</p>' +
      (mine ? '<div class="cp-label">我加的</div><div class="mtags">' + mine + '</div>' : '') +
      '</div>';
  }

  /* 事件显示信息：内置的看 PT.TYPE，自定义的看它自己的 name/icon */
  function typeInfo(e) {
    var t = PT.TYPE[e.type];
    if (t) return t;
    return { id: e.type, label: e.label || '自定义', icon: e.icon || '⭐️', custom: true };
  }

  function renderToday() {
    var key = PT.todayKey();
    var pet = S.active() || {};
    var d = S.day(key);
    var mo = d && d.diary ? moodObj(d.diary.mood) : moodObj('calm');
    var chipRow = chipsHTML();

    var evs = '';
    if (d && d.events.length) {
      evs = d.events.map(function (e) {
        var t = typeInfo(e);
        var ctl = '';
        if (t.num) {
          ctl = '<span class="numwrap"><input class="num" type="number" inputmode="decimal" step="' + (t.num.step || 1) + '" value="' + (e.num != null ? e.num : '') + '" data-act="num" data-id="' + e.id + '" data-key="' + key + '"><i>' + t.num.unit + '</i></span>';
        }
        if (t.opt) {
          ctl = '<select class="opt" data-act="opt" data-id="' + e.id + '" data-key="' + key + '">' +
            t.opt.map(function (o) { return '<option' + (e.opt === o ? ' selected' : '') + '>' + o + '</option>'; }).join('') +
            '</select>';
        }
        return '<div class="ev">' +
          '<span class="ev-ic">' + esc(t.icon) + '</span>' +
          '<span class="ev-name">' + esc(t.label) + '</span>' +
          ctl +
          '<button class="ev-x" data-act="del" data-id="' + e.id + '" data-key="' + key + '" aria-label="删除">×</button>' +
          '</div>';
      }).join('');
    } else {
      evs = '<div class="ev-empty">今天还是空白。上面点几下就行，不用写句子。</div>';
    }

    var hasEvents = d && d.events.length > 0;
    var genLabel = d && d.diary ? '重新写今天的日记' : '让它写今天的日记';

    var entry = '';
    if (writing === key) {
      entry = '<div class="entry card writing"><div class="dots"><i></i><i></i><i></i></div>' +
        '<p>它正在回想今天……</p></div>';
    } else if (d && d.diary) {
      entry = entryCard(key, { animate: true });
    }

    return '' +
      petSwitcher() +
      '<header class="head">' +
      '<div class="kicker">' + PT.fmtCN(key) + '</div>' +
      '<h1 class="page-title">第 <em>' + dayNo(key) + '</em> 天</h1>' +
      '</header>' +

      '<section class="hero card">' +
      '<div class="hero-face" style="color:' + mo.color + '">' + faceOf(pet, (d && d.diary ? d.diary.mood : 'calm'), { tilt: -2, breed: PT.breedOf(pet) }) + '</div>' +
      '<div class="hero-say">' +
      '<div class="bubble">' + esc(PT.WRITER.flavor(pet, key)) + '</div>' +
      '<div class="hero-meta">' + esc(pet.name) + (d && d.events.length ? ' · 今天记了 ' + d.events.length + ' 件事' : ' · 今天还没有记录') + '</div>' +
      '</div></section>' +

      '<section class="block">' +
      '<div class="sec-title row"><span>发生了什么</span><button class="via" data-act="chip-edit">' + (chips.edit ? '完成' : '编辑') + '</button></div>' +
      '<div class="chips' + (chips.edit ? ' editing' : '') + '">' + chipRow + '</div>' +
      (chips.edit ? chipPalette() : '') +
      (composer.open && !chips.edit ? composerPanel(key) : '') +
      '</section>' +

      '<section class="block">' +
      '<div class="sec-title">今天的事实 <span class="dim">' + (hasEvents ? d.events.length + ' 条' : '') + '</span></div>' +
      '<div class="evs">' + evs + '</div>' +
      '<textarea class="note" id="note" data-key="' + key + '" rows="2" maxlength="60" placeholder="想补一句就写在这儿（选填）">' + esc(d ? d.note : '') + '</textarea>' +
      '</section>' +

      '<section class="block">' +
      '<div class="sec-title">今天拍到的 <span class="dim">' + S.mediaOf(key).length + '</span></div>' +
      mediaStrip(key) +
      '</section>' +

      '<button class="primary big' + (hasEvents ? '' : ' disabled') + '" data-act="gen" data-key="' + key + '"' + (hasEvents ? '' : ' disabled') + '>' + genLabel + '</button>' +

      entry +
      '<p class="foot">事实是给你看的，日记是它写的。同一个日子，两种记忆。</p>';
  }

  /* ---------------- 日记本 ---------------- */

  function renderDiary() {
    var days = S.allDays().filter(function (d) { return d.diary; });
    if (!days.length) {
      return '' +
        petSwitcher() +
        '<header class="head"><div class="kicker">日记本</div><h1 class="page-title">还没有一页</h1></header>' +
        '<div class="empty card">' + PT.ART.paw(48, '#D8CBB6') +
        '<p>回到今天，记两笔。<br>它会替你写下来。</p>' +
        '<button class="mini" data-act="tab" data-id="today">去记一笔</button></div>';
    }
    var groups = [];
    var cur = null;
    days.forEach(function (d) {
      var m = d.date.slice(0, 7);
      if (!cur || cur.m !== m) { cur = { m: m, items: [] }; groups.push(cur); }
      cur.items.push(d);
    });
    var html = groups.map(function (g) {
      var y = g.m.slice(0, 4), mo = Number(g.m.slice(5, 7));
      var rows = g.items.map(function (d) {
        var mo2 = moodObj(d.diary.mood);
        var ex = d.diary.body.split('\n')[0] || '';
        if (ex.length > 26) ex = ex.slice(0, 26) + '…';
        return '<a class="row" data-act="entry" data-key="' + d.date + '">' +
          '<div class="row-date"><b>' + Number(d.date.slice(8, 10)) + '</b><span>周' + PT.weekShort[PT.parseDate(d.date).getDay()] + '</span></div>' +
          '<div class="row-main"><div class="row-title">' + esc(d.diary.title) + '</div><div class="row-ex">' + esc(ex) + '</div></div>' +
          '<div class="row-dot" style="background:' + mo2.color + '"></div>' +
          '</a>';
      }).join('');
      return '<div class="month"><div class="month-label">' + y + ' 年 ' + mo + ' 月</div>' + rows + '</div>';
    }).join('');

    var total = days.length;
    return '' +
      petSwitcher() +
      '<header class="head"><div class="kicker">日记本</div><h1 class="page-title">它写的 ' + total + ' 篇</h1>' +
      '<p class="sub">从 ' + PT.fmtShort(days[days.length - 1].date) + ' 到现在</p></header>' +
      html +
      '<p class="list-foot">' + PT.ART.paw(13, '#C9BBA5') + ' 它还在写</p>';
  }

  /* ---------------- 单篇 ---------------- */

  function renderEntryPage(key) {
    var d = S.day(key);
    var pet = S.active() || {};
    if (!d || !d.diary) {
      return '<div class="head"><h1 class="page-title">没有这一篇</h1></div><button class="mini" data-act="tab" data-id="diary">回日记本</button>';
    }
    var mo = moodObj(d.diary.mood);
    return '' +
      '<div class="backrow"><button class="back" data-act="tab" data-id="diary">← 日记本</button></div>' +
      '<header class="head">' +
      '<div class="kicker">' + PT.fmtCN(key) + '</div>' +
      '<h1 class="page-title">第 <em>' + dayNo(key) + '</em> 天</h1>' +
      '</header>' +
      '<div class="entry-hero">' +
      '<div class="eh-face" style="color:' + mo.color + '">' + faceOf(pet, d.diary.mood, { tilt: -3, breed: PT.breedOf(pet) }) + '</div>' +
      '<div class="eh-meta"><span class="mood" style="color:' + mo.color + ';border-color:' + mo.color + '33">' + mo.emoji + ' ' + mo.label + '</span>' +
      '<div class="eh-tags">' + (d.diary.tags || []).map(function (t) { return '<span>#' + esc(t) + '</span>'; }).join('') + '</div></div>' +
      '</div>' +
      entryCard(key, { animate: true });
  }

  /* ---------------- 它 ---------------- */

  function sparkline(pts) {
    if (!pts.length) return '<div class="dim small">还没称过。记两次以上就能看到曲线。</div>';
    if (pts.length === 1) {
      return '<div class="chart"><div class="chart-meta big"><span>' + pts[0].kg + ' kg</span><span>' + PT.fmtShort(pts[0].date) + ' · 再记一次就有曲线</span></div></div>';
    }
    var W = 280, H = 70, pad = 8;
    var vals = pts.map(function (p) { return p.kg; });
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    var span = max - min || 1;
    var step = (W - pad * 2) / (pts.length - 1);
    var path = pts.map(function (p, i) {
      var x = pad + step * i;
      var y = pad + (H - pad * 2) * (1 - (p.kg - min) / span);
      return (i ? 'L' : 'M') + (Math.round(x * 10) / 10) + ' ' + (Math.round(y * 10) / 10);
    }).join(' ');
    var last = pts[pts.length - 1], first = pts[0];
    return '<div class="chart"><svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">' +
      '<path d="' + path + '" fill="none" stroke="#C2613F" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg><div class="chart-meta"><span>' + first.kg + ' kg · ' + PT.fmtShort(first.date) + '</span><span>' + last.kg + ' kg · ' + PT.fmtShort(last.date) + '</span></div></div>';
  }

  function petRow(p, isOn) {
    return '<button class="petrow' + (isOn ? ' on' : '') + '" data-act="switch-pet" data-id="' + p.id + '">' +
      '<span class="pr-face">' + faceOf(p, isOn ? 'happy' : 'calm', { tilt: 0, breed: PT.breedOf(p) }) + '</span>' +
      '<span class="pr-main"><b>' + esc(p.name) + '</b><i>' + esc(p.bio || (p.species === 'dog' ? '一只狗' : '一只猫')) + '</i></span>' +
      (isOn ? '<span class="pr-on">现在看的是它</span>' : '') +
      '</button>';
  }

  /* 健康档案：洗澡、看病、疫苗、驱虫、吃药、吐，按时间倒序 */
  function healthTimeline(pet) {
    var rows = [];
    S.allDays(pet.id).forEach(function (d) {
      (d.events || []).forEach(function (e) {
        if (PT.HEALTH.indexOf(e.type) < 0) return;
        rows.push({ date: d.date, e: e, at: e.at || 0 });
      });
    });
    rows.sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : b.at - a.at; });
    if (!rows.length) {
      return '<div class="dim small">还没有记录。洗澡、看医生、打疫苗、驱虫都会自动记在这里。</div>';
    }
    var shown = rows.slice(0, 12);
    return '<ul class="health">' + shown.map(function (r) {
      var t = typeInfo(r.e);
      var extra = r.e.opt ? ' · ' + r.e.opt : '';
      var since = PT.daysBetween(r.date, PT.todayKey());
      return '<li><span class="hl-ic">' + esc(t.icon) + '</span>' +
        '<span class="hl-main"><b>' + esc(t.label) + esc(extra) + '</b>' +
        '<i>' + PT.fmtShort(r.date) + (since > 0 ? ' · ' + since + ' 天前' : ' · 今天') + '</i></span></li>';
    }).join('') + '</ul>' +
      (rows.length > shown.length ? '<p class="dim small">还有 ' + (rows.length - shown.length) + ' 条更早的。</p>' : '');
  }

  function renderPet() {
    var pet = S.active() || {};
    var st = S.stats();
    var w = S.weights();
    var all = S.pets();
    var pLabel = (PERSON.filter(function (p) { return p.id === pet.personality; })[0] || {}).label || '';
    if (pet.personality === 'custom') pLabel = pet.personalityText || '自己写的';
    else if (pet.personalityText) pLabel = pLabel + ' · ' + pet.personalityText;
    return '' +
      '<div class="pet-hero">' +
      '<button class="ph-face" data-act="avatar" aria-label="换头像">' + faceOf(pet, 'calm', { tilt: -2, breed: PT.breedOf(pet) }) + '</button>' +
      '<h1 class="ph-name">' + esc(pet.name) + '</h1>' +
      '<p class="ph-sub">' + esc(PT.breedLabel(pet) || (pet.species === 'dog' ? '狗' : '猫')) + (pLabel ? ' · ' + esc(pLabel) : '') + '</p>' +
      (pet.bio ? '<p class="ph-bio">' + esc(pet.bio) + '</p>' : '') +
      '</div>' +

      '<div class="stats card">' +
      '<div class="stat"><b>' + st.together + '</b><span>陪伴天数</span></div>' +
      '<div class="stat"><b>' + st.recordedDays + '</b><span>记录天数</span></div>' +
      '<div class="stat"><b>' + st.diaryCount + '</b><span>日记篇数</span></div>' +
      '</div>' +

      '<div class="block"><div class="sec-title">档案 <span class="dim">体重 / 疫苗 / 重要节点都在「档案」里</span></div><div class="card pad">' +
      '<div class="kv"><span>品种</span><b>' + esc(PT.breedLabel(pet) || '没填') + '</b></div>' +
      '<div class="kv"><span>生日</span><b>' + (pet.birthday ? PT.fmtYMD(pet.birthday) : '没填') + '</b></div>' +
      '<div class="kv"><span>到家</span><b>' + (pet.homeDate ? PT.fmtYMD(pet.homeDate) : '没填') + '</b></div>' +
      '<div class="kv"><span>性格</span><b>' + esc(pLabel) + '</b></div>' +
      '<button class="mini full accent" data-act="open-archive">打开档案</button>' +
      '<button class="mini full" data-act="edit-profile">改一改资料</button>' +
      '</div></div>' +

      '<div class="block"><div class="sec-title">家里的 ' + all.length + ' 只</div><div class="card pad pets">' +
      all.map(function (p) { return petRow(p, p.id === pet.id); }).join('') +
      '<button class="mini full dash" data-act="new-pet">＋ 再添一只</button>' +
      '</div></div>' +

      '<div class="block"><div class="sec-title">换一层纸 <span class="dim">样子，不影响内容</span></div><div class="card pad">' +
      '<div class="themes">' + PT.THEMES.map(function (t) {
        var on = curThemeId() === t.id;
        return '<button class="theme' + (on ? ' on' : '') + '" data-act="theme" data-id="' + t.id + '">' +
          '<span class="th-dots"><i style="background:' + t.vars['--paper'] + '"></i><i style="background:' + t.vars['--accent'] + '"></i></span>' +
          '<b>' + t.label + '</b><em>' + t.hint + '</em></button>';
      }).join('') + '</div>' +
      '</div></div>' +

      '<div class="block"><div class="sec-title">数据</div><div class="card pad">' +
      '<div class="actions">' +
      '<button class="mini" data-act="export">导出备份</button>' +
      '<button class="mini" data-act="import">导入</button>' +
      '<button class="mini" data-act="code-copy">复制备份码</button>' +
      '<button class="mini" data-act="code-paste">用备份码恢复</button>' +
      '<button class="mini ghost" data-act="redo">重新开始</button>' +
      '</div>' +
      '<p class="dim small">日记存在这台设备的浏览器里。换手机时：复制备份码，发到新手机上粘进去就行。照片和视频不跟着走。</p>' +
      '</div></div>' +

      '<p class="foot">「它眼里的世界」 · 一个只记事实、让它自己写的日记本</p>';
  }

  /* ---------------- 档案 ---------------- */

  var ms = { open: false, icon: '⭐️', label: '', date: '' };
  var MS_EMOJI = ['🎂', '🏠', '💉', '🏥', '💊', '🛁', '✂️', '🦷', '🐾', '⭐️', '🎉', '🧴', '🚑', '📌'];

  /* 档案表的编辑态：出生/到家/品种/体重 + 自定义字段 */
  var arc = { edit: false, birth: '', home: '', breed: '', weight: '', rows: [] };

  /* 出生到现在：几岁几个月 */
  function ageText(b) {
    if (!b) return '';
    var d = new Date(b + 'T00:00:00');
    if (isNaN(d.getTime())) return '';
    var now = new Date();
    var m = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
    if (now.getDate() < d.getDate()) m -= 1;
    if (m < 0) return '';
    var y = Math.floor(m / 12), mm = m % 12;
    if (y <= 0) return mm + ' 个月';
    return y + ' 岁' + (mm ? ' ' + mm + ' 个月' : '');
  }

  /* 到某一天时它多大 */
  function ageAt(b, date) {
    if (!b || !date) return '';
    var d = new Date(b + 'T00:00:00'), t = new Date(date + 'T00:00:00');
    if (isNaN(d.getTime()) || isNaN(t.getTime())) return '';
    var m = (t.getFullYear() - d.getFullYear()) * 12 + (t.getMonth() - d.getMonth());
    if (t.getDate() < d.getDate()) m -= 1;
    if (m < 0) return '';
    var y = Math.floor(m / 12), mm = m % 12;
    if (y <= 0) return mm ? mm + ' 个月' : '刚出生';
    return y + ' 岁' + (mm ? ' ' + mm + ' 个月' : '');
  }

  function countType(pet, type) {
    var n = 0;
    S.allDays(pet.id).forEach(function (d) {
      (d.events || []).forEach(function (e) { if (e.type === type) n++; });
    });
    return n;
  }

  function lastType(pet, type) {
    var best = null;
    S.allDays(pet.id).forEach(function (d) {
      (d.events || []).forEach(function (e) { if (e.type === type && (!best || d.date > best)) best = d.date; });
    });
    return best;
  }

  /* 档案条目：手记的节点 + 出生/到家 + 日记里自动捞出来的健康事件 */
  function archiveItems(pet) {
    var out = [], seen = {};
    function push(it) {
      var k = it.date + '|' + it.label;
      if (!it.date || seen[k]) return;
      seen[k] = 1;
      out.push(it);
    }
    (pet.milestones || []).forEach(function (m) {
      push({ date: m.date, icon: m.icon || '⭐️', label: m.label || '节点', kind: 'mine', id: m.id });
    });
    if (pet.birthday) push({ date: pet.birthday, icon: '🎂', label: '出生', kind: 'fixed' });
    if (pet.homeDate) push({ date: pet.homeDate, icon: '🏠', label: '到家', kind: 'fixed' });
    S.allDays(pet.id).forEach(function (d) {
      (d.events || []).forEach(function (e) {
        if (PT.HEALTH.indexOf(e.type) < 0) return;
        var t = typeInfo(e);
        push({ date: d.date, icon: t.icon, label: t.label + (e.opt ? ' · ' + e.opt : ''), kind: 'auto' });
      });
    });
    out.sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
    return out;
  }

  function msPanel() {
    return '<div class="composer">' +
      '<div class="cp-row">' +
      '<input id="ms-label" class="input" maxlength="14" placeholder="比如：绝育手术" value="' + esc(ms.label) + '">' +
      '<button class="mini primary" data-act="ms-add">加上</button>' +
      '</div>' +
      '<div class="cp-row">' +
      '<input id="ms-date" class="input" type="date" value="' + (ms.date || PT.todayKey()) + '">' +
      '</div>' +
      '<div class="cp-label">配个表情</div>' +
      '<div class="emoji-grid compact">' + MS_EMOJI.map(function (e) {
        return '<button class="eo' + (ms.icon === e ? ' on' : '') + '" data-act="ms-icon" data-id="' + e + '">' + e + '</button>';
      }).join('') + '</div>' +
      '<div class="cp-tip">日期可以填过去。加完会按年份排进上面的表。</div>' +
      '</div>';
  }

  /* ---------- 档案表的编辑 ---------- */

  function arcEnter() {
    var pet = S.active() || {};
    var w = S.weights();
    arc.edit = true;
    arc.birth = pet.birthday || '';
    arc.home = pet.homeDate || '';
    arc.breed = pet.breedId || '';
    arc.weight = w.length ? String(w[w.length - 1].kg) : '';
    arc.rows = S.fields().map(function (f) { return { id: f.id, label: f.label, value: f.value }; });
    render({});
  }

  function harvestArc() {
    var b = document.getElementById('arc-birth');
    var h = document.getElementById('arc-home');
    var br = document.getElementById('arc-breed');
    var wg = document.getElementById('arc-weight');
    if (b) arc.birth = b.value;
    if (h) arc.home = h.value;
    if (br) arc.breed = br.value;
    if (wg) arc.weight = wg.value;
    arc.rows.forEach(function (r) {
      var l = document.getElementById('arc-l-' + r.id);
      var v = document.getElementById('arc-v-' + r.id);
      if (l) r.label = l.value;
      if (v) r.value = v.value;
    });
  }

  function arcSave() {
    var pet = S.active();
    if (!pet) return;
    harvestArc();
    var patch = { birthday: arc.birth || '', homeDate: arc.home || '', breedId: arc.breed || '' };
    S.updatePet(pet.id, patch);

    /* 自定义字段：整组替换，空行丢掉；新行补 id */
    var list = [];
    arc.rows.forEach(function (r) {
      var label = String(r.label || '').trim().slice(0, 12);
      var value = String(r.value == null ? '' : r.value).trim().slice(0, 60);
      if (!label && !value) return;
      if (!label) label = '备注';
      list.push({ id: r.id || ('f' + S.uid()), label: label, value: value });
    });
    S.updatePet(pet.id, { fields: list });

    /* 体重：改了就当成今天又称了一次 */
    var kg = parseFloat(arc.weight);
    var w = S.weights();
    var now = w.length ? w[w.length - 1].kg : null;
    if (!isNaN(kg) && kg > 0 && kg !== now) {
      var key = PT.todayKey();
      var d = S.day(key);
      var ev = d && (d.events || []).filter(function (e) { return e.type === 'weight'; })[0];
      if (ev) S.updateEvent(key, ev.id, { num: kg });
      else S.addEvent(key, 'weight', { num: kg });
    }

    arc.edit = false;
    arc.rows = [];
    render({});
  }

  function fieldsHTML(pet) {
    var rows = S.fields(pet.id).map(function (f) {
      return '<div class="kv"><span>' + esc(f.label) + '</span><b>' + esc(f.value || '—') + '</b></div>';
    }).join('');

    if (!arc.edit) {
      return '<div class="sec-title row"><span>档案表</span>' +
        '<button class="via" data-act="arc-edit">编辑</button></div>' +
        '<div class="card pad">' +
        '<div class="kv"><span>出生</span><b>' + (pet.birthday ? PT.fmtYMD(pet.birthday) : '没填') + '</b></div>' +
        '<div class="kv"><span>到家</span><b>' + (pet.homeDate ? PT.fmtYMD(pet.homeDate) : '没填') + '</b></div>' +
        '<div class="kv"><span>品种</span><b>' + esc(PT.breedLabel(pet) || '没填') + '</b></div>' +
        '<div class="kv"><span>现在体重</span><b>' + weightText(pet) + '</b></div>' +
        '<div class="kv"><span>疫苗</span><b>' + typeCountText(pet, 'vaccine') + '</b></div>' +
        '<div class="kv"><span>驱虫</span><b>' + typeCountText(pet, 'deworm') + '</b></div>' +
        rows +
        (S.fields(pet.id).length ? '' : '<button class="mini full dash" data-act="arc-edit">＋ 加一项自己的</button>') +
        '</div>';
    }

    var breeds = PT.breedList(pet.species).map(function (b) {
      return '<option value="' + b.id + '"' + (arc.breed === b.id ? ' selected' : '') + '>' + esc(b.label) + '</option>';
    }).join('');
    var editRows = arc.rows.map(function (r) {
      return '<div class="kv edit">' +
        '<input id="arc-l-' + r.id + '" class="input fl" maxlength="12" placeholder="名称" value="' + esc(r.label) + '">' +
        '<input id="arc-v-' + r.id + '" class="input fv" maxlength="60" placeholder="内容" value="' + esc(r.value) + '">' +
        '<button class="tl-x" data-act="arc-del-field" data-id="' + r.id + '" aria-label="删掉">×</button>' +
        '</div>';
    }).join('');

    return '<div class="sec-title row"><span>档案表</span><span class="dim small">填完点保存</span></div>' +
      '<div class="card pad">' +
      '<div class="kv edit"><span>出生</span><input id="arc-birth" class="input fv" type="date" value="' + esc(arc.birth) + '"></div>' +
      '<div class="kv edit"><span>到家</span><input id="arc-home" class="input fv" type="date" value="' + esc(arc.home) + '"></div>' +
      '<div class="kv edit"><span>品种</span><select id="arc-breed" class="input fv">' + breeds + '</select></div>' +
      '<div class="kv edit"><span>体重</span><input id="arc-weight" class="input fv" type="number" step="0.1" min="0.2" max="60" placeholder="kg" value="' + esc(arc.weight) + '"></div>' +
      '<div class="kv"><span>疫苗</span><b>' + typeCountText(pet, 'vaccine') + '</b></div>' +
      '<div class="kv"><span>驱虫</span><b>' + typeCountText(pet, 'deworm') + '</b></div>' +
      editRows +
      '<button class="mini full dash" data-act="arc-add-field">＋ 加一项</button>' +
      '<div class="arc-save">' +
      '<button class="mini accent" data-act="arc-save">保存</button>' +
      '<button class="mini ghost" data-act="arc-cancel">取消</button>' +
      '</div>' +
      '<div class="cp-tip">体重改了会当成今天又称了一次。疫苗和驱虫是从「今天」里的记录数出来的。</div>' +
      '</div>';
  }

  function weightText(pet) {
    var w = S.weights();
    if (!w.length) return '还没称过';
    var last = w[w.length - 1];
    return last.kg + ' kg <i>' + PT.fmtShort(last.date) + '</i>';
  }

  function typeCountText(pet, type) {
    var n = countType(pet, type);
    if (!n) return '还没记';
    return n + ' 次 <i>最近 ' + PT.fmtShort(lastType(pet, type)) + '</i>';
  }

  function renderArchive() {
    var pet = S.active() || {};
    var items = archiveItems(pet);
    var w = S.weights();
    var st = S.stats();

    var byYear = {};
    items.forEach(function (it) {
      var y = it.date.slice(0, 4);
      (byYear[y] = byYear[y] || []).push(it);
    });
    var timeline = Object.keys(byYear).sort().reverse().map(function (y) {
      return '<div class="tl-year">' + y + ' 年</div>' +
        '<ul class="tl">' + byYear[y].map(function (it) {
          return '<li class="tl-i ' + it.kind + '">' +
            '<span class="tl-d">' + PT.fmtShort(it.date) + '</span>' +
            '<span class="tl-ic">' + esc(it.icon) + '</span>' +
            '<span class="tl-t">' + esc(it.label) + '</span>' +
            '<span class="tl-age">' + esc(it.kind === 'auto' ? '' : ageAt(pet.birthday, it.date)) + '</span>' +
            '<span class="tl-x-w">' + (it.kind === 'mine' ? '<button class="tl-x" data-act="ms-del" data-id="' + it.id + '" aria-label="删掉">×</button>' : '') + '</span>' +
            '</li>';
        }).join('') + '</ul>';
    }).join('');

    if (!items.length) {
      timeline = '<div class="dim small">还没有节点。第一次打疫苗、绝育、搬家，都可以记在这里。</div>';
    }

    return '' +
      '<div class="arc-head">' +
      '<button class="arc-face" data-act="avatar" aria-label="换头像">' + faceOf(pet, 'calm', { tilt: -2, breed: PT.breedOf(pet) }) + '</button>' +
      '<div class="arc-id">' +
      '<h1>' + esc(pet.name) + '</h1>' +
      '<p>' + esc(PT.breedLabel(pet) || (pet.species === 'dog' ? '狗' : '猫')) +
      (pet.birthday ? ' · ' + esc(ageText(pet.birthday)) : '') +
      ' · 陪伴 ' + st.together + ' 天</p>' +
      '</div></div>' +

      '<div class="block">' + fieldsHTML(pet) + '</div>' +

      '<div class="block"><div class="sec-title">重要节点 <span class="dim">按年份</span></div>' +
      '<div class="card pad">' + timeline +
      (ms.open ? msPanel() : '<button class="mini full dash" data-act="ms-new">＋ 记一个节点</button>') +
      '</div></div>' +

      '<div class="block"><div class="sec-title">体重走势</div>' +
      '<div class="card pad">' + sparkline(w) + '</div></div>' +

      '<p class="foot">它的一生，按日期排好</p>';
  }

  /* ---------------- 主渲染 ---------------- */

  function render(opts) {
    opts = opts || {};
    PT.applyTheme(curThemeId());
    var y = window.scrollY;
    if (!S.pets().length || view.name === 'onboard') {
      if (view.name === 'onboard' && S.pets().length && !ob.editing && ob.mode !== 'new') {
        /* 深链进 #/onboard：当作改资料 */
        ob.editing = true;
      }
      $app.innerHTML = renderOnboarding();
      document.body.classList.add('no-tabs');
      window.scrollTo(0, 0);
      return;
    }
    var body = '';
    if (view.name === 'today') body = renderToday();
    else if (view.name === 'diary') body = renderDiary();
    else if (view.name === 'entry') body = renderEntryPage(view.key);
    else if (view.name === 'archive') body = renderArchive();
    else if (view.name === 'pet') body = renderPet();

    var tabs = ['today', 'diary', 'archive', 'pet'].map(function (id) {
      var label = { today: '今天', diary: '日记', archive: '档案', pet: '它' }[id];
      var ico = {
        today: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.2"/><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6"/></svg>',
        diary: '<svg viewBox="0 0 24 24"><path d="M5 4.5h11a2 2 0 0 1 2 2V20H7a2 2 0 0 1-2-2V4.5z"/><path d="M8 8h7M8 12h7M8 16h4"/></svg>',
        archive: '<svg viewBox="0 0 24 24"><path d="M6 3.5h9l3 3V21H6z"/><path d="M8.5 9h7M8.5 12.5h7M8.5 16h4"/></svg>',
        pet: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="4"/><circle cx="6.5" cy="8" r="1.6" fill="currentColor"/><circle cx="17.5" cy="8" r="1.6" fill="currentColor"/><circle cx="10" cy="5.4" r="1.3" fill="currentColor"/><circle cx="14" cy="5.4" r="1.3" fill="currentColor"/></svg>'
      }[id];
      var on = view.name === id || (view.name === 'entry' && id === 'diary');
      return '<button class="tab' + (on ? ' on' : '') + '" data-act="tab" data-id="' + id + '">' + ico + '<span>' + label + '</span></button>';
    }).join('');

    $app.innerHTML = body +
      (view.name === 'entry' ? '' : '') +
      '<nav class="tabs">' + tabs + '</nav>';
    document.body.classList.toggle('no-tabs', view.name === 'entry');
    if (opts.top) window.scrollTo(0, 0); else window.scrollTo(0, y);
    hydrateMedia();
  }

  /* ---------------- 行为 ---------------- */

  function go(name, key) {
    view = { name: name, key: key || null };
    var h = '#/' + name + (key ? '/' + key : '');
    lastHash = h;
    if (location.hash !== h) {
      try { history.replaceState(null, '', h); } catch (e) { }
    }
    render({ top: true });
  }

  var lastHash = '';

  function parseHash() {
    var h = (location.hash || '').replace(/^#\/?/, '');
    if (!h || h === 'demo') return null;
    var p = h.split('/');
    if (p[0] === 'entry') {
      var k = p[1];
      var d = k && S.day(k);
      if (!d || !d.diary) return { name: 'diary', key: null };
      return { name: 'entry', key: k };
    }
    if (['today', 'diary', 'archive', 'pet', 'onboard'].indexOf(p[0]) >= 0) {
      if (p[0] === 'onboard' && p[1] === 'new') { ob.mode = 'new'; ob.editing = false; }
      return { name: p[0], key: null };
    }
    return null;
  }

  window.addEventListener('hashchange', function () {
    if (location.hash === lastHash) return;
    var v = parseHash();
    if (!v) return;
    view = v;
    lastHash = location.hash;
    render({ top: true });
  });

  function startWriting(key) {
    writing = key;
    render();
    setTimeout(function () {
      S.generate(key, 0);
      writing = null;
      render();
      var el = document.getElementById('entry-' + key);
      if (el) setTimeout(function () { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 60);
      toast('它写完了。');
    }, 1200);
  }

  function download(name, text, type) {
    var blob = new Blob([text], { type: type || 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }

  /* 把一篇日记画成图片 */
  function buildCard(key) {
    var d = S.day(key), pet = S.active() || {};
    if (!d || !d.diary) return null;
    var W = 1080, H = 1440;
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#F5EEE3';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(58,50,44,.12)';
    ctx.lineWidth = 2;
    ctx.strokeRect(56, 56, W - 112, H - 112);

    var pad = 110, maxW = W - pad * 2;
    ctx.fillStyle = '#8C8074';
    ctx.font = '26px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('它眼里的世界', pad, 150);

    ctx.fillStyle = '#3A322C';
    ctx.font = '30px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(PT.fmtCN(key), W - pad, 150);
    ctx.textAlign = 'left';

    // 第 N 天
    ctx.fillStyle = '#C2613F';
    ctx.font = '28px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillText('第 ' + dayNo(key) + ' 天', pad, 236);

    // 标题
    ctx.fillStyle = '#3A322C';
    ctx.font = '64px "Songti SC","SimSun",serif';
    var titleLines = wrapText(ctx, d.diary.title, pad, 0, maxW, 82);
    titleLines.forEach(function (line, i) { ctx.fillText(line, pad, 330 + i * 82); });

    // 正文：段与段之间空一行；放不下就一档档缩字号，最后才截断
    var topY = 330 + titleLines.length * 82 + 26;
    var bottom = H - 210;
    var paras = d.diary.body.split('\n').filter(function (s) { return String(s).trim(); });
    var sizes = [[36, 58], [33, 54], [30, 50], [28, 46], [26, 43]];
    var chosen = null;
    for (var si = 0; si < sizes.length && !chosen; si++) {
      var sz = sizes[si][0], lh = sizes[si][1];
      ctx.font = sz + 'px "Kaiti SC","KaiTi","SimSun",serif';
      var ls = [];
      paras.forEach(function (p, pi) {
        if (pi) ls.push('');
        ls = ls.concat(wrapText(ctx, p, pad, 0, maxW, lh));
      });
      if (ls.length * lh <= bottom - topY) chosen = { size: sz, lh: lh, lines: ls };
    }
    if (!chosen) {
      var s2 = sizes[sizes.length - 1];
      ctx.font = s2[0] + 'px "Kaiti SC","KaiTi","SimSun",serif';
      var ls2 = [];
      paras.forEach(function (p, pi) {
        if (pi) ls2.push('');
        ls2 = ls2.concat(wrapText(ctx, p, pad, 0, maxW, s2[1]));
      });
      ls2 = ls2.slice(0, Math.floor((bottom - topY) / s2[1]));
      if (ls2.length) ls2[ls2.length - 1] = ls2[ls2.length - 1].replace(/.$/, '…');
      chosen = { size: s2[0], lh: s2[1], lines: ls2 };
    }
    ctx.fillStyle = '#3A322C';
    ctx.font = chosen.size + 'px "Kaiti SC","KaiTi","SimSun",serif';
    chosen.lines.forEach(function (line, i) {
      if (!line) return;
      ctx.fillText(line, pad, topY + (i + 1) * chosen.lh);
    });

    ctx.strokeStyle = 'rgba(58,50,44,.18)';
    ctx.beginPath();
    ctx.moveTo(pad, H - 170);
    ctx.lineTo(W - pad, H - 170);
    ctx.stroke();

    ctx.fillStyle = '#8C8074';
    ctx.font = '28px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillText(pet.name + ' · ' + d.diary.title, pad, H - 118);
    ctx.textAlign = 'right';
    ctx.fillText(moodObj(d.diary.mood).emoji + ' ' + moodObj(d.diary.mood).label, W - pad, H - 118);

    return c;
  }

  function saveImage(key) {
    var c = buildCard(key);
    if (!c) return;
    c.toBlob(function (blob) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '它眼里的世界-' + key + '.png';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 3000);
    }, 'image/png');
  }

  function wrapText(ctx, text, x, y, maxW, lh) {
    var out = [];
    String(text).split('\n').forEach(function (para) {
      var line = '';
      for (var i = 0; i < para.length; i++) {
        var test = line + para[i];
        if (ctx.measureText(test).width > maxW && line) {
          out.push(line);
          line = para[i];
        } else {
          line = test;
        }
      }
      out.push(line);
    });
    return out;
  }

  /* ---------------- 事件绑定 ---------------- */


  /* 编辑态：按住一个按钮拖着走 */
  var chipDrag = { el: null };

  document.addEventListener('pointerdown', function (e) {
    if (!chips.edit) return;
    if (e.target.closest('[data-act="chip-hide"]')) return;
    var c = e.target.closest('.chip[data-act="add"]');
    if (!c) return;
    chipDrag.el = c;
    c.classList.add('lift');
    c.style.pointerEvents = 'none';
    if (e.cancelable) e.preventDefault();
  });

  document.addEventListener('pointermove', function (e) {
    if (!chipDrag.el) return;
    var box = document.elementFromPoint(e.clientX, e.clientY);
    var t = box && box.closest ? box.closest('.chip[data-act="add"]') : null;
    if (!t || t === chipDrag.el) return;
    var r = t.getBoundingClientRect();
    var after = e.clientX > r.left + r.width / 2;
    t.parentNode.insertBefore(chipDrag.el, after ? t.nextSibling : t);
  });

  document.addEventListener('pointerup', function () {
    if (!chipDrag.el) return;
    var el = chipDrag.el;
    chipDrag.el = null;
    el.classList.remove('lift');
    el.style.pointerEvents = '';
    var box = el.parentNode;
    var ids = Array.prototype.map.call(box.querySelectorAll('.chip[data-act="add"]'), function (c) { return c.dataset.id; });
    saveChips(ids);
    render({});
  });

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el) return;
    var act = el.dataset.act;
    var id = el.dataset.id;
    var key = el.dataset.key || PT.todayKey();

    if (act === 'tab') { go(id); return; }

    if (act === 'pick-photo' || act === 'pick-video') {
      var inp = document.getElementById(act === 'pick-photo' ? 'file-photo' : 'file-video');
      if (inp) inp.click();
      return;
    }
    if (act === 'media-open') { openMedia(el.dataset.mid); return; }
    if (act === 'media-del') {
      var mid = el.dataset.mid;
      S.removeMedia(key, mid);
      PT.MEDIA.del(mid);
      PT.MEDIA.del(mid + '-p');
      render({});
      toast('删掉了');
      return;
    }

    if (act === 'ob-species') {
      harvestOb();
      ob.species = id;
      if (!PT.breedById(id, ob.breedId)) ob.breedId = (PT.breedList(id)[0] || {}).id || '';
      render({});
      document.querySelectorAll('.sp').forEach(function (b) { b.classList.toggle('on', b.dataset.id === id); });
      return;
    }
    if (act === 'ob-breed') {
      harvestOb();
      ob.breedId = id;
      var bd = breedOfSpecies(ob.species, id);
      var artB = document.querySelector('.ob-art');
      if (artB) artB.innerHTML = PT.ART.face(ob.species, 'calm', { tilt: -2, breed: bd });
      document.querySelectorAll('.breed').forEach(function (b) { b.classList.toggle('on', b.dataset.id === id); });
      return;
    }
    if (act === 'ob-person') {
      harvestOb();
      ob.personality = id;
      render({});
      return;
    }
    if (act === 'ob-start') {
      var name = (document.getElementById('ob-name').value || '').trim() || '麻薯';
      var home = document.getElementById('ob-home').value || '';
      var bioEl = document.getElementById('ob-bio');
      var bio = ((bioEl && bioEl.value) || '').trim().slice(0, 60);
      var ptEl = document.getElementById('ob-ptext');
      var ptext = ((ptEl && ptEl.value) || ob.ptext || '').trim().slice(0, 24);
      var cur = S.active();
      var bd2 = breedOfSpecies(ob.species, ob.breedId);
      var patch = {
        name: name,
        species: ob.species,
        breed: bd2 ? bd2.label : (ob.species === 'dog' ? '狗' : '猫'),
        breedId: bd2 ? bd2.id : '',
        personality: ob.personality === 'custom' ? 'custom' : ob.personality,
        personalityText: ob.personality === 'custom' ? (ptext || '有点自己的脾气') : '',
        bio: bio,
        birthday: cur ? (cur.birthday || '') : '',
        homeDate: home,
        createdAt: cur && cur.createdAt ? cur.createdAt : new Date().toISOString(),
        photo: ob.photo || ''
      };
      ob.draft = null;
      if (ob.editing && cur) {
        S.updatePet(cur.id, patch);
        ob.editing = false;
        ob.mode = 'first';
        go('pet');
        setTimeout(function () { toast('改好了。'); }, 200);
        return;
      }
      var added = S.addPet(patch);
      ob.mode = 'first';
      go(ob.editing ? 'pet' : 'today');
      setTimeout(function () { toast(added.name + ' 来了。'); }, 200);
      return;
    }

    if (act === 'composer') {
      composer.open = !composer.open;
      render({});
      if (composer.open) {
        var ci = document.getElementById('cp-name');
        if (ci) ci.focus();
      }
      return;
    }
    if (act === 'cp-emoji') {
      composer.icon = id;
      document.querySelectorAll('.emoji-grid .eo').forEach(function (b) {
        b.classList.toggle('on', b.dataset.id === id);
      });
      return;
    }
    if (act === 'cp-add') {
      var nmEl = document.getElementById('cp-name');
      var lbl = ((nmEl && nmEl.value) || '').trim();
      if (!lbl) { toast('给它起个名字'); if (nmEl) nmEl.focus(); return; }
      var nt = S.addCustomType(lbl, composer.icon);
      if (!nt) { toast('这个名字不行，换一个'); return; }
      var withNew = chipIds();
    if (withNew.indexOf(nt.id) < 0) { withNew.push(nt.id); saveChips(withNew); }
    S.addEvent(key || PT.todayKey(), nt.id, {});
      composer.open = false;
      render({});
      toast('「' + nt.label + '」记下了');
      return;
    }
    if (act === 'del-type') {
      var dt = S.customType(id);
      if (!dt) return;
      if (!window.confirm('不再用「' + dt.label + '」了？已经记下的日子不受影响。')) return;
      S.removeCustomType(id);
      render({});
      toast('删掉了');
      return;
    }

    if (act === 'switch-pet') {
      var pid = el.dataset.id;
      var curPet = S.active();
      if (pid && (!curPet || pid !== curPet.id)) {
        S.setActive(pid);
        writing = null;
        ob.draft = null;
        render({ top: true });
      }
      return;
    }

    if (act === 'new-pet') {
      ob.editing = false;
      ob.mode = 'new';
      ob.species = 'cat';
      ob.personality = 'tsundere';
      ob.breedId = 'orange';
      ob.ptext = '';
      ob.draft = null;
      go('onboard');
      return;
    }

    if (act === 'open-archive') { go('archive'); return; }

    if (act === 'ms-new') {
      ms.open = true; ms.icon = '⭐️'; ms.label = ''; ms.date = '';
      render();
      return;
    }

    if (act === 'ms-icon') {
      harvestMs();
      ms.icon = el.dataset.id;
      render();
      return;
    }

    if (act === 'ms-add') {
      var lb = ((document.getElementById('ms-label') || {}).value || '').trim();
      var dt = (document.getElementById('ms-date') || {}).value || PT.todayKey();
      if (!lb) { toast('先给它起个名字'); return; }
      S.addMilestone(dt, lb, ms.icon);
      ms.open = false; ms.label = ''; ms.date = '';
      render();
      toast('记下了');
      return;
    }

    if (act === 'ms-del') {
      if (!confirm('删掉这条节点？')) return;
      S.removeMilestone(el.dataset.id);
      render();
      toast('删掉了');
      return;
    }

    if (act === 'arc-edit') { arcEnter(); return; }

    if (act === 'arc-cancel') {
      arc.edit = false;
      arc.rows = [];
      render();
      return;
    }

    if (act === 'arc-save') { arcSave(); toast('档案已更新'); return; }

    if (act === 'arc-add-field') {
      harvestArc();
      arc.rows.push({ id: 'n' + Date.now().toString(36), label: '', value: '' });
      render();
      var boxes = document.querySelectorAll('#arc-l-' + arc.rows[arc.rows.length - 1].id);
      if (boxes[0]) boxes[0].focus();
      return;
    }

    if (act === 'arc-del-field') {
      harvestArc();
      arc.rows = arc.rows.filter(function (r) { return r.id !== el.dataset.id; });
      render();
      return;
    }

    if (act === 'avatar') { openAvatar(!S.pets().length || view.name === 'onboard'); return; }
    if (act === 'breed-new') { openBreedSheet(!S.pets().length || view.name === 'onboard'); return; }
    if (act === 'breed-del') {
      if (!confirm('删掉这个品种？已经用它建的宠物头像不会变。')) return;
      S.removeBreed(el.dataset.id);
      harvestOb();
      if (!PT.breedById(ob.species, ob.breedId)) ob.breedId = (PT.breedList(ob.species)[0] || {}).id || '';
      render({});
      return;
    }

    if (act === 'edit-profile') {
      var pp = S.active();
      if (!pp) return;
      ob.editing = true;
      ob.mode = 'first';
      ob.species = pp.species;
      ob.personality = pp.personality;
      go('onboard');
      return;
    }

    if (act === 'cancel-edit' || act === 'cancel-new') {
      ob.editing = false;
      ob.mode = 'first';
      go('pet');
      return;
    }
    if (act === 'demo') {
      if (S.allDays().length && !confirm('这会清掉现在的记录、换成示例，确定吗？')) return;
      S.seedDemo();
      go('diary');
      toast('这是一只叫麻薯的猫，一周的日记。');
      return;
    }

    if (act === 'theme') {
      S.setSetting('theme', id);
      render({});
      toast('换好了');
      return;
    }
    if (act === 'chip-edit') {
      chips.edit = !chips.edit;
      composer.open = false;
      render({});
      return;
    }
    if (act === 'chip-hide') {
      saveChips(chipIds().filter(function (x) { return x !== id; }));
      render({});
      return;
    }
    if (act === 'chip-show') {
      var back = chipIds();
      if (back.indexOf(id) < 0) back.push(id);
      saveChips(back);
      render({});
      toast('加回来了');
      return;
    }

    if (act === 'add') {
      if (chips.edit) return;
      S.addEvent(PT.todayKey(), id);
      render();
      var t = PT.TYPE[id];
      toast('记下了 · ' + t.label);
      return;
    }
    if (act === 'del') {
      S.removeEvent(key, id);
      render();
      return;
    }
    if (act === 'gen') { startWriting(key); return; }
    if (act === 'reroll') {
      var d = S.day(key);
      S.generate(key, ((d && d.diary && d.diary.seed) || 0) + 1);
      render();
      toast('换了一版。');
      return;
    }
    if (act === 'share') { saveImage(key); return; }
    if (act === 'cleardiary') { S.clearDiary(key); render(); toast('这篇没了。'); return; }
    if (act === 'entry') { go('entry', key); return; }
    if (act === 'export') { download('它眼里的世界-备份.json', S.exportJSON()); return; }
    if (act === 'code-copy') { copyCode(); return; }
    if (act === 'code-paste') { openCodeSheet(); return; }
    if (act === 'import') {
      var inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = '.json,application/json';
      inp.onchange = function () {
        var f = inp.files && inp.files[0];
        if (!f) return;
        var r = new FileReader();
        r.onload = function () {
          try {
            S.importJSON(String(r.result));
            go('today');
            toast('导入好了。');
          } catch (err) { toast('这个文件读不了。'); }
        };
        r.readAsText(f);
      };
      inp.click();
      return;
    }
    if (act === 'redo') {
      if (!confirm('清空所有记录，重新开始？导出过备份才建议这样做。')) return;
      S.reset();
      if (PT.MEDIA) PT.MEDIA.clear();
      go('today');
      return;
    }
  });

  document.addEventListener('change', function (e) {
    var el = e.target;
    if (el.classList && el.classList.contains('mfile')) {
      var kind = el.id === 'file-video' ? 'video' : 'photo';
      var k = el.dataset.key || PT.todayKey();
      /* 先拷成数组：清空 input 会把 FileList 一起清掉 */
      var files = Array.prototype.slice.call(el.files || []);
      el.value = '';
      ingest(files, kind, k);
      return;
    }
    if (!el.dataset || !el.dataset.act) return;
    var key = el.dataset.key || PT.todayKey();
    if (el.dataset.act === 'num') {
      var v = el.value === '' ? null : Number(el.value);
      S.updateEvent(key, el.dataset.id, { num: v });
      render();
    }
    if (el.dataset.act === 'opt') {
      S.updateEvent(key, el.dataset.id, { opt: el.value });
      render();
    }
  });

  var noteTimer = null;
  document.addEventListener('input', function (e) {
    var el = e.target;
    if (el.id !== 'note') return;
    var key = el.dataset.key;
    clearTimeout(noteTimer);
    noteTimer = setTimeout(function () { S.setNote(key, el.value); }, 350);
  });

  /* 启动 */
  S.load();
  var rawHash = location.hash || '';
  if (rawHash.indexOf('#demo') === 0 && !S.pets().length) {
    S.seedDemo();
    var rest = rawHash.slice(5).replace(/^\//, '');
    try { history.replaceState(null, '', rest ? '#/' + rest : '#/diary'); } catch (e) { }
  }
  var initView = parseHash();
  if (initView) view = initView;
  lastHash = location.hash;
  render({ top: true });
  window.PT_APP = { go: go, render: render, card: buildCard, store: S };
})();
