/* tools/preview.mjs — 在终端里预览生成效果（调文案用） */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
globalThis.window = globalThis;
for (const f of ['types.js', 'writer.js']) {
  new Function(fs.readFileSync(path.join(root, 'src', f), 'utf8'))();
}
const PT = window.PT;

const cat = { name: '麻薯', species: 'cat', personality: 'tsundere' };
const dog = { name: '豆包', species: 'dog', personality: 'clingy' };

const days = [
  { date: '2026-11-16', pet: cat, ev: [['meal', 45], ['poop', null, '正常'], ['cuddle']], note: '' },
  { date: '2026-11-15', pet: cat, ev: [['walk', 30], ['play'], ['meal', 50]], note: '' },
  { date: '2026-11-14', pet: cat, ev: [['vomit'], ['vet'], ['med']], note: '吐了两次，明天还是带去看看吧' },
  { date: '2026-11-12', pet: cat, ev: [['bath'], ['weight', 4.3], ['meal', 40]], note: '' },
  { date: '2026-11-10', pet: cat, ev: [['naughty'], ['meal', 35], ['cuddle']], note: '' },
  { date: '2026-11-09', pet: cat, ev: [['sleep']], note: '' },
  { date: '2026-11-08', pet: dog, ev: [['walk', 60], ['play'], ['poop', null, '偏软']], note: '' }
];

for (const d of days) {
  const events = d.ev.map((e, i) => ({
    type: e[0], num: e[1] == null ? undefined : e[1], opt: e[2] || undefined, at: i
  }));
  const r = PT.WRITER.generate({ pet: d.pet, date: d.date, events, note: d.note, reroll: 0, history: [] });
  console.log('─'.repeat(56));
  console.log(d.date, '·', d.pet.name, '·', d.pet.personality, '·', r.mood);
  console.log('《' + r.title + '》');
  console.log(r.body);
  console.log();
}

// 同一批事实，重写三次，看差异
const events = [['meal', 45], ['walk', 30], ['play']].map((e, i) => ({ type: e[0], num: e[1], at: i }));
console.log('='.repeat(56));
for (let k = 0; k < 3; k++) {
  const r = PT.WRITER.generate({ pet: cat, date: '2026-11-16', events, reroll: k, history: [] });
  console.log(`【重写 ${k}】《${r.title}》\n${r.body}\n`);
}
