/* pet.js — 它：档案、主题、按钮管理、数据 */
var PT = require('../../utils/all.js');
var chips = require('../../utils/chips.js');
var photo = require('../../utils/photo.js');
var themeStyle = require('../../utils/theme-style.js');
var S = PT.STORE;

var PERSONALITIES = [
  { id: 'tsundere', label: '傲娇' },
  { id: 'clingy', label: '黏人' },
  { id: 'aloof', label: '高冷' },
  { id: 'foodie', label: '贪吃' },
  { id: 'curious', label: '好奇' }
];

Page({
  data: {
    themeStyle: '',
    hasPet: false,
    pet: null,
    face: { species: 'cat', mood: 'calm', breedId: '' },
    breedLabel: '',
    personLabel: '',
    stats: { together: 0, recordedDays: 0, diaryCount: 0 },
    themes: [],
    themeId: 'paper',
    chipShown: [],
    chipHidden: [],
    chipsEdit: false,
    breeds: [],
    ob: { species: 'cat', breedIndex: 0, personIndex: 0 }
  },

  onShow: function () {
    this.refresh();
  },

  refresh: function () {
    var t = themeStyle.styleNow();
    var pet = S.active();
    var themes = PT.THEMES.map(function (x) {
      return { id: x.id, label: x.label, hint: x.hint, on: x.id === t.themeId };
    });
    var ch = chips.view();

    if (!pet) {
      this.setData({
        themeStyle: t.themeStyle,
        themeId: t.themeId,
        themes: themes,
        hasPet: false
      });
      return;
    }

    var breeds = PT.breedList(pet.species);
    var bi = 0;
    breeds.forEach(function (b, i) { if (b.id === pet.breedId) bi = i; });
    var pi = 0;
    PERSONALITIES.forEach(function (p, i) { if (p.id === pet.personality) pi = i; });

    this.setData({
      themeStyle: t.themeStyle,
      themeId: t.themeId,
      themes: themes,
      hasPet: true,
      pet: pet,
      face: { species: pet.species, mood: 'calm', breedId: pet.breedId || '' },
      breedLabel: PT.breedLabel(pet) || '',
      personLabel: PERSONALITIES[pi].label,
      stats: S.stats(),
      chipShown: ch.shown,
      chipHidden: ch.hidden,
      breeds: breeds,
      ob: { species: pet.species, breedIndex: bi, personIndex: pi }
    });
  },

  /* ---------- 头像 ---------- */
  choosePhoto: function () {
    var self = this;
    photo.pick(function (path) {
      if (!path) return;
      var old = self.data.pet.photo;
      S.updatePet(self.data.pet.id, { photo: path });
      photo.drop(old);
      self.refresh();
      wx.showToast({ title: '换好了', icon: 'none' });
    });
  },

  clearPhoto: function () {
    photo.drop(this.data.pet.photo);
    S.updatePet(this.data.pet.id, { photo: '' });
    this.refresh();
  },

  /* ---------- 主题 ---------- */
  setTheme: function (e) {
    var id = e.currentTarget.dataset.id;
    S.setSetting('theme', id);
    this.refresh();
    wx.showToast({ title: '换好了', icon: 'none' });
  },

  /* ---------- 改资料 ---------- */
  rename: function () {
    var self = this;
    wx.showModal({
      title: '它叫什么',
      editable: true,
      content: this.data.pet.name,
      success: function (r) {
        if (!r.confirm) return;
        var v = String(r.content || '').trim().slice(0, 10);
        if (!v) return;
        S.updatePet(self.data.pet.id, { name: v });
        self.refresh();
      }
    });
  },

  onSpecies: function (e) {
    var sp = e.currentTarget.dataset.sp;
    var breeds = PT.breedList(sp);
    S.updatePet(this.data.pet.id, { species: sp, breedId: breeds[0].id });
    this.refresh();
  },

  onBreed: function (e) {
    var b = this.data.breeds[Number(e.detail.value)];
    S.updatePet(this.data.pet.id, { breedId: b.id });
    this.refresh();
  },

  onPerson: function (e) {
    var p = PERSONALITIES[Number(e.detail.value)];
    S.updatePet(this.data.pet.id, { personality: p.id, personalityText: '' });
    this.refresh();
  },

  setBirthday: function () {
    var self = this;
    wx.showModal({
      title: '生日',
      editable: true,
      content: this.data.pet.birthday || PT.todayKey(),
      placeholderText: 'YYYY-MM-DD',
      success: function (r) {
        if (!r.confirm) return;
        var d = String(r.content || '').trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
          wx.showToast({ title: '写成 2023-05-18', icon: 'none' });
          return;
        }
        S.updatePet(self.data.pet.id, { birthday: d });
        self.refresh();
      }
    });
  },

  /* ---------- 按钮管理 ---------- */
  toggleEdit: function () {
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
  },

  addType: function () {
    var self = this;
    wx.showModal({
      title: '加一个按钮',
      editable: true,
      placeholderText: '比如：量体温、刷牙',
      success: function (r) {
        if (!r.confirm) return;
        var label = String(r.content || '').trim();
        if (!label) return;
        var t = S.addCustomType(label, '⭐️');
        if (!t) {
          wx.showToast({ title: '这个名字不行', icon: 'none' });
          return;
        }
        chips.append(t.id);
        self.refresh();
        wx.showToast({ title: '加好了', icon: 'none' });
      }
    });
  },

  delType: function (e) {
    var id = e.currentTarget.dataset.id;
    var self = this;
    wx.showModal({
      title: '删掉这个按钮？',
      content: '之前记过的记录还在，只是按钮没了',
      success: function (r) {
        if (!r.confirm) return;
        S.removeCustomType(id);
        chips.drop(id);
        self.refresh();
      }
    });
  },

  /* ---------- 数据 ---------- */
  copyBackup: function () {
    wx.setClipboardData({
      data: S.exportJSON(),
      success: function () {
        wx.showToast({ title: '已经复制到剪贴板', icon: 'none' });
      }
    });
  },

  resetAll: function () {
    var self = this;
    wx.showModal({
      title: '重新开始？',
      content: '所有宠物和日记都会从这个设备上删掉，先导出备份再点确定',
      confirmText: '确定删',
      success: function (r) {
        if (!r.confirm) return;
        S.reset();
        self.refresh();
        wx.showToast({ title: '清空了', icon: 'none' });
      }
    });
  },

  demo: function () {
    S.seedDemo();
    this.refresh();
    wx.showToast({ title: '示例来了', icon: 'none' });
  }
});
