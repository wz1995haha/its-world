/* story.js — 写一条成长记录（文字 + 照片 + 视频） */
var PT = require('../../utils/all.js');
var themeStyle = require('../../utils/theme-style.js');
var cloud = require('../../utils/cloud.js');
var nav = require('../../utils/nav.js');
var photo = require('../../utils/photo.js');

var S = PT.STORE;

var TAGS = ['第一次', '生日', '日常', '训练', '旅行', '生病', '换毛', '其他'];

Page({
  data: {
    padTop: 60,
    themeStyle: '',
    editing: false,
    id: '',
    date: '',
    dateText: '',
    tag: '日常',
    tags: TAGS,
    title: '',
    text: '',
    files: []
  },

  onLoad: function (q) {
    this.setData({ padTop: nav.info().padTop });
    var id = q && q.id;
    if (id) {
      var it = S.storyById(id);
      if (it) {
        this.setData({
          editing: true,
          id: it.id,
          date: it.date,
          dateText: it.date,
          tag: it.tag || '日常',
          title: it.title || '',
          text: it.text || '',
          files: (it.files || []).slice()
        });
        wx.setNavigationBarTitle({ title: '改这一条' });
        return;
      }
    }
    var d = PT.todayKey();
    this.setData({ date: d, dateText: d });
  },

  onDate: function (e) {
    this.setData({ date: e.detail.value, dateText: e.detail.value });
  },

  pickTag: function (e) {
    this.setData({ tag: e.currentTarget.dataset.tag });
  },

  onTitle: function (e) {
    this.setData({ title: e.detail.value });
  },

  onText: function (e) {
    this.setData({ text: e.detail.value });
  },

  addPhoto: function () { this.pickFiles('image'); },
  addVideo: function () { this.pickFiles('video'); },

  pickFiles: function (mediaType) {
    var self = this;
    wx.chooseMedia({
      count: mediaType === 'image' ? 9 : 1,
      mediaType: [mediaType],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      maxDuration: 60,
      success: function (res) {
        var files = (res.tempFiles || []).map(function (f) {
          return {
            kind: mediaType === 'video' ? 'video' : 'photo',
            path: f.tempFilePath,
            w: f.width, h: f.height, dur: Math.round(f.duration || 0)
          };
        });
        self.uploadAll(files);
      }
    });
  },

  uploadAll: function (list) {
    var self = this;
    if (!list.length) return;
    wx.showLoading({ title: cloud.enabled() ? '上传中' : '保存中', mask: true });
    var i = 0;
    var out = (this.data.files || []).slice();
    function step() {
      if (i >= list.length) {
        wx.hideLoading();
        self.setData({ files: out });
        return;
      }
      var f = list[i++];
      if (cloud.enabled()) {
        cloud.upload(f.path, f.kind, function (fileID) {
          out.push({ kind: f.kind, fileID: fileID || '', path: fileID ? '' : f.path, w: f.w, h: f.h, dur: f.dur });
          step();
        });
      } else {
        photo.persist(f.path, function (saved) {
          out.push({ kind: f.kind, path: saved, w: f.w, h: f.h, dur: f.dur });
          step();
        });
      }
    }
    step();
  },

  delFile: function (e) {
    var i = Number(e.currentTarget.dataset.i);
    var files = (this.data.files || []).slice();
    files.splice(i, 1);
    this.setData({ files: files });
  },

  previewFile: function (e) {
    var i = Number(e.currentTarget.dataset.i);
    var f = (this.data.files || [])[i];
    if (!f) return;
    var src = f.fileID || f.path;
    if (!src) return;
    if (f.kind === 'video') {
      if (wx.previewMedia) wx.previewMedia({ sources: [{ url: src, type: 'video' }] });
    } else {
      wx.previewImage({ urls: this.data.files.filter(function (x) { return x.kind !== 'video'; }).map(function (x) { return x.fileID || x.path; }) });
    }
  },

  save: function () {
    var d = this.data;
    if (!String(d.text || '').trim() && !(d.files || []).length) {
      wx.showToast({ title: '写一句，或者放一张图', icon: 'none' });
      return;
    }
    var pet = S.active();
    if (!pet) return;
    var payload = {
      date: d.date,
      tag: d.tag,
      title: String(d.title || '').trim(),
      text: String(d.text || '').trim(),
      files: d.files || []
    };
    if (d.editing) S.updateStory(pet.id, d.id, payload);
    else S.addStory(pet.id, payload);

    wx.showToast({ title: '记下了', icon: 'none' });
    var self = this;
    setTimeout(function () {
      if (cloud.enabled()) cloud.push(pet.id);
      wx.navigateBack();
    }, 300);
  },

  del: function () {
    var self = this;
    wx.showModal({
      title: '删掉这一条？',
      content: '照片和视频也会从这条记录里移除。',
      success: function (r) {
        if (!r.confirm) return;
        var pet = S.active();
        S.removeStory(pet.id, self.data.id);
        if (cloud.enabled()) cloud.push(pet.id);
        wx.navigateBack();
      }
    });
  }
});
