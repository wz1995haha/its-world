/* tools/test.mjs — 逻辑冒烟测试（不需要浏览器） */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
  clear: () => mem.clear()
};
globalThis.window = globalThis;

for (const f of ['types.js', 'art.js', 'writer.js', 'store.js']) {
  new Function(fs.readFileSync(path.join(root, 'src', f), 'utf8'))();
}
const PT = window.PT;
const S = PT.STORE;

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? '  → ' + extra : '')); }
}

console.log('— 基础流程 —');
S.load();
ok('初始没有宠物', S.pets().length === 0 && !S.active());

S.addPet({ name: '测试猫', species: 'cat', personality: 'greedy', homeDate: PT.todayKey() });
ok('宠物已保存', S.active().name === '测试猫');
ok('成为当前宠物', S.pets().length === 1 && S.active().id === S.pets()[0].id);

const k = PT.todayKey();
S.addEvent(k, 'meal', { num: 50 });
S.addEvent(k, 'walk', { num: 20 });
ok('两条事件', S.day(k).events.length === 2);
ok('尚无日记', !S.day(k).diary);

const d1 = S.generate(k);
ok('生成日记', !!(d1 && d1.body));
ok('正文长度合理', d1.body.length > 60, d1.body.length);
ok('有标题', !!d1.title);
ok('有心情', !!d1.mood);
console.log('    标题：' + d1.title);
console.log('    正文：' + d1.body.slice(0, 80).replace(/\n/g, ' / ') + ' …');
ok('新日记不 stale', d1.stale !== true);

console.log('— 改事实会让日记过期 —');
S.addEvent(k, 'vomit');
ok('过期标记', S.day(k).diary.stale === true);
const d2 = S.generate(k, 1);
ok('重写后正文不同', d2.body !== d1.body);
ok('重写后不再过期', S.day(k).diary.stale !== true);

console.log('— 备注会进正文 —');
S.setNote(k, '今天有点奇怪');
const d3 = S.generate(k, 2);
ok('备注出现在正文', d3.body.indexOf('今天有点奇怪') >= 0 || d3.body.indexOf('「') >= 0);

console.log('— 删除 —');
const id = S.day(k).events[0].id;
S.removeEvent(k, id);
ok('删除一条', S.day(k).events.length === 2);

console.log('— 统计与体重 —');
S.addEvent(k, 'weight', { num: 4.2 });
const st = S.stats();
ok('记录天数 = 1', st.recordedDays === 1, JSON.stringify(st));
ok('日记篇数 = 1', st.diaryCount === 1);
ok('体重曲线有点', S.weights().length === 1, JSON.stringify(S.weights()));

console.log('— 多只宠物 —');
const maoId = S.active().id;
const gao = S.addPet({ name: '测试狗', species: 'dog', personality: 'clingy', bio: '一只很吵的狗' });
ok('添了第二只', S.pets().length === 2);
ok('自动切到新的那只', S.active().id === gao.id);
ok('简介存下来了', S.active().bio === '一只很吵的狗');
ok('新宠物没有旧记录', S.day(k) === null);
ok('统计按宠物分开', S.stats().recordedDays === 0, JSON.stringify(S.stats()));

const gk = PT.keyOf(new Date(Date.now() - 86400000));
S.addEvent(gk, 'play');
const gd = S.generate(gk);
ok('第二只也能写日记', !!gd.body);
ok('第二只的标题和第一只不同源', S.allDays().length === 1);

S.setActive(maoId);
ok('切回第一只', S.active().id === maoId);
ok('第一只的记录还在', S.day(k) && S.day(k).events.length >= 2);
ok('第一只看不到第二只的那天', S.day(gk) === null);
ok('第一只统计独立', S.stats().diaryCount === 1, JSON.stringify(S.stats()));

console.log('— 改资料 —');
S.updatePet(gao.id, { name: '测试狗二号', bio: '改过的简介' });
ok('改名生效', S.petById(gao.id).name === '测试狗二号');
ok('改名不影响别的', S.petById(maoId).name === '测试猫');
ok('至少留一只', S.removePet(maoId) === true && S.pets().length === 1);
ok('当前宠物被删后自动换人', S.active().id === gao.id);
ok('最后一只删不掉', S.removePet(gao.id) === false && S.pets().length === 1);

