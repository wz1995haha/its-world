/**
 * 订阅消息（一次性订阅）：用户每授权一次，只能收到一条。
 *
 * 已申请的三个模板（后台「基础功能 → 订阅消息」里能查到）：
 *   due      宠物养护记录提醒  thing1 宠物名称 / thing2 养护类型 / time3 到期时间 / thing4 备注
 *   check    宠物健康检查提醒  thing1 宠物名称 / time2 时间 / thing6 提醒事项
 *   birthday 宠物生日通知      thing1 宠物昵称 / time2 日期 / thing3 温馨提示
 *
 * 当前用前两个：养护类（疫苗/驱虫）走 due，就医类（复诊/体检/手术/用药）走 check。
 */

const TPL = {
  due: 'palO4UOhhiIVBSuHDXu-k8wfSAm6u4uPaLZCoM4Rc',
  check: 'm29plqvqbKEcsICnlwWV5orqLMhBnq1vg7mlAfwL8rk',
  birthday: '8rqV8K_4EO4-cpZwuMeKvfUKmzy2Ft7LLp5q1oZmT-A'
};

/* 到期几天内提醒 */
const AHEAD = 3;

function idOf(kind) {
  if (kind === 'deworm' || kind === 'vaccine') return TPL.due;
  if (kind === 'exam' || kind === 'visit' || kind === 'surgery' || kind === 'med') return TPL.check;
  return TPL.due;
}

function ready() {
  return Object.keys(TPL).some(function (k) { return TPL[k] && TPL[k].length > 20; });
}

/* 是否该提醒：负数（过期）也提醒，超过 AHEAD 天不提醒 */
function shouldPing(days) {
  if (days === null || days === undefined || days === '') return false;
  const n = Number(days);
  if (isNaN(n)) return false;
  return n <= AHEAD;
}

/* 一次把三个模板都问一遍（微信一次最多 3 个），用户勾几个就攒几条额度 */
function ask(cb) {
  cb = cb || function () {};
  const ids = [TPL.due, TPL.check, TPL.birthday].filter(function (x) { return x; });
  if (!ids.length) { cb(0, '没配模板'); return; }
  if (!wx.requestSubscribeMessage) { cb(0, '版本太低'); return; }
  wx.requestSubscribeMessage({
    tmplIds: ids,
    success: function (res) {
      let n = 0;
      ids.forEach(function (id) { if (res[id] === 'accept') n += 1; });
      cb(n, n ? '' : '没同意');
    },
    fail: function (e) { cb(0, (e && e.errMsg) || '失败'); }
  });
}

/* 授权成功后把可用条数记到云端 */
function grant(n, cb) {
  const cloud = require('./cloud.js');
  if (!cloud.enabled()) { if (cb) cb(false); return; }
  cloud.grantSub(n || 1, function (ok) { if (cb) cb(ok); });
}

/* 一步到位：问授权 → 记条数 */
function askAndGrant(cb) {
  ask(function (n, why) {
    if (!n) { if (cb) cb(0, why); return; }
    grant(n, function () { if (cb) cb(n); });
  });
}

module.exports = {
  TPL: TPL,
  AHEAD: AHEAD,
  idOf: idOf,
  ready: ready,
  shouldPing: shouldPing,
  ask: ask,
  grant: grant,
  askAndGrant: askAndGrant
};
