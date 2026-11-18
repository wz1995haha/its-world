/* theme-style.js — 把主题变成一段内联 style，挂到页面根节点上 */
var PT = require('./all.js');

function varsOf(id) {
  var t = PT.themeById(id) || PT.THEMES[0];
  var keys = Object.keys(t.vars);
  return keys.map(function (k) { return k + ':' + t.vars[k]; }).join(';');
}

function current() {
  return PT.STORE.setting('theme', 'paper');
}

/* 页面用它：this.setData({ themeStyle: style, themeId: id }) */
function styleNow() {
  var id = current();
  return { themeStyle: varsOf(id), themeId: id };
}

module.exports = { varsOf: varsOf, current: current, styleNow: styleNow };