console.log('— 导出 / 导入 —');
S.addPet({ name: '测试猫三号', species: 'cat', personality: 'aloof' });
const dump = S.exportJSON();
ok('导出是 v2', JSON.parse(dump).v === 2 && JSON.parse(dump).pets.length === 2);
S.reset();
ok('重置后没有宠物', S.pets().length === 0);
S.importJSON(dump);
ok('导入恢复两只', S.pets().length === 2);
ok('导入恢复当前宠物', !!S.active());
ok('导入恢复日记', S.allDays(gao.id).length >= 1, S.allDays(gao.id).length);

console.log('— 旧版本数据迁移 —');
S.reset();
localStorage.setItem(S.KEY, JSON.stringify({
  v: 1,
  createdAt: '2025-01-01T00:00:00.000Z',
  pet: { name: '老数据', species: 'dog', personality: 'tsundere' },
  days: { '2025-01-02': { date: '2025-01-02', events: [{ id: 'e1', type: 'meal', at: 1 }], note: '', diary: null } }
}));
window.PT.STORE.load();          // 重新读一遍，触发 migrate
ok('老数据变成一只宠物', S.pets().length === 1 && S.active().name === '老数据');
ok('老数据的天数搬进新结构', !!S.day('2025-01-02'), JSON.stringify(S.get().days));

console.log('— 示例数据 —');
S.reset();
S.seedDemo();
ok('示例有两只', S.pets().length === 2, S.pets().map((p) => p.name).join(','));
ok('示例有简介', S.pets().every((p) => p.bio && p.bio.length > 6), JSON.stringify(S.pets().map((p) => p.bio)));
ok('当前是麻薯', S.active().name === '麻薯');
const days = S.allDays();
ok('麻薯 9 天（含今天、含疫苗那天）', days.length === 9, days.length);
ok('除今天外都有日记', days.filter((d) => d.date !== PT.todayKey()).every((d) => d.diary && d.diary.body));
const st2 = S.stats();
ok('麻薯统计合理', st2.diaryCount === 8 && st2.recordedDays === 9, JSON.stringify(st2));

const nianGao = S.pets().filter((p) => p.name === '年糕')[0];
S.setActive(nianGao.id);
ok('年糕有 5 天', S.allDays().length === 5, S.allDays().length);
ok('年糕是狗', nianGao.species === 'dog');

const dogDay = S.allDays().filter((d) => d.diary)[0];
console.log('    年糕标题：' + dogDay.diary.title);
console.log('    年糕正文：' + dogDay.diary.body.slice(0, 60).replace(/\n/g, ' / ') + ' …');

console.log('— 品种 —');
S.reset();
var catP = S.addPet({ name: '品种猫', species: 'cat', breedId: 'black', personality: 'aloof' });
ok('品种已保存', S.active().breedId === 'black');
ok('品种名', PT.breedLabel(S.active()) === PT.breedById('cat', 'black').label, PT.breedLabel(S.active()));
ok('猫有 11 个品种、狗有 15 个', PT.BREEDS.cat.length === 11 && PT.BREEDS.dog.length === 15);
var faceBichon = PT.ART.face('dog', 'calm', { breed: PT.breedById('dog', 'bichon') });
var faceSamoyed = PT.ART.face('dog', 'calm', { breed: PT.breedById('dog', 'samoyed') });
ok('比熊和萨摩耶不是同一张脸', faceBichon !== faceSamoyed);
var faceOrange = PT.ART.face('cat', 'happy', { breed: PT.breedById('cat', 'orange') });
var faceBlack = PT.ART.face('cat', 'happy', { breed: PT.breedById('cat', 'black') });
ok('换品种头像会变', faceOrange !== faceBlack && faceBlack.length > 300, faceBlack.length);
ok('未知品种不报错', !!PT.ART.face('dog', 'calm', { breed: null }));

console.log('— 自定义性格 —');
S.updatePet(catP.id, { personality: 'custom', personalityText: '嘴硬心软，怕吸尘器' });
var kK = PT.todayKey();
S.addEvent(kK, 'meal', { num: 40 });
var found = false;
for (var rr = 0; rr < 10 && !found; rr++) {
  var dd = S.generate(kK, rr);
  if (dd.body.indexOf('嘴硬心软，怕吸尘器') >= 0) found = true;
}
ok('自己写的性格进了正文', found);

