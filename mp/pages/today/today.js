/* today.js — 今天：记几件事，让它写一篇 */
var PT = require('../../utils/all.js');
var chips = require('../../utils/chips.js');
var photo = require('../../utils/photo.js');
var themeStyle = require('../../utils/theme-style.js');

var S = PT.STORE;

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
    chipsHidden: [],
    chipsEdit: false,
    events: [],
    eventCount: 0,
    note: '',
    hasDiary: false,
    canGenerate: false,
    /* 建宠物表单 */
    ob: { name: '', species: 'cat', breedIndex: 0, personIndex: 0, photo: '' },
    breeds: [],
    persons: PERSONALITIES,
    /* 选项弹层 */
    sheet: { open: false, title: '', options: [], typeId: '', evId: '' }
  },

  onLoad: function () {
    this.refresh();
  },

  onShow: function () {
    this.refresh();
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
      note: (d && d.note) || '',
      hasDiary: !!(d && d.diary),
      canGenerate: events.length > 0
    });
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

  pickPhoto: function () {
    var self = this;
    photo.pick(function (path) {
      if (!path) return;
      var ob = self.data.ob;
      photo.drop(ob.photo);
      ob.photo = path;
      self.setData({ ob: ob });
    });
  },

  clearObPhoto: function () {
    var ob = this.data.ob;
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
  },

  /* ---------------- 记一件事 ---------------- */

  tapChip: function (e) {
    if (this.data.chipsEdit) return;
    var id = e.currentTarget.dataset.id;
    var t = PT.TYPE[id];
    var key = PT.todayKey();

    if (!t) {
      /* 自定义类型：直接记一条 */
      S.addEvent(key, id, {});
      this.refresh();
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
      var self = this;
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
          self.refresh();
          wx.showToast({ title: '记下了', icon: 'none' });
        }
      });
      return;
    }

    S.addEvent(key, id, {});
    this.refresh();
    wx.showToast({ title: '记下了', icon: 'none' });
  },

  pickOption: function (e) {
    var opt = e.currentTarget.dataset.opt;
    var t = this.data.sheet.typeId;
    S.addEvent(PT.todayKey(), t, { opt: opt });
    this.setData({ 'sheet.open': false });
    this.refresh();
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
        self.refresh();
      }
    });
  },

  onNote: function (e) {
    this.setData({ note: e.detail.value });
  },

  saveNote: function () {
    S.setNote(PT.todayKey(), String(this.data.note || '').trim().slice(0, 60));
  },

  /* ---------------- 让它写 ---------------- */

  write: function () {
    var self = this;
    if (!this.data.canGenerate) {
      wx.showToast({ title: '先点几个按钮', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '它在写…' });
    setTimeout(function () {
      var diary = S.generate(PT.todayKey());
      wx.hideLoading();
      if (!diary) {
        wx.showToast({ title: '没写出来，再试一次', icon: 'none' });
        return;
      }
      self.refresh();
      wx.navigateTo({ url: '/pages/entry/entry?key=' + PT.todayKey() });
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


