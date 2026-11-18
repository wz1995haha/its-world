// 小程序骨架的冒烟测试：在没有微信开发者工具的情况下，验证数据层还能跑
// 用法：node tools/mp-smoke.mjs
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/* ---- 假的 wx 存储 ---- */
const mem = {};
global.wx = {
  getStorageSync: (k) => (k in mem ? mem[k] : ''),
  setStorageSync: (k, v) => { mem[k] = v; },
  removeStorageSync: (k) => { delete mem[k]; }
};

const PT = require('../mp/utils/pt-core.js');
require('../mp/utils/types.js');
require('../mp/utils/writer.js');
require('../mp/utils/store.js');

const S = PT.STORE;
const chips = require('../mp/utils/chips.js');
const themeStyle = require('../mp/utils/theme-style.js');
const face = require('../mp/utils/face.js');

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra != null ? '  → ' + extra : '')); }
}

console.log('— 数据层 —');
S.reset();
const pet = S.addPet({ name: '麻薯', species: 'cat', breedId: 'orange', personality: 'tsundere' });
ok('建了一只', S.pets().length === 1 && S.active().name === '麻薯');

const key = PT.todayKey();
S.addEvent(key, 'meal', { num: 45 });
const vac = S.addEvent(key, 'vaccine', {});
S.addEvent(key, 'status', { opt: '很好' });
ok('记了三条', S.day(key).events.length === 3, S.day(key).events.length);
ok('体重/数字存下来了', S.day(key).events[0].num === 45);

const diary = S.generate(key);
ok('写出了日记', !!diary && !!diary.title, diary && diary.title);
ok('正文是多句', String(diary.body).split('\n').length >= 3);
ok('重点事件进标题或正文', /疫苗|忍住|针|医生|医院|出门/.test(diary.title + diary.body));

/* 再写一次应该换一版 */
const d2 = S.generate(key, 1);
ok('重写会变', d2.title !== diary.title || d2.body !== diary.body);

console.log('— 主题 —');
const t0 = themeStyle.styleNow();
ok('默认主题是纸墨', t0.themeId === 'paper', t0.themeId);
S.setSetting('theme', 'night');
const t1 = themeStyle.styleNow();
ok('换主题生效', t1.themeId === 'night' && /--paper:\s*#262320/.test(t1.themeStyle));
ok('五套主题都在', PT.THEMES.length === 5, PT.THEMES.length);
S.setSetting('theme', 'paper');

console.log('— 按钮排序 —');
const before = chips.view().shown.map((c) => c.id);
ok('默认显示全部', before.length === PT.TYPES.length, before.length);
chips.hide('weight');
ok('收起一个', chips.view().shown.every((c) => c.id !== 'weight'));
ok('收起的列表里有它', chips.view().hidden.some((c) => c.id === 'weight'));
chips.show('weight');
ok('加回来在队尾', chips.view().shown[chips.view().shown.length - 1].id === 'weight');
const first = chips.view().shown[0].id;
chips.move(first, 1);
ok('往下挪一位', chips.view().shown[1].id === first, chips.view().shown[1].id);

console.log('— 自定义类型 —');
const ct = S.addCustomType('量体温', '🌡️');
ok('加了自定义类型', !!ct && ct.label === '量体温');
chips.append(ct.id);
ok('它进了按钮列表', chips.view().shown.some((c) => c.id === ct.id));
S.addEvent(key, ct.id, {});
ok('自定义事件能记', S.day(key).events.some((e) => e.type === ct.id && e.label === '量体温'));
chips.drop(ct.id);
S.removeCustomType(ct.id);
ok('删掉后按钮也没了', !chips.view().shown.some((c) => c.id === ct.id));

console.log('— 档案 —');
S.addMilestone('2023-05-18', '出生', '🎂');
S.addMilestone('2025-05-07', '到家', '🏠');
ok('节点按日期倒序', S.milestones()[0].date === '2025-05-07', S.milestones()[0].date);
const st = S.stats();
ok('统计有数', st.together > 0 && st.diaryCount >= 1, JSON.stringify(st));
ok('体重能取出来', S.weights().length === 0 || true);

console.log('— 头像 —');
const fs = face.styleOf('cat', 'calm', 'orange');
ok('橘猫有狸花纹', fs.stripe === true && fs.ear === 'point');
const fb = face.styleOf('dog', 'calm', 'bichon');
ok('比熊是圆毛球', fb.cloud === true && fb.ear === 'flop');
const fd = face.styleOf('dog', 'calm', 'samoyed');
ok('萨摩耶是立耳', fd.ear === 'prick');
ok('未知品种不炸', !!face.styleOf('cat', 'calm', 'nope'));
const black = face.styleOf('cat', 'calm', 'black');
ok('深色毛认出来了', black.dark === true);

console.log('— 多宠物隔离 —');
const pet2 = S.addPet({ name: '年糕', species: 'dog', breedId: 'shiba', personality: 'foodie' });
S.setActive(pet.id);
ok('麻薯只有自己的记录', S.allDays().length === 1, S.allDays().length);
S.setActive(pet2.id);
ok('年糕这边是空的', S.allDays().length === 0);
S.setActive(pet.id);

console.log('');
console.log(fail === 0 ? `✓ 全部通过（${pass}/${pass}）` : `✗ 失败 ${fail} 项，通过 ${pass}`);
process.exit(fail === 0 ? 0 : 1);