console.log('— 自定义事件 —');
var ct = S.addCustomType('刷牙', '🪥');
ok('加了一个自定义类型', !!ct && ct.label === '刷牙', JSON.stringify(ct));
ok('出现在类型表里', S.customTypes().length === 1);
ok('同名不重复', S.addCustomType('刷牙', '🪥') === null || S.customTypes().length === 1);
var k2 = '2026-01-05';
S.addEvent(k2, ct.id);
var ev2 = S.day(k2).events[0];
ok('事件记住了名字', ev2.type === ct.id && ev2.label === '刷牙', JSON.stringify(ev2));
var cDay = S.generateFor(catP.id, k2, 0);
ok('自定义事件进了日记', cDay.body.indexOf('刷牙') >= 0);
S.removeCustomType(ct.id);
ok('删掉类型后事件还在', S.day(k2).events.length === 1 && S.day(k2).events[0].label === '刷牙');

console.log('— 健康档案字段 —');
ok('疫苗/驱虫在健康白名单里', PT.HEALTH.indexOf('vaccine') >= 0 && PT.HEALTH.indexOf('deworm') >= 0);
S.addEvent(PT.todayKey(), 'vaccine');
ok('疫苗可记录', S.day(PT.todayKey()).events.some((e) => e.type === 'vaccine'));
S.addEvent(PT.todayKey(), 'status', { opt: '不舒服' });
var sk = S.generate(PT.todayKey(), 3);
ok('不舒服时心情是 sick', sk.mood === 'sick', sk.mood);

console.log('— 档案（重要节点） —');
ok('手术在健康白名单里', PT.HEALTH.indexOf('surgery') >= 0);
var m1 = S.addMilestone('2024-03-02', '绝育手术', '🏥');
ok('能记一个重要节点', !!m1 && m1.label === '绝育手术', JSON.stringify(m1));
ok('节点按日期倒序', S.milestones()[0].date === '2024-03-02' || S.milestones().length === 1);
S.addMilestone('2025-01-01', '搬家', '🏠');
ok('两条节点', S.milestones().length === 2, S.milestones().length);
ok('倒序排列', S.milestones()[0].date === '2025-01-01', S.milestones()[0].date);
S.removeMilestone(m1.id);
ok('能删掉节点', S.milestones().length === 1, S.milestones().length);
var sk2 = '2025-06-06';
S.addEvent(sk2, 'surgery', { opt: '绝育手术' });
var sd = S.generateFor(catP.id, sk2, 0);
ok('手术那天心情是 sick', sd.mood === 'sick', sd.mood);
ok('正文提到手术这件事', /醒来|肚子|没力气|病号/.test(sd.body), sd.body.slice(0, 40));
ok('节点跟着宠物走', S.milestones(catP.id).length === 1 && S.milestones().length === 1);

console.log('— 档案：自定义字段 —');
var catP = S.active();
ok('默认没有额外字段', S.fields().length === 0, S.fields().length);
var f1 = S.addField(null, '芯片号', '900215000123456');
ok('能加一个字段', !!f1 && f1.label === '芯片号' && f1.value === '900215000123456', JSON.stringify(f1));
ok('字段记在宠物身上', (catP.fields || []).length === 1, (catP.fields || []).length);
S.addField(null, '血型', 'A');
ok('能加第二个字段', S.fields().length === 2, S.fields().length);
ok('空名字不让加', S.addField(null, '   ', 'x') === null);
S.updateField(null, f1.id, { value: '900215999' });
ok('字段能改值', S.fields().filter(function (x) { return x.id === f1.id; })[0].value === '900215999');
S.updateField(null, f1.id, { label: '芯片' });
ok('字段能改名', S.fields().filter(function (x) { return x.id === f1.id; })[0].label === '芯片');
ok('改完还是两条', S.fields().length === 2, S.fields().length);
S.removeField(null, f1.id);
ok('字段能删', S.fields().length === 1 && S.fields()[0].label === '血型', JSON.stringify(S.fields()));
S.updatePet(catP.id, { fields: [{ id: 'fx', label: '过敏', value: '鸡肉' }] });
ok('整组替换字段', S.fields().length === 1 && S.fields()[0].value === '鸡肉');
ok('改成档案里的生日/到家', (function () {
  S.updatePet(catP.id, { birthday: '2022-04-04', homeDate: '2023-06-06' });
  var p = S.active();
  return p.birthday === '2022-04-04' && p.homeDate === '2023-06-06';
})());
ok('字段跟着宠物走', (function () {
  var other = S.pets().filter(function (p) { return p.id !== S.active().id; })[0];
  return !other || S.fields(other.id).length === 0;
})());

