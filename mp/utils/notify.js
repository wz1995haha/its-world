/**
 * 订阅消息：个人主体只能用「一次性订阅」——用户每点一次授权，只能收到一条。
 *
 * 因此这里的策略是：
 *   1. 用户点「铃铛」或进「该做」页时，问一次授权；
 *   2. 授权成功就把「可用条数 +1」记到云端（subs 集合）；
 *   3. 云函数 notify 每天 9 点扫一遍，3 天内到期的发一条，并从可用条数里减 1。
 *
 * 模板 ID 需要你在后台「基础功能 → 订阅消息」里申请后填进 TPL。
 * 三个模板建议对应：疫苗到期 / 驱虫到期 / 复诊提醒。
 * 模板字段建议统一用：thing1（宠物名）、thing2（事项）、date3（日期）。
 */

const TPL = {
  vaccine: '',   // 疫苗到期提醒
  deworm: '',    // 驱虫到期提醒
  visit: ''      // 复诊 / 体检提醒
};

/* 到期几天内提醒 */
const AHEAD = 3;

function ready(kind) {
  const id = TPL[kind];
  return !!(id && String(id).length > 10);
}

function anyReady() {
  return ready('vaccine') || ready('deworm') || ready('visit');
}

/* 从 dueList 的一条里挑模板：deworm 走驱虫、exam/visit 走复诊、其余走疫苗 */
function tplOf(item) {
  const kind = (item && item.kind) || '';
  if (kind === 'deworm') return TPL.deworm;
  if (kind === 'exam' || kind === 'visit' || kind === 'surgery' || kind === 'med') return TPL.visit;
  return TPL.vaccine;
}

/* 是否该提醒：days 为负数（已过期）也提醒，超过 AHEAD 天不提醒 */
function shouldPing(days) {
  if (days === null || days === undefined || days === '') return false;
  const n = Number(days);
  if (isNaN(n)) return false;
  return n <= AHEAD;
}

/* 申请一次订阅授权；成功回调传 true */
function ask(kind, cb) {
  cb = cb || function () {};
  const ids = [];
  if (ready(kind)) ids.push(TPL[kind]);
  else Object.keys(TPL).forEach(function (k) { if (ready(k)) ids.push(TPL[k]); });
  if (!ids.length) { cb(false, '没配模板'); return; }
  if (!wx.requestSubscribeMessage) { cb(false, '版本太低'); return; }
  wx.requestSubscribeMessage({
    tmplIds: ids,
    success: function (res) {
      const ok = ids.some(function (id) { return res[id] === 'accept'; });
      cb(ok, ok ? '' : '没同意');
    },
    fail: function (e) { cb(false, (e && e.errMsg) || '失败'); }
  });
}

/* 授权成功后：把可用条数 +1 记到云端 */
function grant(kind, cb) {
  const cloud = require('./cloud.js');
  if (!cloud.enabled()) { if (cb) cb(false); return; }
  cloud.grantSub(1, function (ok) { if (cb) cb(ok); });
}

/* 一步到位：问授权 → 记条数 */
function askAndGrant(kind, cb) {
  ask(kind, function (ok, why) {
    if (!ok) { if (cb) cb(false, why); return; }
    grant(kind, function () { if (cb) cb(true); });
  });
}

module.exports = {
  TPL: TPL,
  AHEAD: AHEAD,
  ready: ready,
  anyReady: anyReady,
  tplOf: tplOf,
  shouldPing: shouldPing,
  ask: ask,
  grant: grant,
  askAndGrant: askAndGrant
};
