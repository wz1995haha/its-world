/* archive.js — 档案：一张表 + 一条时间线 */
var PT = require('../../utils/all.js');
var themeStyle = require('../../utils/theme-style.js');
var photo = require('../../utils/photo.js');
var S = PT.STORE;

function ageText(birthday, dateKey) {
  if (!birthday || !dateKey) return '';
  var b = PT.parseDate(birthday);
  var d = PT.parseDate(dateKey);
  if (d < b) return '';
  var y = d.getFullYear() - b.getFullYear();
  var m = d.getMonth() - b.getMonth();
  if (m < 0) { y -= 1; m += 12; }
  if (y <= 0 && m <= 0) return '刚出生';
  if (y <= 0) return m + ' 个月';
  return y + ' 岁' + (m ? ' ' + m + ' 个月' : '');
}

function countType(days, type) {
  var n = 0, last = '';
  days.forEach(function (d) {
    (d.events || []).forEach(function (e) {
      if (e.type === type) {
        n++;
        if (d.date > last) last = d.date;
      }
    });
  });
  return { n: n, last: last };
}

Page({
  data: {
    themeStyle: '',
    hasPet: false,
    pet: null,
    face: { species: 'cat', mood: 'calm', breedId: '' },
    rows: [],
    years: [],
    weight: null,
    editing: false,
    breedLabels: [],
    breedIds: [],
    edit: { birth: '', home: '', breedIndex: 0, weight: '', fields: [] }
  },

  onShow: function () {
    this.refresh();
  },

  refresh: function () {
    var t = themeStyle.styleNow();
    var pet = S.active();
    if (!pet) {
      this.setData({ themeStyle: t.themeStyle, hasPet: false });
      return;
    }
    var days = S.allDays();
    var stats = S.stats();
    var ws = S.weights();
    var lastW = ws.length ? ws[ws.length - 1] : null;
    var vac = countType(days, 'vaccine');
    var dew = countType(days, 'deworm');

    var rows = [
      { k: '出生', v: pet.birthday ? PT.fmtYMD(pet.birthday) : '还没填' },
      { k: '到家', v: pet.homeDate ? PT.fmtYMD(pet.homeDate) : '还没填' },
      { k: '品种', v: PT.breedLabel(pet) || '—' },
      { k: '现在体重', v: lastW ? lastW.kg + ' kg · ' + PT.fmtShort(lastW.date) : '还没记' },
      { k: '疫苗', v: vac.n ? vac.n + ' 次 · 最近 ' + PT.fmtShort(vac.last) : '还没记' },
      { k: '驱虫', v: dew.n ? dew.n + ' 次 · 最近 ' + PT.fmtShort(dew.last) : '还没记' }
    ];

    /* 时间线：手记节点 + 生日到家 + 健康事件 */
    var items = [];
    S.milestones().forEach(function (m) {
      items.push({ date: m.date, label: m.label, icon: m.icon || '⭐️', mine: true, id: m.id });
    });
    if (pet.birthday) items.push({ date: pet.birthday, label: '出生', icon: '🎂', mine: false });
    if (pet.homeDate) items.push({ date: pet.homeDate, label: '到家', icon: '🏠', mine: false });
    days.forEach(function (d) {
      (d.events || []).forEach(function (e) {
        if (PT.HEALTH.indexOf(e.type) < 0) return;
        var ty = PT.TYPE[e.type];
        items.push({ date: d.date, label: ty ? ty.label : e.type, icon: ty ? ty.icon : '·', mine: false });
      });
    });
    var seen = {};
    items = items.filter(function (it) {
      var k = it.date + '|' + it.label;
      if (seen[k]) return false;
      seen[k] = 1;
      return true;
    }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });

    var years = [];
    var cur = null;
    items.forEach(function (it) {
      var y = it.date.slice(0, 4) + ' 年';
      if (!cur || cur.title !== y) {
        cur = { title: y, items: [] };
        years.push(cur);
      }
      var dt = PT.parseDate(it.date);
      cur.items.push({
        id: it.id,
        mine: it.mine,
        dateText: (dt.getMonth() + 1) + '月' + dt.getDate() + '日',
        label: it.label,
        icon: it.icon,
        age: ageText(pet.birthday, it.date)
      });
    });

    this.setData({
      themeStyle: t.themeStyle,
      hasPet: true,
      pet: pet,
      breedLabel: PT.breedLabel(pet) || '',
      personLabel: (function () {
        var p = pet.personality;
        var map = { tsundere: '傲娇', clingy: '黏人', aloof: '高冷', foodie: '贪吃', curious: '好奇', custom: '自己写' };
        return map[p] || (pet.personalityText || '');
      })(),
      face: { species: pet.species, mood: 'calm', breedId: pet.breedId || '' },
      rows: rows,
      years: years,
      weight: lastW ? { kg: lastW.kg, dateText: PT.fmtYMD(lastW.date) } : null,
      together: stats.together
    });
  },

  /* ---------- 头像：点一下换 ---------- */

  tapFace: function () {
    var self = this;
    var pet = S.active();
    if (!pet) return;
    var list = ['上传它的照片', '选一个画的品种'];
    if (pet.photo) list.push('用回画的');
    wx.showActionSheet({
      itemList: list,
      success: function (r) {
        if (r.tapIndex === 0) self.choosePhoto();
        else if (r.tapIndex === 1) self.editOpen();
        else self.clearPhoto();
      }
    });
  },

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
    wx.showToast({ title: '用回画的了', icon: 'none' });
  },

  /* ---------- 档案表：编辑 ---------- */

  editOpen: function () {
    var pet = S.active();
    if (!pet) return;
    var breeds = PT.BREEDS[pet.species] || [];
    var labels = breeds.map(function (b) { return b.label; });
    var ids = breeds.map(function (b) { return b.id; });
    var wi = ids.indexOf(pet.breedId || '');
    var ws = S.weights();
    var lastW = ws.length ? ws[ws.length - 1] : null;

    this.setData({
      editing: true,
      breedLabels: labels,
      breedIds: ids,
      edit: {
        birth: pet.birthday || '',
        home: pet.homeDate || '',
        breedIndex: wi < 0 ? 0 : wi,
        weight: lastW ? String(lastW.kg) : '',
        fields: (S.fields(pet.id) || []).map(function (f, i) {
          return { key: f.id || ('n' + i), id: f.id, label: f.label, value: f.value };
        })
      }
    });
  },

  editCancel: function () {
    this.setData({ editing: false });
  },

  pickBirth: function (e) {
    this.setData({ 'edit.birth': e.detail.value });
  },

  pickHome: function (e) {
    this.setData({ 'edit.home': e.detail.value });
  },

  pickBreed: function (e) {
    this.setData({ 'edit.breedIndex': +e.detail.value });
  },

  onInput: function (e) {
    this.setData({ 'edit.weight': e.detail.value });
  },

  onField: function (e) {
    var idx = +e.currentTarget.dataset.idx;
    var k = e.currentTarget.dataset.k;
    var patch = {};
    patch['edit.fields[' + idx + '].' + k] = e.detail.value;
    this.setData(patch);
  },

  addField: function () {
    var list = this.data.edit.fields.slice();
    list.push({ key: 'n' + Date.now(), id: '', label: '', value: '' });
    this.setData({ 'edit.fields': list });
  },

  delField: function (e) {
    var idx = +e.currentTarget.dataset.idx;
    var list = this.data.edit.fields.slice();
    list.splice(idx, 1);
    this.setData({ 'edit.fields': list });
  },

  editSave: function () {
    var pet = S.active();
    if (!pet) return;
    var E = this.data.edit;
    var breeds = PT.BREEDS[pet.species] || [];
    var breedId = breeds[E.breedIndex] ? breeds[E.breedIndex].id : pet.breedId;

    S.updatePet(pet.id, {
      birthday: E.birth || '',
      homeDate: E.home || '',
      breedId: breedId,
      breed: breedId
    });

    /* 自定义字段：先清空再按当前行写回（空行丢弃） */
    S.fields(pet.id).forEach(function (f) {
      S.removeField(pet.id, f.id);
    });
    E.fields.forEach(function (f) {
      var label = String(f.label || '').trim();
      var value = String(f.value || '').trim();
      if (!label) return;
      S.addField(pet.id, label, value);
    });

    /* 体重：变了就当成今天又称了一次 */
    var w = parseFloat(String(E.weight).replace(/[^\d.]/g, ''));
    var ws = S.weights();
    var lastW = ws.length ? ws[ws.length - 1] : null;
    if (!isNaN(w) && w > 0 && (!lastW || Math.abs(lastW.kg - w) > 0.001)) {
      var key = PT.todayKey();
      var day = S.day(key) || { events: [] };
      var ev = null;
      (day.events || []).forEach(function (x) {
        if (x.type === 'weight') ev = x;
      });
      if (ev) S.updateEvent(key, ev.id, { num: w });
      else S.addEvent(key, 'weight', { num: w });
    }

    this.setData({ editing: false });
    this.refresh();
    wx.showToast({ title: '档案已更新', icon: 'none' });
  },

  addNode: function () {
    var self = this;
    wx.showModal({
      title: '记一个重要节点',
      editable: true,
      placeholderText: '比如：绝育手术、搬家到新家',
      success: function (r) {
        if (!r.confirm) return;
        var label = String(r.content || '').trim().slice(0, 14);
        if (!label) return;
        var y = new Date().getFullYear();
        wx.showModal({
          title: '哪天？',
          editable: true,
          content: PT.todayKey(),
          placeholderText: 'YYYY-MM-DD',
          success: function (r2) {
            if (!r2.confirm) return;
            var d = String(r2.content || '').trim();
            if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
              wx.showToast({ title: '日期要写成 2026-11-18', icon: 'none' });
              return;
            }
            S.addMilestone(d, label, '⭐️');
            self.refresh();
            wx.showToast({ title: '记下了', icon: 'none' });
          }
        });
      }
    });
  },

  delNode: function (e) {
    var id = e.currentTarget.dataset.id;
    var self = this;
    wx.showModal({
      title: '删掉这个节点？',
      content: '只是手记的那一条，日记里的记录不受影响',
      success: function (r) {
        if (!r.confirm) return;
        S.removeMilestone(id);
        self.refresh();
      }
    });
  }
});
