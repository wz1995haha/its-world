/* history.js — 病史：一次生病从头到尾 */
var PT = require('../../utils/all.js');
var themeStyle = require('../../utils/theme-style.js');
var S = PT.STORE;

Page({
  data: {
    themeStyle: '',
    petName: '',
    list: [],
    openCount: 0,
    totalCost: 0
  },

  onShow: function () {
    var t = themeStyle.styleNow();
    this.setData({ themeStyle: t.themeStyle });
    this.refresh();
  },

  refresh: function () {
    var pet = S.active();
    if (!pet) { this.setData({ list: [], openCount: 0, totalCost: 0 }); return; }

    var eps = S.episodes(pet.id);
    var cost = 0;
    var list = eps.map(function (e) {
      cost += Number(e.cost) || 0;
      var span = PT.daysBetween(e.start, e.end) + 1;
      return {
        name: e.name,
        open: e.open,
        start: PT.fmtShort(e.start),
        end: PT.fmtShort(e.end),
        span: span + ' 天',
        times: e.items.length,
        cost: Math.round(Number(e.cost || 0) * 10) / 10,
        items: e.items.map(function (r) {
          return {
            id: r.id,
            icon: PT.recIcon(r),
            title: PT.recTitle(r),
            day: PT.fmtShort(r.date)
          };
        })
      };
    });

    var openCount = 0;
    list.forEach(function (x) { if (x.open) openCount++; });

    this.setData({
      petName: pet.name,
      list: list,
      openCount: openCount,
      totalCost: Math.round(cost * 10) / 10
    });
  },

  /* 这次病好了 */
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

  openOne: function (e) {
    wx.navigateTo({ url: '/pages/record/record?id=' + e.currentTarget.dataset.id });
  },

  addVisit: function () {
    wx.navigateTo({ url: '/pages/record/record?kind=visit' });
  }
});
