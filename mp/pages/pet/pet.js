/* pet.js — 它：档案、主题、按钮管理、数据 */
var PT = require('../../utils/all.js');
var chips = require('../../utils/chips.js');
var photo = require('../../utils/photo.js');
var themeStyle = require('../../utils/theme-style.js');
var S = PT.STORE;

function cn(key) {
  if (!key) return '';
  var d = PT.parseDate(key);
  return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
}

/* 陪伴天数：到家那天算第 1 天；没填到家就按建档那天算 */
function personLabelOf(p) {
  var hit = PERSONALITIES.filter(function (x) { return x.id === p.personality; })[0];
  if (hit) return hit.label;
  return String(p.personalityText || p.personality || '').slice(0, 4);
}

function homeDaysOf(pet) {
  var start = pet.homeDate || (pet.createdAt ? String(pet.createdAt).slice(0, 10) : PT.todayKey());
  var n = PT.daysBetween(start, PT.todayKey()) + 1;
  return n > 0 ? n : 1;
}

function agoText(key) {
  if (!key) return '';
  var n = PT.daysBetween(key, PT.todayKey());
  if (n <= 0) return '今天';
  if (n === 1) return '昨天';
  if (n < 30) return n + ' 天前';
  if (n < 365) return Math.floor(n / 30) + ' 个月前';
  return Math.floor(n / 365) + ' 年前';
}

function ageOf(birth) {
  if (!birth) return '';
  var b = PT.parseDate(birth);
  var now = PT.parseDate(PT.todayKey());
  var m = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) m--;
  if (m < 0) return '';
  if (m < 12) return m + ' 个月';
  var y = Math.floor(m / 12), r = m % 12;
  return y + ' 岁' + (r ? ' ' + r + ' 个月' : '');
}

var PERSONALITIES = [
  { id: 'tsundere', label: '傲娇' },
  { id: 'clingy', label: '黏人' },
  { id: 'aloof', label: '高冷' },
  { id: 'foodie', label: '贪吃' },
  { id: 'curious', label: '好奇' }
];


function vaccineRecs(pet) {
  return (S.records(pet.id) || []).filter(function (r) { return r.kind === 'vaccine'; });
}

function firstVaccineText(pet) {
  var list = vaccineRecs(pet);
  if (!list.length) return '还没记';
  var first = list[list.length - 1];
  return cn(first.date) + ' · ' + agoText(first.date);
}

function vaccineCountOf(pet) {
  return vaccineRecs(pet).length;
}

function lastDewormText(pet, route) {
  var hit = null;
  (S.records(pet.id) || []).forEach(function (r) {
    if (r.kind !== 'deworm') return;
    if (String(r.route || '') !== route) return;
    if (!hit || hit.date < r.date) hit = r;
  });
  if (!hit) return '还没记';
  return cn(hit.date) + ' · ' + agoText(hit.date);
}
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
        hasPet: false,
        pets: [],
        petCount: 0
      });
      return;
    }

    var breeds = PT.breedList(pet.species).concat([{ id: '__new__', label: '＋ 自己填一个品种' }]);
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
      together: homeDaysOf(pet),
      spaceRecent: (S.stories(pet.id) || []).slice(0, 2).map(function (x) {
        return { id: x.id, date: PT.fmtShort(x.date), title: x.title || (x.text || '').slice(0, 14) || (x.tag || '一条记录') };
      }),
      chipShown: ch.shown,
      chipHidden: ch.hidden,
      breeds: breeds,
      ob: { species: pet.species, breedIndex: bi, personIndex: pi },
      storyCount: (S.stories(pet.id) || []).length,
      petCount: S.pets().length,
      pets: S.pets().map(function (p) {
        var sub = (PT.breedLabel(p) || '') + (p.personality ? ' · ' + personLabelOf(p) : '');
        return { id: p.id, name: p.name, species: p.species, breedId: p.breedId || '', photo: p.photo || '', sub: sub, on: p.id === pet.id };
      }),
      cloudOn: require('../../utils/cloud.js').enabled()
    });
  },

  switchPet: function (e) {
    var id = e.currentTarget.dataset.id;
    if (!id) return;
    S.setActive(id);
    this.refresh();
    wx.showToast({ title: '换好了', icon: 'none' });
  },

  newPet: function () {
    var app = getApp();
    if (app && app.globalData) app.globalData.wantNewPet = true;
    wx.switchTab({ url: '/pages/home/home' });
  },

  goSpace: function () {
    wx.navigateTo({ url: '/pages/growth/growth' });
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
    var i = Number(e.detail.value);
    var list = PT.breedList(this.data.pet.species);
    if (i >= list.length) { this.askBreed(); return; }
    var b = list[i];
    S.updatePet(this.data.pet.id, { breedId: b.id });
    this.refresh();
  },

  /* 没有可选品种时，自己填一个 */
  askBreed: function () {
    var self = this;
    var pet = this.data.pet;
    wx.showModal({
      title: '它的品种叫什么',
      editable: true,
      placeholderText: '比如：小土狗、田园猫、串串',
      success: function (r) {
        if (!r.confirm) return;
        var label = String(r.content || '').trim();
        if (!label) return;
        var b = S.addBreed({ species: pet.species, label: label });
        if (!b) { wx.showToast({ title: '这个名字已经有了', icon: 'none' }); return; }
        S.updatePet(pet.id, { breedId: b.id });
        self.refresh();
        wx.showToast({ title: '加进来了', icon: 'none' });
      }
    });
  },


  onPerson: function (e) {
    var p = PERSONALITIES[Number(e.detail.value)];
    S.updatePet(this.data.pet.id, { personality: p.id, personalityText: '' });
    this.refresh();
  },

  onBirthday: function (e) {
    S.updatePet(this.data.pet.id, { birthday: e.detail.value });
    this.refresh();
  },

  onHomeDate: function (e) {
    S.updatePet(this.data.pet.id, { homeDate: e.detail.value });
    this.refresh();
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

  goCreate: function () {
    wx.navigateTo({ url: '/pages/today/today?new=1' });
  },

  demo: function () {
    S.seedDemo();
    this.refresh();
    wx.showToast({ title: '示例来了', icon: 'none' });
  }
});
