/* init 云函数 — 把用到的集合建出来（重复调用无副作用）
 * 集合：pets / days / records
 * 默认权限：仅创建者可读写（小程序端只会读写自己的 _openid 数据）
 */
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const NAMES = ['pets', 'days', 'records'];

exports.main = async () => {
  const done = [];
  for (const name of NAMES) {
    try {
      await db.createCollection(name);
      done.push(name + ':created');
    } catch (e) {
      /* -501001 已存在，忽略 */
      done.push(name + ':' + (e && e.errCode ? e.errCode : 'exists'));
    }
  }
  return { ok: true, done };
};
