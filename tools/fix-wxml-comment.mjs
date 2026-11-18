/* fix-wxml-comment.mjs — WXML 里不能用 /* *\/ 这种注释，
 * 它会被当成普通文本渲染出来（页面上多一行乱码）。统一换成 <!-- -->。
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('..', import.meta.url)), 'mp');
let n = 0;

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    if (!p.endsWith('.wxml')) continue;
    let s = readFileSync(p, 'utf8');
    const out = s.replace(/^\s*\/\*([\s\S]*?)\*\/\s*\n?/gm, (m, body) => {
      n++;
      return '<!--' + body.replace(/\*\//g, '') + '-->\n';
    });
    if (out !== s) writeFileSync(p, out, 'utf8');
  }
}

walk(root);
console.log('✓ 修了 ' + n + ' 处');
