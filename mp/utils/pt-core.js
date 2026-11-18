/* pt-core.js — 小程序里的公共 PT 对象 + 存储垫片
 *
 * 浏览器版里每个模块都写 `var PT = (window.PT = window.PT || {})`，
 * 搬到小程序之后改成 all require 这一个模块，拿同一个对象。
 * 原来直接调 localStorage，现在换成 PT.STORAGE，底下走 wx 的本地缓存。
 */

var PT = {};

var mem = {};

PT.STORAGE = {
  getItem: function (k) {
    try {
      var v = wx.getStorageSync(k);
      return v === '' || v === undefined || v === null ? null : v;
    } catch (e) {
      return mem[k] || null;
    }
  },
  setItem: function (k, v) {
    mem[k] = v;
    try {
      wx.setStorageSync(k, v);
    } catch (e) {
      /* 满了就算了，内存里还有一份 */
    }
  },
  removeItem: function (k) {
    delete mem[k];
    try {
      wx.removeStorageSync(k);
    } catch (e) {}
  }
};

/* 给 node 侧的冒烟测试用 */
PT._setStorage = function (s) {
  PT.STORAGE = s;
};

module.exports = PT;
