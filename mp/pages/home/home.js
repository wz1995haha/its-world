/* home.js — 该做什么：下次驱虫 / 打针，一目了然 */
var PT = require('../../utils/all.js');
var themeStyle = require('../../utils/theme-style.js');
var cloud = require('../../utils/cloud.js');

var S = PT.STORE;

function cnDate(key) {
  if (!key) return '';
  var d = PT.parseDate(key);
  return (d.getMonth() + 1) + '月' + d.getDate() + '日';
}

function ageText(birth) {
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

function agoText(key) {
  var n = PT.daysBetween(key, PT.todayKey());
  if (n <= 0) return '今天';
  if (n === 1) return '昨天';
  if (n < 30) return n + ' 天前';
  if (n < 365) return Math.floor(n / 30) + ' 个月前';
  return Math.floor(n / 365) + ' 年前';
}

function cycleText(months) {
  if (!months) return '不设到期';
  if (months === 1) return '每月';
  if (months === 3) return '每三个月';
  if (months === 6) return '每半年';
  if (months === 12) return '每年';
  return '每 ' + months + ' 个月';
}

Page({
  data: {
    themeStyle: '',
    hasPet: false,
    pets: [],
    pet: null,
    face: { species: 'cat', mood: 'calm', breedId: '' },
    dateLine: '',
    hasDiaryToday: false,
    headline: '',
    headlineSub: '',
    todos: [],
    quick: [
      { kind: 'vaccine', label: '疫苗', icon: '💉' },
      { kind: 'deworm', label: '驱虫', icon: '🐛' },
      { kind: 'visit', label: '看病', icon: '🏥' },
      { kind: 'weight', label: '体重', icon: '⚖️' }
    ],
    recent: [],
    costYear: 0,
    diaryLine: '',
    cloudOn: false
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
    this.refresh();
    if (cloud.enabled()) {
      var now = Date.now();
      if (!this._lastPull || now - this._lastPull > 60000) {
        this._lastPull = now;
        this.pull();
      }
    }
  },

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
      (res.days || []).forEach(function (rd) {
        if (!rd || !rd.key || !rd.petId) return;
        var box = {};
        Object.keys(rd).forEach(function (k) { if (k.indexOf('_') !== 0) box[k] = rd[k]; });
        S.importDay(rd.petId, rd.key, box);
        changed++;
      });
      (res.records || []).forEach(function (rr) {
        if (!rr || !rr.id || !rr.petId) return;
        var box = {};
        Object.keys(rr).forEach(function (k) { if (k.indexOf('_') !== 0) box[k] = rr[k]; });
        S.importRecord(rr.petId, box);
        changed++;
      });
      if (changed) { self.refresh(); }
    });
  },

  refresh: function () {
    var t = themeStyle.styleNow();
    var pets = S.pets() || [];
    var pet = S.active();

    if (!pet) {
      this.setData({ themeStyle: t.themeStyle, hasPet: false, pets: [] });
      return;
    }

    var key = PT.todayKey();
    var due = S.dueList();
    var remind = S.reminders();
    var todos = due.slice(0, 3).map(function (d) {
      return {
        key: d.key, kind: d.kind, icon: d.icon, name: d.name,
        last: cnDate(d.last), next: cnDate(d.next), days: d.days, status: d.status,
        bell: remind.indexOf(d.key) >= 0,
        months: d.months,
        badge: d.status === 'over' ? ('晚了 ' + Math.abs(d.days) + ' 天')
          : d.status === 'soon' ? ('还有 ' + d.days + ' 天')
          : ('还有 ' + Math.round(d.days / 30) + ' 个月')
      };
    });

    /* 标题：像日历那样说「下次驱虫：11月27日」；已经过期就说「该驱虫了：11月1日」 */
    var headline = '还没有记录';
    var sub = '先记一次疫苗或驱虫，之后就不用自己算日子了';
    var first = due[0];
    if (first) {
      var short = first.kind === 'deworm'
        ? (first.route === '体外' ? '体外驱虫' : '体内驱虫')
        : (first.kind === 'vaccine' ? (first.name || '疫苗') : '体检');
      var over = first.status === 'over';
      var lead = over
        ? (/疫苗/.test(short) ? '该打' + short + '了' : '该' + short + '了')
        : '下次' + short;
      headline = lead + '：' + cnDate(first.next);
      sub = (over ? '已经晚了 ' + Math.abs(first.days) + ' 天'
        : first.days === 0 ? '就是今天'
        : '还有 ' + first.days + ' 天')
        + ' · 上次 ' + PT.fmtShort(first.last) + ' · ' + cycleText(first.months);
    }

    var recent = S.records().slice(0, 5).map(function (r) {
      return {
        id: r.id, icon: PT.recIcon(r), title: PT.recTitle(r),
        date: cnDate(r.date), ago: agoText(r.date),
        sub: (r.hospital || '') + (r.cost ? (r.hospital ? ' · ' : '') + '¥' + r.cost : ''),
        n: (r.files || []).length
      };
    });

    var d = S.day(key);
    this.setData({
      themeStyle: t.themeStyle,
      hasPet: true,
      pets: pets.map(function (p) {
        return { id: p.id, name: p.name, species: p.species, breedId: p.breedId || '', on: p.id === pet.id };
      }),
      pet: pet,
      face: { species: pet.species, mood: 'calm', breedId: pet.breedId || '' },
      dateLine: PT.fmtCN(key) + ' · ' + pet.name + (pet.birthday ? ' ' + ageText(pet.birthday) : ''),
      headline: headline,
      headlineSub: sub,
      todos: todos,
      recent: recent,
      costYear: S.costSum(pet.id, key.slice(0, 4) + '-01-01'),
      diaryLine: (d && d.diary && d.diary.body) ? String(d.diary.body).split('\n')[0] : '',
      hasDiaryToday: !!(d && d.diary)
    });
  },

  switchPet: function (e) {
    S.setActive(e.currentTarget.dataset.id);
    this.refresh();
  },

  openRecord: function (e) {
    var kind = e.currentTarget.dataset.kind || '';
    var key = e.currentTarget.dataset.key || '';
    wx.navigateTo({ url: '/pages/record/record?kind=' + kind + '&track=' + key });
  },

  toggleBell: function (e) {
    var key = e.currentTarget.dataset.key;
    var on = S.toggleReminder(key);
    this.refresh();
    wx.showToast({
      title: on ? '到期前会提醒你一次' : '不再提醒',
      icon: 'none'
    });
  },

  openOne: function (e) {
    wx.navigateTo({ url: '/pages/record/record?id=' + e.currentTarget.dataset.id });
  },

  goRecords: function () { wx.switchTab({ url: '/pages/records/records' }); },
  goHistory: function () { wx.switchTab({ url: '/pages/history/history' }); },
  goPet: function () { wx.switchTab({ url: '/pages/pet/pet' }); },
  goDiary: function () { wx.navigateTo({ url: '/pages/today/today' }); },

  start: function () {
    wx.navigateTo({ url: '/pages/today/today?new=1' });
  }
});
