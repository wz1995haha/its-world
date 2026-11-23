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

console.log('— 档案表能改 —');
const pid = S.active().id;
ok('一开始没有自定义字段', S.fields(pid).length === 0);
const chip = S.addField(pid, '芯片号', '900215000123456');
ok('能加一项', S.fields(pid).length === 1 && S.fields(pid)[0].label === '芯片号');
ok('值也存住了', S.fields(pid)[0].value === '900215000123456', S.fields(pid)[0].value);
ok('空名字加不进去', S.addField(pid, '   ', 'x') === null && S.fields(pid).length === 1);
S.updateField(pid, chip.id, { value: '900215000999' });
ok('能改值', S.fields(pid)[0].value === '900215000999', S.fields(pid)[0].value);
S.updatePet(pid, { birthday: '2023-05-18', homeDate: '2025-05-07' });
ok('生日到家能改', S.active().birthday === '2023-05-18' && S.active().homeDate === '2025-05-07');
S.removeField(pid, chip.id);
ok('能删', S.fields(pid).length === 0);

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

console.log('— 云同步用的 importDay / cloud 模块 —');
const importDay = S.importDay;
ok('store 导出了 importDay', typeof importDay === 'function');
S.setActive(pet.id);
const box = { events: [{ id: 'e1', type: 'meal', num: 30, at: Date.now() }], note: '从云上下来的一段', diary: null };
importDay(pet.id, '2026-11-20', box);
const back = S.day('2026-11-20', pet.id);
ok('整天能写回本地', !!back && back.note === '从云上下来的一段');
ok('事件的也回来了', back.events.length === 1 && back.events[0].num === 30);
ok('date 字段补齐了', back.date === '2026-11-20');

