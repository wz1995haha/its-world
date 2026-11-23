/* cloud.js — 云开发：登录（openid）、数据库、云存储
 * 只有在 app.globalData.envId 填了之后才会真的联网；
 * 没填时这里所有函数都安全地返回空，页面照旧用本地数据。
 */
var PT = require('./pt-core.js');

var ENV = '';
var inited = false;
var openid = '';
var logged = false;

function setEnv(id) { ENV = String(id || ''); }
function enabled() { return !!ENV && typeof wx !== 'undefined' && !!wx.cloud; }

function init() {
  if (!enabled() || inited) return enabled();
  try {
    wx.cloud.init({ env: ENV, traceUser: true });
    inited = true;
  } catch (e) {
    console.warn('[cloud] init 失败', e);
  }
  return inited;
}

/* 拿 openid：失败也只是不联网，不影响本地记录 */
function login(cb) {
  if (!init()) { cb(''); return; }
  if (logged) { cb(openid); return; }
  wx.cloud.callFunction({ name: 'login' })
    .then(function (res) {
      openid = (res && res.result && res.result.openid) || '';
      logged = !!openid;
      cb(openid);
    })
    .catch(function (e) {
      console.warn('[cloud] login 失败', e);
      cb('');
    });
}

/* ---------------- 数据库 ---------------- */

function db() { return wx.cloud.database(); }

/* 集合不存在时第一次读写会报 -502005，所以进来先调一次 init 云函数（幂等，只调一次） */
var ensured = false;
var ensureQueue = [];

function ensureInit(cb) {
  if (!init() || ensured) { cb(); return; }
  ensureQueue.push(cb);
  if (ensureQueue.length > 1) return;
  wx.cloud.callFunction({ name: 'init' })
    .then(function () { ensured = true; })
    .catch(function (e) { console.warn('[cloud] init 云函数失败（集合可能还没建）', e); })
    .then(function () {
      var q = ensureQueue.slice();
      ensureQueue.length = 0;
      q.forEach(function (fn) { try { fn(); } catch (e) {} });
    });
}

/* 拉这个人的全部宠物和日子 */
function pull(cb) {
  login(function (uid) {
    if (!uid) { cb(null); return; }
    ensureInit(function () { pullNow(uid, cb); });
  });
}

function pullNow(uid, cb) {
  {
    var d = db();
    var out = { pets: [], days: [], stories: [] };
    d.collection('pets').where({ _openid: uid }).limit(20).get()
      .then(function (r) {
        out.pets = (r && r.data) || [];
        return d.collection('days').where({ _openid: uid }).limit(1000).get();
      })
      .then(function (r) {
        out.days = (r && r.data) || [];
        return d.collection('stories').where({ _openid: uid }).limit(1000).get()
          .catch(function () { return { data: [] }; });
      })
      .then(function (r) {
        out.stories = (r && r.data) || [];
        cb(out);
      })
      .catch(function (e) {
        console.warn('[cloud] pull 失败', e);
        cb(null);
      });
  }
}

/* 整只宠物（含它的日子）推上去：先简单打成一条 doc，量大了再拆 */
function push(petId, cb) {
  login(function (uid) {
    if (!uid) { if (cb) cb(false); return; }
    ensureInit(function () { pushNow(uid, petId, cb); });
  });
}

