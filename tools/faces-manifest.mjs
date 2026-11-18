import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
// 用 vm 跑一份 types.js 拿品种顺序（它只依赖 window.PT）
import vm from 'node:vm';
const src = readFileSync('src/types.js', 'utf8');
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(src, ctx);
const PT = ctx.window.PT;

const moods = ['calm', 'happy'];
const keys = [];
['cat', 'dog'].forEach((sp) => {
  (PT.BREEDS[sp] || []).forEach((b) => {
    moods.forEach((m) => keys.push({ species: sp, breed: b.id, mood: m, key: sp + '-' + b.id + '-' + m }));
  });
});

writeFileSync('shots/faces-manifest.json', JSON.stringify(keys, null, 1), 'utf8');
console.log('cells', keys.length, 'cols 8 rows', Math.ceil(keys.length / 8));
console.log(keys.slice(0, 3).map((k) => k.key).join(', '));
