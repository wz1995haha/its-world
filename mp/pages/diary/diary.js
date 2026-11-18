/* diary.js — 它写过的那些天 */
var PT = require('../../utils/all.js');
var themeStyle = require('../../utils/theme-style.js');
var S = PT.STORE;

Page({
  data: {
    themeStyle: '',
    hasPet: false,
    count: 0,
    months: []
  },

  onShow: function () {
    this.refresh();
  },

  refresh: function () {
    var t = themeStyle.styleNow();
    var pet = S.active();
    if (!pet) {
      this.setData({ themeStyle: t.themeStyle, hasPet: false, months: [] });
      return;
    }
    var start = pet.homeDate || pet.birthday || '';
    var days = S.allDays().filter(function (d) { return d.diary; });
    var months = [];
    var cur = null;
    days.forEach(function (d) {
      var dt = PT.parseDate(d.date);
      var m = dt.getFullYear() + ' 年 ' + (dt.getMonth() + 1) + ' 月';
      if (!cur || cur.title !== m) {
        cur = { title: m, items: [] };
        months.push(cur);
      }
      var no = start ? PT.daysBetween(start, d.date) + 1 : 0;
      var mood = PT.MOODS[d.diary.mood] || PT.MOODS.calm;
      cur.items.push({
        key: d.date,
        day: dt.getDate(),
        week: '周' + PT.weekShort[dt.getDay()],
        no: no,
        title: d.diary.title,
        teaser: String(d.diary.body || '').split('\n')[0].slice(0, 26),
        color: mood.color
      });
    });
    this.setData({
      themeStyle: t.themeStyle,
      hasPet: true,
      count: days.length,
      months: months
    });
  },

  open: function (e) {
    wx.navigateTo({ url: '/pages/entry/entry?key=' + e.currentTarget.dataset.key });
  }
});