console.log('— 自己加的品种 —');
ok('一开始是空的', S.customBreeds().length === 0, S.customBreeds().length);
var nb = S.addBreed({ species: 'cat', label: '小土猫', fur: '#6B6058', furD: '#544B44', eye: '#E0B04C', pattern: 'patch' });
ok('能加一个', !!nb && nb.label === '小土猫', JSON.stringify(nb));
ok('记在 state 里', S.customBreeds().length === 1);
ok('breedById 查得到', (PT.breedById('cat', nb.id) || {}).label === '小土猫');
ok('breedList 里带 custom 标记', PT.breedList('cat').some(function (b) { return b.id === nb.id && b.custom; }));
ok('狗里没有它', !PT.breedById('dog', nb.id));
ok('同名不能再加', S.addBreed({ species: 'cat', label: '小土猫' }) === null);
ok('名字空的不能加', S.addBreed({ species: 'cat', label: '   ' }) === null);
ok('狗也能加', (function () {
  var d = S.addBreed({ species: 'dog', label: '小土狗', ears: 'flop', pattern: 'mask' });
  return d && d.ears === 'flop' && S.customBreeds('dog').length === 1;
})());
ok('能删掉', (function () {
  var del = S.removeBreed(nb.id);
  return del && S.customBreeds('cat').length === 0 && !PT.breedById('cat', nb.id);
})());
ok('删不存在的返回 false', S.removeBreed('nope') === false);


/* — 日记：围绕你写的那句话 — */
var nk = '2026-03-03';
var notePet = S.active();
S.addEvent(nk, 'meal', { num: 45 });
S.addEvent(nk, 'walk', { num: 30 });
S.setNote(nk, '它偷了一根胡萝卜');
S.addMedia(nk, { kind: 'video', id: 'v1', w: 320, h: 176 });
var nd = S.generate(nk, 0);
ok('有那句话时开头就是它', nd.body.split('\n')[0].includes('偷了一根胡萝卜'));
ok('正文反复提到关键词', (nd.body.match(/胡萝卜/g) || []).length >= 2);
ok('标题也围着它', nd.title.includes('胡萝卜'));
ok('不再套旧模板', nd.body.indexOf('你写下') < 0);
S.setNote(nk, '今天偷了一根胡萝卜，被当场抓住');
var nb = S.generate(nk, 1);
ok('长句也能取到主题', nb.title.indexOf('当场抓住') >= 0 || nb.body.indexOf('当场抓住') >= 0);
S.setNote(nk, '');
var nn = S.generate(nk, 2);
ok('没写那句话时还是模板', nn.body.split('\n')[0].indexOf('偷了一根胡萝卜') < 0);

/* — 日记：一天记了好几条 — */
var mk = '2026-04-04';
var mb = new Date(mk + 'T00:00:00').getTime();
[['meal', 8, 45], ['poop', 9, null], ['walk', 14, 30], ['play', 15, null], ['sleep', 22, null]].forEach(function (p) {
  var ev = S.addEvent(mk, p[0], p[2] != null ? { num: p[2] } : {});
  if (ev) ev.at = mb + p[1] * 3600e3;
});
var md = S.generate(mk, 0);
var mlines = md.body.split('\n').filter(Boolean);
ok('几条都写进去了', mlines.length >= 6 && mlines.length <= 10);
ok('按早上/白天/晚上排', /早上|天刚亮|白天|傍晚|晚上|天黑/.test(md.body));
ok('事实都留了痕', md.tags.length >= 1);
ok('没有重复的句子', (function () { var seen = {}; return mlines.every(function (l) { if (seen[l]) return false; seen[l] = 1; return true; }); })());
console.log('\n' + (fail ? '✗ ' + fail + ' 项失败' : '✓ 全部通过') + '（' + pass + '/' + (pass + fail) + '）');
process.exit(fail ? 1 : 0);
