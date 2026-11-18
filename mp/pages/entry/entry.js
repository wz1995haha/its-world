/* entry.js — 一篇日记 */
var PT = require('../../utils/all.js');
var themeStyle = require('../../utils/theme-style.js');
var S = PT.STORE;

Page({
  data: {
    themeStyle: '',
    key: '',
    ok: false,
    title: '',
    paras: [],
    moodLabel: '',
    moodEmoji: '',
    tags: [],
    dayNo: 0,
    dateText: ''
  },

  onLoad: function (q) {
    this.setData({ key: q.key || PT.todayKey() });
    this.refresh();
  },

  onShow: function () {
    this.refresh();
  },

  refresh: function () {
    var t = themeStyle.styleNow();
    var key = this.data.key;
    var d = S.day(key);
    var pet = S.active();
    if (!d || !d.diary) {
      this.setData({ themeStyle: t.themeStyle, ok: false });
      return;
    }
    var start = (pet && (pet.homeDate || pet.birthday)) || '';
    var mood = PT.MOODS[d.diary.mood] || PT.MOODS.calm;
    this.setData({
      themeStyle: t.themeStyle,
      ok: true,
      title: d.diary.title,
      paras: String(d.diary.body || '').split('\n').filter(function (s) { return s.trim(); }),
      moodLabel: mood.label,
      moodEmoji: mood.emoji,
      tags: d.diary.tags || [],
      dayNo: start ? PT.daysBetween(start, key) + 1 : 0,
      dateText: PT.fmtCN(key)
    });
  },

  reroll: function () {
    var self = this;
    wx.showLoading({ title: '重新写…' });
    setTimeout(function () {
      S.generate(self.data.key, 1);
      wx.hideLoading();
      self.refresh();
      wx.showToast({ title: '换了一版', icon: 'none' });
    }, 60);
  },

  del: function () {
    var self = this;
    wx.showModal({
      title: '删掉这篇？',
      content: '今天记的事实还在，只是这篇日记没了',
      success: function (r) {
        if (!r.confirm) return;
        S.clearDiary(self.data.key);
        wx.navigateBack();
      }
    });
  },

  back: function () {
    wx.navigateBack();
  }
});
