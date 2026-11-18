/* wxml-check.mjs — 不打开微信开发者工具，先查一遍绑定
 *
 * 1. WXML 里 {{...}} 用到的顶层变量，是否都在 page 的 data 里出现过
 * 2. bindtap/bindinput/bindchange 指向的方法，是否在该页 js 里定义
 * 3. 标签是否成对
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../mp/', import.meta.url));
const pages = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.wxml')) pages.push(p);
  }
}
walk(root);

const KNOWN = new Set([
  'item', 'index', 'true', 'false', 'null', 'undefined', 'length',
  'wx', 'Math', 'JSON', 'Object', 'Array', 'String', 'Number', 'Date'
]);

let bad = 0;
for (const wxml of pages) {
  const dir = dirname(wxml);
  const js = join(dir, dirname(wxml).split(/[\\/]/).pop() + '.js');
  const w = readFileSync(wxml, 'utf8');
  const j = readFileSync(js, 'utf8');

  /* data 里出现过的 key（含 setData({x: ...}) 和 data: {x: ...}） */
  const keys = new Set();
  for (const m of j.matchAll(/\bdata\s*:\s*\{/g)) {
    let i = m.index + m[0].length, depth = 1, start = i;
    while (i < j.length && depth > 0) {
      const c = j[i];
      if (c === '{') depth++;
      else if (c === '}') depth--;
      i++;
    }
    for (const k of j.slice(start, i).matchAll(/(?:^|[\s,{])([A-Za-z_$][\w$]*)\s*:/g)) keys.add(k[1]);
  }
  for (const m of j.matchAll(/setData\s*\(\s*\{/g)) {
    let i = m.index + m[0].length, depth = 1, start = i;
    while (i < j.length && depth > 0) {
      const c = j[i];
      if (c === '{') depth++;
      else if (c === '}') depth--;
      i++;
    }
    for (const k of j.slice(start, i).matchAll(/(?:^|[\s,{])([A-Za-z_$][\w$]*)\s*:/g)) keys.add(k[1]);
  }

  /* 组件的 properties 也算数 */
  for (const m of j.matchAll(/properties\s*:\s*\{/g)) {
    let i = m.index + m[0].length, depth = 1, start = i;
    while (i < j.length && depth > 0) {
      const c = j[i];
      if (c === '{') depth++;
      else if (c === '}') depth--;
      i++;
    }
    for (const k of j.slice(start, i).matchAll(/(?:^|[\s,{])([A-Za-z_$][\w$]*)\s*:/g)) keys.add(k[1]);
  }

  /* 方法名：`name() {` 或 `name: function () {` */
  const methods = new Set();
  for (const m of j.matchAll(/(?:^|\n)\s{2}([A-Za-z_$][\w$]*)\s*(?:\([^)]*\)|:\s*function\s*\([^)]*\))\s*\{/g)) methods.add(m[1]);

  /* 绑定表达式里的顶层标识符 */
  const used = new Set();
  for (const m of w.matchAll(/\{\{([^}]*)\}\}/g)) {
    let expr = m[1];
    /* 去掉字符串字面量，避免把中文当成变量 */
    expr = expr.replace(/'[^']*'/g, "''").replace(/"[^"]*"/g, '""');
    for (const id of expr.matchAll(/(^|[^.\w$])([A-Za-z_$][\w$]*)/g)) used.add(id[2]);
  }

  for (const u of used) {
    if (KNOWN.has(u) || keys.has(u) || methods.has(u)) continue;
    /* 允许 item.xxx 这类循环别名 */
    if (w.includes('wx:for-item="' + u + '"')) continue;
    console.log('· ' + wxml.replace(root, '') + '  未在 data 里找到：' + u);
    bad++;
  }

  for (const m of w.matchAll(/bind(?:tap|input|change|confirm|blur|longpress)="([\w$]+)"/g)) {
    if (!methods.has(m[1])) {
      console.log('· ' + wxml.replace(root, '') + '  bind 指向不存在的方法：' + m[1]);
      bad++;
    }
  }
}

console.log(bad ? `\n✗ ${bad} 处可疑` : '\n✓ 绑定检查通过');
