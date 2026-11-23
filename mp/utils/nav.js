/* nav.js — 自定义导航栏时，算出顶部要留多高（状态栏 + 胶囊按钮） */

var cache = null;

function info() {
  if (cache) return cache;
  var w = {};
  try { w = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync(); } catch (e) {}
  var sb = w.statusBarHeight || 20;
  var cap = null;
  try { cap = wx.getMenuButtonBoundingClientRect ? wx.getMenuButtonBoundingClientRect() : null; } catch (e) {}
  var padTop = sb + 8;
  if (cap && cap.height) padTop = cap.bottom + 8;
  cache = { statusBar: sb, padTop: Math.round(padTop) };
  return cache;
}

module.exports = { info: info };