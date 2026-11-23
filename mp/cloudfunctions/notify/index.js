/**
 * 每天定时扫 reminders 集合，3 天内到期就发一条订阅消息。
 *
 * 模板（与 mp/utils/notify.js 保持一致）：
 *   due      宠物养护记录提醒  thing1 宠物名称 / thing2 养护类型 / time3 到期时间 / thing4 备注
 *   check    宠物健康检查提醒  thing1 宠物名称 / time2 时间 / thing6 提醒事项
 *
 * 部署：右键 cloudfunctions/notify → 上传并部署（云端安装依赖）
 * 触发器：同目录 config.json，每天 9:00
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const TPL = {
  due: 'palO4UOhhiIVBSuHDXu-k8wfSAm6u4uPaLZCoM4Rc',
  check: 'm29plqvqbKEcsICnlwWV5orqLMhBnq1vg7mlAfwL8rk'
};

const AHEAD = 3;

function cut(s, n) {
  const t = String(s === null || s === undefined ? '' : s);
  return t.length > n ? t.slice(0, n) : t;
}

/* 2026-11-27 → 2026年11月27日 */
function fmt(key) {
  if (!key) return '';
  const p = String(key).split('-');
  if (p.length !== 3) return String(key);
  return p[0] + '年' + Number(p[1]) + '月' + Number(p[2]) + '日';
}

/* 按记录类型挑模板 + 组 data */
function payloadOf(kind, item, petName, late) {
  const name = cut(petName || '它', 20);
  const date = fmt(item.next);

  if (kind === 'deworm' || kind === 'vaccine') {
    const type = kind === 'deworm' ? '驱虫' : '疫苗';
    const note = (late ? '已过期：' : '该做了：') + (item.title || type);
    return {
      tpl: TPL.due,
      data: {
        thing1: { value: name },
        thing2: { value: type },
        time3: { value: date },
        thing4: { value: cut(note, 20) }
      }
    };
  }

  const what = (late ? '已过期：' : '该做了：') + (item.title || '复查');
  return {
    tpl: TPL.check,
    data: {
      thing1: { value: name },
      time2: { value: date },
      thing6: { value: cut(what, 20) }
    }
  };
}

exports.main = async () => {
  const out = { scanned: 0, sent: 0, skipped: 0, errors: [] };

  let rems = [];
  try {
    const r = await db.collection('reminders').limit(1000).get();
    rems = r.data || [];
  } catch (e) {
    return { ok: false, why: 'reminders 读不到（可能还没建集合）', err: String(e) };
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

    due.sort(function (a, b) { return Number(a.days) - Number(b.days); });
    const it = due[0];

    /* 额度 */
    let sub = null;
    try {
      const s = await db.collection('subs').where({ _openid: openid }).get();
      sub = (s.data || [])[0] || null;
    } catch (e) { /* 没有就当 0 */ }
    if (!sub || !(sub.remain > 0)) { out.skipped += 1; continue; }

    const late = Number(it.days) < 0;
    const p = payloadOf(it.kind, it, doc.petName, late);
    if (!p.tpl) { out.skipped += 1; continue; }

    try {
      await cloud.openapi.subscribeMessage.send({
        touser: openid,
        templateId: p.tpl,
        page: 'pages/home/home',
        miniprogramState: 'formal',
        lang: 'zh_CN',
        data: p.data
      });
      out.sent += 1;
      await db.collection('subs').doc(sub._id).update({
        data: { remain: _.inc(-1), updatedAt: Date.now() }
      });
    } catch (e) {
      out.errors.push({
        kind: it.kind,
        errCode: (e && e.errCode) || '',
        errMsg: String((e && e.errMsg) || e)
      });
    }
  }

  return Object.assign({ ok: true }, out);
};
