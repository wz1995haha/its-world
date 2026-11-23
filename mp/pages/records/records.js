/* records.js — 全部记录（按时间倒序，可按类型筛） */
var PT = require('../../utils/all.js');
var themeStyle = require('../../utils/theme-style.js');
var S = PT.STORE;
var nav = require('../../utils/nav.js');

var FILTERS = [
  { id: 'all', label: '全部' },
  { id: 'vaccine', label: '疫苗' },
  { id: 'deworm', label: '驱虫' },
  { id: 'visit', label: '看病' },
  { id: 'med', label: '用药' },
  { id: 'weight', label: '体重' },
  { id: 'exam', label: '体检' },
  { id: 'surgery', label: '手术' },
  { id: 'other', label: '其他' }
];

Page({
  data: {
    padTop: 60,
    themeStyle: '',
    filters: FILTERS,
    filter: 'all',
    petName: '',
    list: [],
    month: '',
    total: 0,
    totalCost: 0
  },

  onShow: function () {
    var t = themeStyle.styleNow();
    this.setData({ themeStyle: t.themeStyle });
    this.refresh();
  },

  refresh: function () {
    var pet = S.active();
    if (!pet) { this.setData({ list: [], total: 0, totalCost: 0, petName: '' }); return; }

    var all = S.records(pet.id);
    var f = this.data.filter;
    var rows = all.filter(function (r) { return f === 'all' || r.kind === f; });

    var cost = 0;
    rows.forEach(function (r) { if (r.cost) cost += Number(r.cost) || 0; });

    var out = [];
    var lastMonth = '';
    rows.forEach(function (r) {
      var m = r.date.slice(0, 7);
      if (m !== lastMonth) {
        lastMonth = m;
        out.push({ type: 'month', key: 'm-' + m, text: m.slice(0, 4) + ' 年 ' + Number(m.slice(5)) + ' 月' });
      }
      out.push({
        type: 'rec',
        key: r.id,
        id: r.id,
        icon: PT.recIcon(r),
        title: PT.recTitle(r),
        day: PT.fmtShort(r.date),
        cost: r.cost,
        files: (r.files || []).length,
        sub: r.hospital || ''
      });
    });

    this.setData({
      petName: pet.name,
      list: out,
      total: rows.length,
      totalCost: Math.round(cost * 10) / 10
    });
  },

  onFilter: function (e) {
    this.setData({ filter: e.currentTarget.dataset.id }, this.refresh);
  },

  openOne: function (e) {
    wx.navigateTo({ url: '/pages/record/record?id=' + e.currentTarget.dataset.id });
  },

  add: function () {
    wx.navigateTo({ url: '/pages/record/record' });
  }
});
