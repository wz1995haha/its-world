/* today.js — 今天：记几件事，写一句话，让它写一篇 */
var PT = require('../../utils/all.js');
var chips = require('../../utils/chips.js');
var photo = require('../../utils/photo.js');
var themeStyle = require('../../utils/theme-style.js');
var cloud = require('../../utils/cloud.js');

var S = PT.STORE;

var ROWS = 8; /* 两行 × 4 列 */

var PERSONALITIES = [
  { id: 'tsundere', label: '傲娇', hint: '嘴上不在乎，行动很诚实' },
  { id: 'clingy', label: '黏人', hint: '你去哪，它就去哪' },
  { id: 'aloof', label: '高冷', hint: '允许你待在附近' },
  { id: 'foodie', label: '贪吃', hint: '心里只有开饭的声音' },
  { id: 'curious', label: '好奇', hint: '所有柜子都要检查一遍' }
];

function moodOf(events) {
  return PT.WRITER.computeMood(events || []);
}

Page({
  data: {
    themeStyle: '',
    hasPet: false,
    pet: null,
    face: { species: 'cat', mood: 'calm', breedId: '' },
    dayKey: '',
    dayText: '',
    dayNo: 1,
    greeting: '',
    chipsShown: [],
    chipsTop: [],
    chipsHidden: [],
    chipsOpen: false,
    chipsEdit: false,
    events: [],
    eventCount: 0,
    note: '',
    media: [],
    mediaCount: 0,
    hasDiary: false,
    canGenerate: false,
    cloudOn: false,
    /* 建宠物表单 */
    ob: { name: '', species: 'cat', breedIndex: 0, personIndex: 0, photo: '' },
    breeds: [],
    persons: PERSONALITIES,
    /* 选项弹层 */
    sheet: { open: false, title: '', options: [], typeId: '', evId: '' }
  },

  onLoad: function () {
    var app = getApp();
    var g = (app && app.globalData) || {};
    if (g.envId) cloud.setEnv(g.envId);
    if (cloud.enabled()) {
      var self = this;
      this.setData({ cloudOn: true });
      cloud.login(function () { self.pull(); });
    }
    this.refresh();
  },

  onShow: function () {
    var app0 = getApp();
    var dirty0 = app0 && app0.globalData && app0.globalData.dirtyAt;
    if (dirty0) {
      this._skipPullUntil = Date.now() + 20000;
      app0.globalData.dirtyAt = 0;
    }
    this.refresh();
    /* 一分钟最多拉一次：别的设备改了这边能看到 */
    if (cloud.enabled()) {
      var now = Date.now();
      if ((!this._skipPullUntil || now > this._skipPullUntil) && (!this._lastPull || now - this._lastPull > 60000)) {
        this._lastPull = now;
        this.pull();
      }
    }
  },

  /* ---------------- 云同步 ---------------- */

  pull: function () {
    var self = this;
    cloud.pull(function (res) {
      if (!res) return;
      var changed = 0;
      (res.pets || []).forEach(function (rp) {
        if (!rp || !rp.id) return;
        var local = S.petById(rp.id);
        if (!local) {
          var fresh = {};
          Object.keys(rp).forEach(function (k) { if (k.indexOf('_') !== 0) fresh[k] = rp[k]; });
          S.addPet(fresh);
          changed++;
        }
      });
      (res.stories || []).forEach(function (rs) {
        if (!rs || !rs.id || !rs.petId) return;
        var one = {};
        Object.keys(rs).forEach(function (k) { if (k.indexOf('_') !== 0) one[k] = rs[k]; });
        S.importStory(one.petId, one);
        changed++;
      });
      (res.days || []).forEach(function (rd) {
        if (!rd || !rd.key || !rd.petId) return;
        var box = {};
        Object.keys(rd).forEach(function (k) { if (k.indexOf('_') !== 0) box[k] = rd[k]; });
        box.date = rd.key;
        S.importDay(rd.petId, rd.key, box);
        changed++;
      });
      if (changed) {
        self.refresh();
        wx.showToast({ title: '已同步', icon: 'none' });
      }
    });
  },

  /* 本地改了就推一次（节流 1.2 秒） */
  sync: function () {
    if (!cloud.enabled()) return;
    var pet = S.active();
    if (!pet) return;
    if (this._syncTimer) clearTimeout(this._syncTimer);
    this._syncTimer = setTimeout(function () { cloud.push(pet.id); }, 1200);
  },

  /* ---------------- 刷新 ---------------- */

  refresh: function () {
    var t = themeStyle.styleNow();
    var pet = S.active();

    if (!pet) {
      var breeds = PT.breedList('cat');
      this.setData({
        themeStyle: t.themeStyle,
        hasPet: false,
        breeds: breeds,
        'ob.breedIndex': 0
      });
      return;
    }

    var key = PT.todayKey();
    var d = S.day(key);
    var events = (d && d.events) || [];
    var mood = moodOf(events);
    var ch = chips.view();
    var stats = S.stats();
    var media = S.mediaOf(key) || [];
    var note = (d && d.note) || '';
    var self = this;

    /* 云上的给临时地址 */
    var ids = media.filter(function (m) {
      return m && m.fileID && /^cloud:\/\//.test(m.fileID) && !m.url;
    }).map(function (m) { return m.fileID; });
    if (ids.length) {
      cloud.tempUrls(ids, function (map) {
        var next = media.map(function (m) {
          if (m && m.fileID && map[m.fileID]) {
            var c = {};
            Object.keys(m).forEach(function (k) { c[k] = m[k]; });
            c.url = map[m.fileID];
            return c;
          }
          return m;
        });
        self.setData({ media: next, mediaCount: next.length });
      });
    }

    this.setData({
      themeStyle: t.themeStyle,
      hasPet: true,
      pet: pet,
      face: { species: pet.species, mood: mood, breedId: pet.breedId || '' },
      dayKey: key,
      dayText: PT.fmtCN(key),
      dayNo: stats.together,
      greeting: PT.WRITER.greeting(),
      chipsShown: ch.shown,
      chipsTop: ch.shown.slice(0, ROWS),
      chipsHidden: ch.hidden,
      events: events.map(function (e) {
        var m = chips.meta(e.type) || { label: e.type, icon: '·' };
        var extra = '';
        if (e.num != null) {
          var ty = PT.TYPE[e.type];
          extra = e.num + (ty && ty.num ? ty.num.unit : '');
        }
        if (e.opt) extra = e.opt;
        return { id: e.id, icon: m.icon, label: m.label, extra: extra };
      }),
      eventCount: events.length,
      note: note,
      media: media,
      mediaCount: media.length,
      hasDiary: !!(d && d.diary),
      canGenerate: events.length > 0 || !!String(note).trim() || media.length > 0
    });
  },

  toggleChipsOpen: function () {
    this.setData({ chipsOpen: !this.data.chipsOpen });
  },

  /* ---------------- 建第一只 ---------------- */

  onName: function (e) {
    this.setData({ 'ob.name': e.detail.value });
  },

  pickSpecies: function (e) {
    var sp = e.currentTarget.dataset.sp;
    this.setData({
      'ob.species': sp,
      'ob.breedIndex': 0,
      breeds: PT.breedList(sp)
    });
  },

  onBreed: function (e) {
    this.setData({ 'ob.breedIndex': Number(e.detail.value) });
  },

  onPerson: function (e) {
    this.setData({ 'ob.personIndex': Number(e.detail.value) });
  },

  /* 头像（建档时） */
  pickPhoto: function () {
    var self = this;
    photo.pick(function (path) {
      if (!path) return;
      var cur = self.data.ob;
      photo.drop(cur.photo);
      cur.photo = path;
      self.setData({ ob: cur });
    });
  },

  clearObPhoto: function () {
    var ob = this.data.ob;
    photo.drop(ob.photo);
    ob.photo = '';
    this.setData({ ob: ob });
  },

  start: function () {
    var ob = this.data.ob;
    var name = String(ob.name || '').trim();
    if (!name) {
      wx.showToast({ title: '先给它起个名字', icon: 'none' });
      return;
    }
    var breeds = PT.breedList(ob.species);
    var b = breeds[ob.breedIndex] || breeds[0];
    var p = PERSONALITIES[ob.personIndex] || PERSONALITIES[0];
    S.addPet({
      name: name.slice(0, 10),
      species: ob.species,
      breedId: b.id,
      personality: p.id,
      personalityText: '',
      bio: '',
      photo: ob.photo || '',
      createdAt: new Date().toISOString()
    });
    wx.showToast({ title: '开始记录', icon: 'none' });
    this.refresh();
    this.sync();
    wx.switchTab({ url: '/pages/home/home' });
  },

  /* ---------------- 记一件事 ---------------- */

  tapChip: function (e) {
    if (this.data.chipsEdit) return;
    var id = e.currentTarget.dataset.id;
    var t = PT.TYPE[id];
    var key = PT.todayKey();
    var self = this;

    if (!t) {
      S.addEvent(key, id, {});
      this.afterChange();
      wx.showToast({ title: '记下了', icon: 'none' });
      return;
    }

    if (t.opt) {
      this.setData({
        sheet: { open: true, title: t.label, options: t.opt, typeId: id, evId: '' }
      });
      return;
    }

    if (t.num) {
      wx.showModal({
        title: t.label,
        editable: true,
        placeholderText: '填个数字，单位 ' + t.num.unit,
        content: String(t.num.def),
        success: function (r) {
          if (!r.confirm) return;
          var n = Number(String(r.content || '').trim());
          if (!isFinite(n) || n <= 0) n = t.num.def;
          S.addEvent(key, id, { num: n });
          self.afterChange();
          wx.showToast({ title: '记下了', icon: 'none' });
        }
      });
      return;
    }

    S.addEvent(key, id, {});
    this.afterChange();
    wx.showToast({ title: '记下了', icon: 'none' });
  },

  /* 改完立刻刷新 + 排队同步 */
  afterChange: function () {
    this.refresh();
    this.sync();
  },

  pickOption: function (e) {
    var opt = e.currentTarget.dataset.opt;
    var t = this.data.sheet.typeId;
    S.addEvent(PT.todayKey(), t, { opt: opt });
    this.setData({ 'sheet.open': false });
    this.afterChange();
    wx.showToast({ title: '记下了', icon: 'none' });
  },

  closeSheet: function () {
    this.setData({ 'sheet.open': false });
  },

  delEvent: function (e) {
    var id = e.currentTarget.dataset.id;
    var self = this;
    wx.showModal({
      title: '删掉这条？',
      content: '只是今天这一条记录',
      success: function (r) {
        if (!r.confirm) return;
        S.removeEvent(PT.todayKey(), id);
        self.afterChange();
      }
    });
  },

  /* ---------------- 写今天的日记 ---------------- */

  onNote: function (e) {
    var v = e.detail.value;
    this.setData({
      note: v,
      canGenerate: this.data.eventCount > 0 || !!String(v).trim() || this.data.mediaCount > 0
    });
  },

  saveNote: function () {
    var v = String(this.data.note || '').trim().slice(0, 120);
    S.setNote(PT.todayKey(), v);
    this.setData({ note: v });
    this.sync();
  },

  blurNote: function () {
    this.saveNote();
  },

  /* 照片 / 视频 */
  pickPhotoDay: function () { this.pickMedia('image', 9); },
  pickVideoDay: function () { this.pickMedia('video', 1); },

  pickMedia: function (mediaType, count) {
    var self = this;
    var opt = {
      count: count,
      mediaType: [mediaType],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        var files = (res.tempFiles || []).map(function (f) {
          return { path: f.tempFilePath, w: f.width, h: f.height, dur: Math.round(f.duration || 0) };
        });
        self.saveMedia(files, mediaType === 'video' ? 'video' : 'photo');
      },
      fail: function () {}
    };
    if (mediaType === 'video') opt.maxDuration = 60;
    wx.chooseMedia(opt);
  },

  saveMedia: function (files, kind) {
    var self = this;
    var key = PT.todayKey();
    if (!files.length) return;
    wx.showLoading({ title: cloud.enabled() ? '上传中' : '保存中', mask: true });
    var i = 0;
    function step() {
      if (i >= files.length) {
        wx.hideLoading();
        self.afterChange();
        return;
      }
      var f = files[i++];
      if (cloud.enabled()) {
        cloud.upload(f.path, kind, function (fileID) {
          S.addMedia(key, {
            kind: kind,
            fileID: fileID || '',
            path: fileID ? '' : f.path,
            w: f.w, h: f.h, dur: f.dur
          });
          step();
        });
      } else {
        photo.persist(f.path, function (saved) {
          S.addMedia(key, { kind: kind, path: saved, w: f.w, h: f.h, dur: f.dur });
          step();
        });
      }
    }
    step();
  },

  delMedia: function (e) {
    var id = e.currentTarget.dataset.id;
    S.removeMedia(PT.todayKey(), id);
    this.afterChange();
  },

  previewMedia: function (e) {
    var m = e.currentTarget.dataset.item;
    if (!m) return;
    var src = m.url || m.fileID || m.path;
    if (!src) return;
    if (m.kind === 'video') {
      if (wx.previewMedia) wx.previewMedia({ sources: [{ url: src, type: 'video' }] });
      else wx.previewImage({ urls: [src] });
    } else {
      /* 一组照片一起看 */
      var urls = (this.data.media || []).filter(function (x) { return x.kind !== 'video'; })
        .map(function (x) { return x.url || x.fileID || x.path; })
        .filter(Boolean);
      if (wx.previewImage) wx.previewImage({ urls: urls.length ? urls : [src], current: src });
    }
  },

  /* ---------------- 让它写 ---------------- */

  write: function () {
    var self = this;
    var key = PT.todayKey();
    this.saveNote();
    if (!this.data.canGenerate) {
      wx.showToast({ title: '先记一点什么', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '它在写…' });
    setTimeout(function () {
      var diary = S.generate(key);
      wx.hideLoading();
      if (!diary) {
        wx.showToast({ title: '没写出来，再试一次', icon: 'none' });
        return;
      }
      self.afterChange();
      wx.navigateTo({ url: '/pages/entry/entry?key=' + key });
    }, 60);
  },

  /* ---------------- 编辑按钮 ---------------- */

  toggleChipsEdit: function () {
    this.setData({ chipsEdit: !this.data.chipsEdit });
  },

  moveChip: function (e) {
    var d = e.currentTarget.dataset;
    chips.move(d.id, Number(d.dir));
    this.refresh();
  },

  hideChip: function (e) {
    chips.hide(e.currentTarget.dataset.id);
    this.refresh();
  },

  showChip: function (e) {
    chips.show(e.currentTarget.dataset.id);
    this.refresh();
  }
});
