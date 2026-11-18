/* chips.js — 「发生了什么」那排按钮的显示顺序 / 显隐 / 自定义类型
 *
 * 存在 settings.chips（id 数组）里，跟宠物无关，一家人共用一套。
 */

var PT = require('./all.js');
var S = PT.STORE;

function allIds() {
  return PT.TYPES.map(function (t) { return t.id; })
    .concat(S.customTypes().map(function (t) { return t.id; }));
}

function chipIds() {
  var saved = S.setting('chips', null);
  if (!saved || !saved.length) return allIds();
  return saved.filter(function (id) { return PT.TYPE[id] || S.customType(id); });
}

function save(ids) {
  S.setSetting('chips', ids);
}

function meta(id) {
  var t = PT.TYPE[id];
  if (t) return { id: id, label: t.label, icon: t.icon, mine: false };
  var c = S.customType(id);
  return c ? { id: id, label: c.label, icon: c.icon, mine: true } : null;
}

/* 给页面用：当前的按钮 + 被收起来的按钮 */
function view() {
  var ids = chipIds();
  var shown = ids.map(meta).filter(Boolean);
  var hidden = allIds().filter(function (id) { return ids.indexOf(id) < 0; })
    .map(meta).filter(Boolean);
  return { shown: shown, hidden: hidden };
}

/* 移动一位：dir = -1 往前，+1 往后 */
function move(id, dir) {
  var ids = chipIds();
  var i = ids.indexOf(id);
  if (i < 0) return;
  var j = i + dir;
  if (j < 0 || j >= ids.length) return;
  ids.splice(j, 0, ids.splice(i, 1)[0]);
  save(ids);
}

function hide(id) {
  save(chipIds().filter(function (x) { return x !== id; }));
}

function show(id) {
  var ids = chipIds();
  if (ids.indexOf(id) >= 0) return;
  ids.push(id);
  save(ids);
}

/* 新加的自定义类型排到最后 */
function append(id) {
  var ids = chipIds();
  if (ids.indexOf(id) >= 0) return;
  ids.push(id);
  save(ids);
}

function drop(id) {
  var ids = chipIds().filter(function (x) { return x !== id; });
  save(ids.length ? ids : null);
}

module.exports = {
  allIds: allIds,
  ids: chipIds,
  view: view,
  meta: meta,
  move: move,
  hide: hide,
  show: show,
  append: append,
  drop: drop,
  save: save
};
