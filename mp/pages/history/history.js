/* history.js — 档案：疫苗 / 驱虫 / 病史 一页看完 */
var PT = require('../../utils/all.js');
var themeStyle = require('../../utils/theme-style.js');
var S = PT.STORE;
var nav = require('../../utils/nav.js');

var YEAR = new Date().getFullYear();

function yearOf(key) { return String(key || '').slice(0, 4); }

function statusOf(days) {
  if (days < 0) return { cls: 'over', text: '晚了 ' + Math.abs(days) + ' 天' };
  if (days === 0) return { cls: 'soon', text: '就是今天' };
  if (days <= 30) return { cls: 'soon', text: '还有 ' + days + ' 天' };
  if (days < 365) return { cls: 'ok', text: '还有 ' + Math.round(days / 30) + ' 个月' };
  return { cls: 'ok', text: '还有 ' + Math.round(days / 365 * 10) / 10 + ' 年' };
}

Page({
  data: {
    padTop: 60,
    nowYear: new Date().getFullYear(),
    themeStyle: '',
    hasPet: false,
    petName: '',
    pets: [],
    ageLine: '',
    vaccines: [],
    deworm: [],
    care: [],
    recent: [],
    list: [],
    openCount: 0,
    totalCost: 0,
    sum: { first: '', count: 0, inLast: '', outLast: '' }
  },

  onShow: function () {
    var app0 = getApp();
    if (app0 && app0.globalData) app0.globalData.dirtyAt = 0;
    var t = themeStyle.styleNow();
    this.setData({ themeStyle: t.themeStyle, padTop: nav.info().padTop });
    this.refresh();
  },

  refresh: function () {
    var pet = S.active();
    if (!pet) { this.setData({ hasPet: false }); return; }

    var recs = S.records(pet.id) || [];
    var due = S.dueList(pet.id) || [];

    /* ---- 疫苗：这一年的「每年必打」打了没有 ---- */
    var names = (PT.KIND.vaccine.names || []).slice();
    /* 狗：狂犬 + 联苗；猫：猫三联 + 狂犬 */
    var want = pet.species === 'cat' ? ['猫三联', '狂犬疫苗'] : ['狂犬疫苗', '联苗'];
    var vaccines = want.map(function (nm) {
      var rs = recs.filter(function (r) { return r.kind === 'vaccine' && (r.name || '') === nm; });
      var last = rs[0] || null;
      var done = last ? yearOf(last.date) === String(YEAR) : false;
      var nextDays = last && last.next ? PT.daysBetween(PT.todayKey(), last.next) : null;
      return {
        name: nm,
        done: done,
        doneText: last ? PT.fmtShort(last.date) : '',
        next: last && last.next ? PT.fmtShort(last.next) : '',
        nextDays: nextDays,
        st: nextDays === null ? { cls: 'none', text: '还没记过' } : statusOf(nextDays)
      };
    });

    /* ---- 驱虫：体内 / 体外 分开 ---- */
    var deworm = ['体内', '体外'].map(function (route) {
      var d = due.filter(function (x) { return x.kind === 'deworm' && x.route === route; })[0];
      if (!d) return { route: route, has: false, st: { cls: 'none', text: '还没记过' } };
      return {
        route: route,
        has: true,
        last: PT.fmtShort(d.last),
        next: PT.fmtShort(d.next),
        st: statusOf(d.days)
      };
    });

    /* ---- 洗澡 / 美容：各一行，看上次和下次 ---- */
    var care = ['bath', 'groom'].map(function (kind) {
      var d = due.filter(function (x) { return x.kind === kind; })[0];
      var K = PT.KIND[kind] || {};
      if (!d) return { kind: kind, label: K.label || kind, icon: K.icon || '📌', has: false, st: { cls: 'none', text: '还没记过' } };
      return {
        kind: kind,
        label: K.label || kind,
        icon: K.icon || '📌',
        has: true,
        last: PT.fmtShort(d.last),
        next: PT.fmtShort(d.next),
        st: statusOf(d.days)
      };
    });

    /* ---- 最近记录：什么类型都列出来，避免「记了却看不到」 ---- */
    var recent = recs.slice(0, 8).map(function (r) {
      return {
        id: r.id,
        icon: PT.recIcon(r),
        title: PT.recTitle(r),
        day: PT.fmtShort(r.date),
        cost: Number(r.cost) || 0
      };
    });

    /* ---- 病史 ---- */
    var cost = 0;
    var list = (S.episodes(pet.id) || []).map(function (e) {
      cost += Number(e.cost) || 0;
      return {
        name: e.name,
        open: e.open,
        start: PT.fmtShort(e.start),
        end: PT.fmtShort(e.end),
        span: (PT.daysBetween(e.start, e.end) + 1) + ' 天',
        times: e.items.length,
        cost: Math.round(Number(e.cost || 0) * 10) / 10,
        items: e.items.map(function (r) {
          return { id: r.id, icon: PT.recIcon(r), title: PT.recTitle(r), day: PT.fmtShort(r.date) };
        })
      };
    });
    var openCount = 0;
    list.forEach(function (x) { if (x.open) openCount++; });

    /* ---- 汇总 ---- */
    var vac = recs.filter(function (r) { return r.kind === 'vaccine'; });
    var first = vac.length ? vac[vac.length - 1] : null;
    var ins = recs.filter(function (r) { return r.kind === 'deworm' && r.route === '体内'; })[0];
    var outs = recs.filter(function (r) { return r.kind === 'deworm' && r.route === '体外'; })[0];

    this.setData({
      hasPet: true,
      petName: pet.name,
      pets: S.pets().map(function (p) {
        return { id: p.id, name: p.name, on: p.id === pet.id };
      }),
      ageLine: pet.birthday ? '第 ' + (PT.daysBetween(pet.homeDate || pet.createdAt.slice(0, 10), PT.todayKey()) + 1) + ' 天' : '',
      vaccines: vaccines,
      deworm: deworm,
      care: care,
      recent: recent,
      list: list,
      openCount: openCount,
      totalCost: Math.round(cost * 10) / 10,
      sum: {
        first: first ? PT.fmtShort(first.date) : '还没记',
        count: vac.length,
        inLast: ins ? PT.fmtShort(ins.date) : '还没记',
        outLast: outs ? PT.fmtShort(outs.date) : '还没记'
      }
    });
  },

  switchPet: function (e) {
    var id = e.currentTarget.dataset.id;
    if (!id) return;
    S.setActive(id);
    this.refresh();
  },

  /* 点疫苗/驱虫那一行，直接去记一次 */
  addVaccine: function (e) {
    var name = e.currentTarget.dataset.name || '';
    wx.navigateTo({ url: '/pages/record/record?kind=vaccine&name=' + name });
  },

  addCare: function (e) {
    var kind = e.currentTarget.dataset.kind;
    wx.navigateTo({ url: '/pages/record/record?kind=' + kind });
  },

  addDeworm: function (e) {
    var route = e.currentTarget.dataset.route || '';
    wx.navigateTo({ url: '/pages/record/record?kind=deworm&route=' + route });
  },

  addVisit: function () {
    wx.navigateTo({ url: '/pages/record/record?kind=visit' });
  },

  openOne: function (e) {
    wx.navigateTo({ url: '/pages/record/record?id=' + e.currentTarget.dataset.id });
  },

  closeOne: function (e) {
    var name = e.currentTarget.dataset.name;
    var self = this;
    wx.showModal({
      title: '这次算好了？',
      content: '「' + name + '」下面的记录会标成已好，之后还能改回来。',
      success: function (r) {
        if (!r.confirm) return;
        var pet = S.active();
        if (pet) S.closeEpisode(pet.id, name);
        self.refresh();
      }
    });
  },

  reopen: function (e) {
    var name = e.currentTarget.dataset.name;
    var pet = S.active();
    if (pet) S.reopenEpisode(pet.id, name);
    this.refresh();
  },

  goRecord: function () { wx.switchTab({ url: '/pages/records/records' }); }
});
