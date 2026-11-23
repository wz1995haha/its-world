/**
 * 每天定时跑一次：扫 reminders 集合，3 天内到期就发一条订阅消息。
 *
 * 部署：微信开发者工具 → cloudfunctions/notify → 右键「上传并部署（云端安装依赖）」
 * 触发器：见同目录 config.json（每天 9:00）
 *
 * 依赖集合：reminders（客户端 push 时写）、subs（授权条数）
 * 模板字段约定：thing1 = 宠物名，thing2 = 事项，date3 = 日期
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/* 模板 ID：和 mp/utils/notify.js 里的 TPL 保持一致 */
const TPL = {
  vaccine: '',
  deworm: '',
  visit: ''
};

const AHEAD = 3;

function tplOf(kind) {
  if (kind === 'deworm') return TPL.deworm;
  if (kind === 'exam' || kind === 'visit' || kind === 'surgery' || kind === 'med') return TPL.visit;
  return TPL.vaccine;
}

function fmt(key) {
  if (!key) return '';
  const p = String(key).split('-');
  if (p.length !== 3) return key;
  return p[0] + '年' + Number(p[1]) + '月' + Number(p[2]) + '日';
}

exports.main = async () => {
  const out = { scanned: 0, sent: 0, skipped: 0, errors: [] };
  if (!TPL.vaccine && !TPL.deworm && !TPL.visit) {
    return { ok: false, why: '模板 ID 还没填（cloudfunctions/notify/index.js 顶部 TPL）' };
  }

  let rems = [];
  try {
    const r = await db.collection('reminders').limit(1000).get();
    rems = r.data || [];
  } catch (e) {
    return { ok: false, why: 'reminders 集合读不到（可能还没建）', err: String(e) };
  }

  for (const doc of rems) {
    out.scanned += 1;
    const openid = doc._openid;
    const items = doc.items || [];
    const due = items.filter(function (it) {
      if (!it.next) return false;
      const n = Number(it.days);
      return !isNaN(n) && n <= AHEAD;
    });
    if (!due.length) { out.skipped += 1; continue; }

    /* 取最近的一条发 */
    due.sort(function (a, b) { return Number(a.days) - Number(b.days); });
    const it = due[0];
    const tpl = tplOf(it.kind);
    if (!tpl) { out.skipped += 1; continue; }

    /* 有没有可用条数 */
    let sub = null;
    try {
      const s = await db.collection('subs').where({ _openid: openid }).get();
      sub = (s.data || [])[0] || null;
    } catch (e) { /* 没集合就当没有 */ }
    if (!sub || !(sub.remain > 0)) { out.skipped += 1; continue; }

    const late = Number(it.days) < 0;
    try {
      await cloud.openapi.subscribeMessage.send({
        touser: openid,
        templateId: tpl,
        page: 'pages/home/home',
        miniprogramState: 'formal',
        lang: 'zh_CN',
        data: {
          thing1: { value: String(doc.petName || '它').slice(0, 20) },
          thing2: { value: String((late ? '该做（已过期）：' : '该做：') + (it.title || '')).slice(0, 20) },
          date3: { value: fmt(it.next) }
        }
      });
      out.sent += 1;
      /* 一次性订阅：发完扣 1 */
      await db.collection('subs').doc(sub._id).update({
        data: { remain: _.inc(-1), updatedAt: Date.now() }
      });
    } catch (e) {
      out.errors.push({ openid: openid, err: String((e && e.errCode) || '') + ' ' + String((e && e.errMsg) || e) });
    }
  }

  return Object.assign({ ok: true }, out);
};
