/* record.js — 记一次（疫苗 / 驱虫 / 看病 / 用药 / 体重 / 体检 / 手术 / 其他） */
var PT = require('../../utils/all.js');
var themeStyle = require('../../utils/theme-style.js');
var cloud = require('../../utils/cloud.js');
var photo = require('../../utils/photo.js');

var S = PT.STORE;
var nav = require('../../utils/nav.js');

Page({
  data: {
    padTop: 60,
    themeStyle: '',
    editing: false,
    id: '',
    kinds: PT.REC_KINDS,
    kindIndex: 0,
    kind: 'vaccine',
    kindLabel: '疫苗',
    date: '',
    dateText: '',
    names: [],
    nameIndex: 0,
    name: '',
    routes: ['体内', '体外'],
    routeIndex: 0,
    route: '体内',
    drugs: PT.DEWORM_DRUGS,
    drugIndex: 0,
    drug: '',
    shot: '',
    num: '',
    days: '',
    illness: '',
    diagnosis: '',
    hospital: '',
    cost: '',
    note: '',
    next: '',
    nextText: '',
    autoNext: true,
    files: [],
    form: { item: '', place: '' },
    canSave: false
  },

  onLoad: function (q) {
    this.setData({ padTop: nav.info().padTop });
    var t = themeStyle.styleNow();
    var self = this;
    this.setData({ themeStyle: t.themeStyle });

    if (q && q.id) {
      var r = S.recById(q.id);
      if (!r) { wx.showToast({ title: '找不到这条', icon: 'none' }); return; }
      var ki = 0;
      PT.REC_KINDS.forEach(function (k, i) { if (k.id === r.kind) ki = i; });
      this.setData({
        editing: true,
        id: r.id,
        kindIndex: ki,
        kind: r.kind,
        kindLabel: (PT.KIND[r.kind] || {}).label || '记录',
        date: r.date,
        dateText: PT.fmtYMD(r.date),
        name: r.name || '',
        route: r.route || '体内',
        drug: r.drug || '',
        shot: r.shot ? String(r.shot) : '',
        num: r.num != null ? String(r.num) : '',
        days: r.days ? String(r.days) : '',
        illness: r.illness || '',
        diagnosis: r.diagnosis || '',
        hospital: r.hospital || '',
        cost: r.cost != null ? String(r.cost) : '',
        note: r.note || '',
        next: r.next || '',
        nextText: r.next ? PT.fmtYMD(r.next) : '',
        autoNext: !r.next,
        files: (r.files || []).slice()
      });
      this.syncNames(r.name);
      this.previewNext();
      return;
    }

    var kind = (q && q.kind) || 'vaccine';
    var ki = 0;
    PT.REC_KINDS.forEach(function (k, i) { if (k.id === kind) ki = i; });
    this.setData({
      kindIndex: ki,
      kind: kind,
      kindLabel: PT.REC_KINDS[ki].label,
      date: PT.todayKey(),
      dateText: PT.fmtYMD(PT.todayKey())
    });
    this.syncNames('');
    this.previewNext();
  },

  /* 疫苗有名字单，驱虫有药名单 */
  syncNames: function (cur) {
    var k = this.data.kind;
    if (k === 'vaccine') {
      var list = (PT.KIND.vaccine.names || []).slice();
      var i = list.indexOf(cur);
      this.setData({ names: list, nameIndex: i < 0 ? 0 : i, name: list[i < 0 ? 0 : i] });
    }
  },

  onKind: function (e) {
    var i = Number(e.detail.value);
    var k = PT.REC_KINDS[i];
    this.setData({ kindIndex: i, kind: k.id, kindLabel: k.label });
    this.syncNames('');
    this.previewNext();
  },

  onDate: function (e) {
    this.setData({ date: e.detail.value, dateText: PT.fmtYMD(e.detail.value) });
    this.previewNext();
  },

  onName: function (e) {
    var i = Number(e.detail.value);
    this.setData({ nameIndex: i, name: this.data.names[i] });
  },

  onRoute: function (e) {
    var i = Number(e.detail.value);
    this.setData({ routeIndex: i, route: this.data.routes[i] });
    this.previewNext();
  },

  onDrug: function (e) {
    var i = Number(e.detail.value);
    this.setData({ drugIndex: i, drug: this.data.drugs[i] });
  },

  onField: function (e) {
    var k = e.currentTarget.dataset.k;
    var patch = {};
    patch[k] = e.detail.value;
    this.setData(patch);
    if (k === 'next') {
      this.setData({ autoNext: !e.detail.value, nextText: e.detail.value ? PT.fmtYMD(e.detail.value) : '' });
    }
  },

  onShot: function (e) {
    this.setData({ shot: e.detail.value });
    this.previewNext();
  },

  /* 自动算下次：让用户看得见，也能手动改 */
  previewNext: function () {
    if (!this.data.autoNext) return;
    var pet = S.active();
    var rec = {
      kind: this.data.kind,
      name: this.data.name,
      route: this.data.route,
      shot: Number(this.data.shot || 0),
      date: this.data.date
    };
    var months = PT.cycleOf(pet && pet.species, rec);
    if (!months) {
      this.setData({ next: '', nextText: '这一类不设到期' });
      return;
    }
    var n = PT.addMonths(this.data.date, months);
    this.setData({ next: n, nextText: PT.fmtYMD(n) + '（' + months + ' 个月后）' });
  },

  /* ---------------- 附件 ---------------- */

  addPhoto: function () { this.pickFiles('image'); },
  addVideo: function () { this.pickFiles('video'); },

  addFile: function () {
    var self = this;
    if (!wx.chooseMessageFile) {
      wx.showToast({ title: '这个版本不支持选文件', icon: 'none' });
      return;
    }
    wx.chooseMessageFile({
      count: 5,
      type: 'file',
      success: function (res) {
        var files = (res.tempFiles || []).map(function (f) {
          return { kind: 'file', path: f.path, name: f.name, size: f.size };
        });
        self.uploadAll(files);
      }
    });
  },

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
          out.push({ kind: f.kind, fileID: fileID || '', path: fileID ? '' : f.path, name: f.name || '', w: f.w, h: f.h, dur: f.dur });
          step();
        });
      } else {
        photo.persist(f.path, function (saved) {
          out.push({ kind: f.kind, path: saved, name: f.name || '', w: f.w, h: f.h, dur: f.dur });
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
      else wx.previewImage({ urls: [src] });
    } else if (f.kind === 'photo') {
      wx.previewImage({ urls: [src] });
    } else {
      wx.showToast({ title: f.name || '文件已保存', icon: 'none' });
    }
  },

  /* ---------------- 保存 ---------------- */

  save: function () {
    var d = this.data;
    var rec = {
      kind: d.kind,
      date: d.date,
      next: d.autoNext ? '' : d.next,
      hospital: String(d.hospital || '').trim(),
      cost: d.cost === '' ? '' : Number(d.cost),
      note: String(d.note || '').trim(),
      files: d.files || []
    };

    if (d.kind === 'vaccine') {
      rec.name = d.name;
      rec.shot = Number(d.shot || 0);
    } else if (d.kind === 'deworm') {
      rec.route = d.route;
      rec.drug = d.drug || '';
    } else if (d.kind === 'bath' || d.kind === 'groom') {
      rec.item = String(d.form && d.form.item || '').trim();
      rec.place = String(d.form && d.form.place || '').trim();
    } else if (d.kind === 'med') {
      rec.drug = String(d.drug || '').trim() || '用药';
      rec.days = Number(d.days || 0);
      rec.illness = String(d.illness || '').trim();
    } else if (d.kind === 'weight') {
      rec.num = Number(d.num || 0);
    } else if (d.kind === 'visit') {
      rec.illness = String(d.illness || '').trim();
      rec.diagnosis = String(d.diagnosis || '').trim();
    }

    if (d.kind === 'weight' && !rec.num) { wx.showToast({ title: '填个体重', icon: 'none' }); return; }
    if (d.kind === 'visit' && !rec.illness && !rec.diagnosis) { wx.showToast({ title: '写上看的什么病', icon: 'none' }); return; }

    var saved;
    if (d.editing) saved = S.updateRecord(d.id, rec);
    else saved = S.addRecord(rec);

    if (saved) {
      var pet = S.active();
      if (pet && cloud.enabled()) cloud.push(pet.id);
      wx.showToast({ title: d.editing ? '已更新' : '记下了', icon: 'none' });
      setTimeout(function () { wx.navigateBack(); }, 320);
    } else {
      wx.showToast({ title: '没存上，再试一次', icon: 'none' });
    }
  },

  del: function () {
    var self = this;
    wx.showModal({
      title: '删掉这条记录？',
      content: '删了就没了，附件也一起删',
      success: function (r) {
        if (!r.confirm) return;
        S.removeRecord(self.data.id);
        wx.showToast({ title: '删了', icon: 'none' });
        setTimeout(function () { wx.navigateBack(); }, 300);
      }
    });
  }
});