function pushNow(uid, petId, cb) {
  {
    var pet = PT.STORE.petById(petId);
    if (!pet) { if (cb) cb(false); return; }
    var d = db();
    var doc = JSON.parse(JSON.stringify(pet));
    doc._openid = uid;
    doc.updatedAt = Date.now();
    d.collection('pets').doc(String(pet.id)).set({ data: doc })
      .then(function () {
        var days = PT.STORE.daysOf ? PT.STORE.daysOf(petId) : {};
        var list = Object.keys(days).map(function (k) {
          var one = JSON.parse(JSON.stringify(days[k] || {}));
          one._openid = uid;
          one.petId = petId;
          one.key = k;
          one.updatedAt = Date.now();
          return one;
        });
        var jobs = list.map(function (one) {
          return d.collection('days').doc(petId + '_' + one.key).set({ data: one });
        });
        var recs = PT.STORE.records(petId) || [];
        recs.forEach(function (r) {
          var one = JSON.parse(JSON.stringify(r));
          one._openid = uid;
          one.petId = petId;
          one.updatedAt = Date.now();
          jobs.push(d.collection('records').doc(petId + '_' + one.id).set({ data: one }));
        });
        var stories = PT.STORE.stories(petId) || [];
        stories.forEach(function (st) {
          var one = JSON.parse(JSON.stringify(st));
          one._openid = uid;
          one.petId = petId;
          one.updatedAt = Date.now();
          jobs.push(d.collection('stories').doc(petId + '_' + one.id).set({ data: one })
            .catch(function () {}));
        });
        /* 到期提醒：把「下次该做什么」同步一份到云端，供云函数每天扫 */
        try {
          var due = PT.STORE.dueList(petId) || [];
          var items = due.map(function (x) {
            return { key: x.key, kind: x.kind, title: x.title, next: x.next, days: x.days };
          });
          jobs.push(d.collection('reminders').doc(petId).set({
            data: {
              _openid: uid,
              petId: petId,
              petName: pet.name,
              items: items,
              updatedAt: Date.now()
            }
          }).catch(function () {}));
        } catch (e) { console.warn('[cloud] reminders 失败', e); }
        return Promise.all(jobs);
      })
      .then(function () { if (cb) cb(true); })
      .catch(function (e) {
        console.warn('[cloud] push 失败', e);
        if (cb) cb(false);
      });
  }
}

/* 订阅可用条数 +1（一次性订阅：授权一次只能发一条） */
function grantSub(n, cb) {
  if (!init()) { if (cb) cb(false); return; }
  login(function (uid) {
    if (!uid) { if (cb) cb(false); return; }
    ensureInit(function () {
      var d = db();
      d.collection('subs').where({ _openid: uid }).get()
        .then(function (res) {
          var doc = res.data && res.data[0];
          if (!doc) {
            return d.collection('subs').add({
              data: { _openid: uid, remain: n || 1, updatedAt: Date.now() }
            });
          }
          return d.collection('subs').doc(doc._id).update({
            data: { remain: (doc.remain || 0) + (n || 1), updatedAt: Date.now() }
          });
        })
        .then(function () { if (cb) cb(true); })
        .catch(function (e) { console.warn('[cloud] grantSub 失败', e); if (cb) cb(false); });
    });
  });
}

/* ---------------- 云存储 ---------------- */

/* 把手机上的临时文件传上去，回调回 fileID；失败回 ''，本地照样能看 */
function upload(filePath, kind, cb) {
  if (!init() || !filePath) { cb(''); return; }
  var ext = (String(filePath).match(/\.(\w+)$/) || [])[1] || (kind === 'video' ? 'mp4' : 'jpg');
  var name = 'media/' + Date.now() + '_' + Math.random().toString(36).slice(2, 8) + '.' + ext;
  wx.cloud.uploadFile({
    cloudPath: name,
    filePath: filePath,
    success: function (res) { cb(res.fileID || ''); },
    fail: function (e) { console.warn('[cloud] upload 失败', e); cb(''); }
  });
}

/* fileID 转成能直接给 <image> 用的地址（有效期几分钟） */
function tempUrls(fileIds, cb) {
  if (!init() || !fileIds || !fileIds.length) { cb({}); return; }
  wx.cloud.getTempFileURL({
    fileList: fileIds,
    success: function (res) {
      var map = {};
      (res.fileList || []).forEach(function (f) { if (f.fileID && f.tempFileURL) map[f.fileID] = f.tempFileURL; });
      cb(map);
    },
    fail: function () { cb({}); }
  });
}

module.exports = {
  grantSub: grantSub,
  setEnv: setEnv,
  enabled: enabled,
  init: init,
  login: login,
  pull: pull,
  push: push,
  upload: upload,
  tempUrls: tempUrls
};
