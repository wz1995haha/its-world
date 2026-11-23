/* growth.js — 它的空间：从出生到现在的成长时间线 */
var PT = require('../../utils/all.js');
var themeStyle = require('../../utils/theme-style.js');
var cloud = require('../../utils/cloud.js');
var nav = require('../../utils/nav.js');

var S = PT.STORE;

var TAGS = ['第一次', '生日', '日常', '训练', '旅行', '生病', '换毛', '其他'];

function cn(key) {
  if (!key) return '';
  var d = PT.parseDate(key);
  return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
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

function daysBetween(a, b) {
  return PT.daysBetween(a, b);
}

Page({
  data: {
    padTop: 60,
    themeStyle: '',
    hasPet: false,
    pet: null,
    face: { species: 'cat', mood: 'calm', breedId: '' },
    groups: [],
    total: 0,
    files: 0,
    ageLine: ''
  },

  onLoad: function () {
    this.setData({ padTop: nav.info().padTop });
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
    cloud.pull(function (ok) {
      if (ok) self.refresh();
    });
  },

  refresh: function () {
    var t = themeStyle.styleNow();
    var pet = S.active();
    if (!pet) {
      this.setData({ themeStyle: t.themeStyle, hasPet: false, groups: [] });
      return;
    }

    var list = S.stories(pet.id) || [];
    var groups = [];
    var lastKey = '';
    list.forEach(function (x) {
      var y = String(x.date || '').slice(0, 4);
      if (y !== lastKey) {
        groups.push({ type: 'year', key: y, label: y ? y + ' 年' : '没写日期' });
        lastKey = y;
      }
      var photos = (x.files || []).filter(function (f) { return f.kind !== 'video'; });
      var videos = (x.files || []).filter(function (f) { return f.kind === 'video'; });
      groups.push({
        type: 'item',
        id: x.id,
        date: cn(x.date),
        tag: x.tag || '',
        title: x.title || '',
        text: x.text || '',
        more: (x.text || '').length > 60,
        photos: photos.slice(0, 4),
        photoCount: photos.length,
        videoCount: videos.length,
        video: videos.length ? videos[0] : null,
        age: pet.birthday ? ('第 ' + (daysBetween(pet.birthday, x.date) + 1) + ' 天') : ''
      });
    });

    this.setData({
      themeStyle: t.themeStyle,
      hasPet: true,
      pet: pet,
      face: { species: pet.species, mood: 'calm', breedId: pet.breedId || '', photo: pet.photo || '' },
      groups: groups,
      total: list.length,
      files: S.storyCount ? S.storyCount(list) : 0,
      ageLine: ageOf(pet.birthday)
    });
  },

  add: function () {
    wx.navigateTo({ url: '/pages/story/story' });
  },

  openOne: function (e) {
    wx.navigateTo({ url: '/pages/story/story?id=' + e.currentTarget.dataset.id });
  },

  previewPhoto: function (e) {
    var d = e.currentTarget.dataset;
    var urls = (d.urls || '').split('|').filter(Boolean);
    if (!urls.length) return;
    if (wx.previewImage) wx.previewImage({ current: d.url || urls[0], urls: urls });
  },

  playVideo: function (e) {
    var src = e.currentTarget.dataset.src;
    if (!src) return;
    if (wx.previewMedia) wx.previewMedia({ sources: [{ url: src, type: 'video' }] });
    else wx.showToast({ title: '这条视频在手机上打不开', icon: 'none' });
  }
});
