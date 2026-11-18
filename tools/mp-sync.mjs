// 把 src/ 里那套浏览器脚本搬成小程序能 require 的模块
// 改动只有两处：window.PT 换成共享模块，localStorage 换成 PT.STORAGE
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SRC = 'src';
const OUT = 'mp/utils';
mkdirSync(OUT, { recursive: true });

const files = ['types.js', 'writer.js', 'theme.js', 'store.js'];

for (const f of files) {
  let s = readFileSync(join(SRC, f), 'utf8').replace(/^\uFEFF/, '');
  const before = s;
  s = s.replace('var PT = (window.PT = window.PT || {});', "var PT = require('./pt-core.js');");
  s = s.replace(/localStorage\.getItem\(/g, 'PT.STORAGE.getItem(');
  s = s.replace(/localStorage\.setItem\(/g, 'PT.STORAGE.setItem(');
  if (s === before) {
    console.warn('!! 没替换到 window.PT：' + f);
  }
  if (/window\.|localStorage/.test(s)) {
    console.warn('!! 还残留浏览器 API：' + f);
  }
  // IIFE 里的 PT 在外面拿不到，直接导出共享的 pt-core
  s += "\nmodule.exports = require('./pt-core.js');\n";
  writeFileSync(join(OUT, f), s, 'utf8');
  console.log('copied', f, before.length, '->', s.length);
}