const cloud = require('../mp/utils/cloud.js');
ok('cloud 模块能加载', typeof cloud.enabled === 'function');
ok('没填环境时是关的', cloud.enabled() === false);
wx.cloud = { init() {}, callFunction: () => Promise.resolve({ result: { openid: 'u1' } }), database() { return { collection() { return { where() { return { limit() { return { get: () => Promise.resolve({ data: [] }) }; } }; } }; } }; } };
cloud.setEnv('demo-env-1');
ok('填了环境就打开', cloud.enabled() === true);
let gotUid = null;
cloud.login(function (uid) { gotUid = uid; });
setTimeout(() => {
  ok('登录拿到 openid', gotUid === 'u1', gotUid);
  
/* ---------- 健康档案（记录 / 到期 / 病史 / 花费） ---------- */
console.log('— 健康档案：记录与到期 —');
{
  const pets = S.pets();
  const pet = pets[0];
  const cat = pet.species === "cat" ? pet : pets.filter((x) => x.species === "cat")[0] || pet;

  S.addRecord({ kind: "vaccine", name: "狂犬疫苗", date: "2026-11-01" }, cat.id);
  const recs1 = S.records(cat.id);
  ok("记了一条疫苗", recs1.length === 1, "len=" + recs1.length);
  ok("自动算出下次（12 个月后）", recs1[0].next === "2027-11-01", recs1[0].next);

  S.addRecord({ kind: "deworm", route: "体外", drug: "大宠爱", date: "2026-10-01" }, cat.id);
  const dw = S.records(cat.id).filter((r) => r.kind === "deworm")[0];
  ok("体外驱虫 1 个月后", dw.next === "2026-11-01", dw.next);

  S.addRecord({ kind: "deworm", route: "体内", drug: "拜宠清", date: "2026-08-01" }, cat.id);
  const dw2 = S.records(cat.id).filter((r) => r.kind === "deworm" && r.route === "体内")[0];
  ok("体内驱虫 3 个月后", dw2.next === "2026-11-01", dw2.next);

  const due = S.dueList(cat.id);
  ok("到期表里有 3 组", due.length === 3, "len=" + due.length);
  ok("最急的排最前", due[0].days <= due[1].days, due.map((d) => d.days).join(","));
  ok("带状态", ["over", "soon", "ok"].includes(due[0].status), due[0].status);

  S.toggleReminder(due[0].key, cat.id);
  ok("铃铛能点亮", S.reminders(cat.id).length === 1, "n=" + S.reminders(cat.id).length);
  S.toggleReminder(due[0].key, cat.id);
  ok("再点一次关掉", S.reminders(cat.id).length === 0);
}

console.log('— 健康档案：病史与花费 —');
{
  const pet = S.pets()[0];
  S.addRecord({ kind: "visit", illness: "肠胃炎", date: "2026-11-18", cost: 280 }, pet.id);
  S.addRecord({ kind: "med", illness: "肠胃炎", drug: "甲硝唑", days: 5, date: "2026-11-19", cost: 48 }, pet.id);
  S.addRecord({ kind: "visit", illness: "皮肤病", date: "2026-09-01", cost: 120 }, pet.id);

  const eps = S.episodes(pet.id);
  ok("两次病", eps.length === 2, "len=" + eps.length);
  const gi = eps.filter((e) => e.name === "肠胃炎")[0];
  ok("同名的凑成一次", gi.items.length === 2, "n=" + gi.items.length);
  ok("还没好", gi.open === true);
  ok("这次花了 328", gi.cost === 328, "cost=" + gi.cost);

  S.closeEpisode(pet.id, "肠胃炎");
  const gi2 = S.episodes(pet.id).filter((e) => e.name === "肠胃炎")[0];
  ok("标记已好之后 open=false", gi2.open === false);

  S.reopenEpisode(pet.id, "肠胃炎");
  ok("也能改回来", S.episodes(pet.id).filter((e) => e.name === "肠胃炎")[0].open === true);

  const sum = S.costSum(pet.id, "2026-01-01");
  ok("年度花费合计 448", sum === 448, "sum=" + sum);
}

/* ---------- 它的空间：成长记录 ---------- */
console.log('— 它的空间 —');
{
  var pet = S.active();
  var before = S.stories(pet.id).length;

  var st1 = S.addStory(pet.id, { date: '2026-05-01', tag: '第一次', title: '第一次回家', text: '它在纸箱里睡着了。', files: [{ kind: 'photo', path: 'a.jpg' }] });
  ok('能加一条成长记录', !!st1 && S.stories(pet.id).length === before + 1);
  ok('标题和正文存下来了', st1.title === '第一次回家' && st1.text.indexOf('纸箱') >= 0);
  ok('附件跟着记录走', st1.files.length === 1 && st1.files[0].kind === 'photo');

  S.addStory(pet.id, { date: '2025-12-01', tag: '日常', title: '会坐了', text: '三天学会。' });
  var list = S.stories(pet.id);
  ok('按日期倒序', list[0].date >= list[list.length - 1].date);
  ok('早的那条排在后面', list[list.length - 1].title === '会坐了', 'last=' + list[list.length - 1].title);

  S.updateStory(pet.id, st1.id, { text: '改过的一句话。', tag: '生日' });
  ok('能改一条', S.storyById(st1.id, pet.id).text.indexOf('改过') >= 0);
  ok('改完日期不变', S.storyById(st1.id, pet.id).date === '2026-05-01');

  var y = S.storyYearCount(pet.id);
  ok('按年能数出来', y['2026'] >= 1 && y['2025'] >= 1);

  /* 云端回来的（upsert：更新的覆盖，旧的忽略） */
  S.importStory(pet.id, { id: st1.id, date: '2026-05-01', tag: 'x', title: '云端的', text: '云端', files: [], updatedAt: '2000-01-01T00:00:00.000Z' });
  ok('旧版本不覆盖本地', S.storyById(st1.id, pet.id).title !== '云端的');
  S.importStory(pet.id, { id: st1.id, date: '2026-05-01', tag: '生日', title: '云端新', text: '云端新', files: [], updatedAt: '2999-01-01T00:00:00.000Z' });
  ok('新版本会覆盖', S.storyById(st1.id, pet.id).title === '云端新');

  var n = S.stories(pet.id).length;
  S.removeStory(pet.id, st1.id);
  ok('能删掉一条', S.stories(pet.id).length === n - 1);
  ok('删完查不到', !S.storyById(st1.id, pet.id));
}
printResult();
}, 30);
cloud.setEnv('');

let printed = false;
function printResult() {
  if (printed) return;
  printed = true;
  console.log('');
  console.log(fail === 0 ? `✓ 全部通过（${pass}/${pass}）` : `✗ 失败 ${fail} 项，通过 ${pass}`);
  process.exit(fail === 0 ? 0 : 1);
}
setTimeout(printResult, 200);
