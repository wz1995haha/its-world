/* bom.mjs — 检查/剥掉 UTF-8 BOM
 * 用法：node tools/bom.mjs          只检查
 *      node tools/bom.mjs --fix    顺手清掉
 * 为什么要这个：BOM 混进 <style> 或 wxss 里，会把紧跟其后的那条规则整条废掉
 * （选择器前面多了个不可见字符），排查起来极其费时。
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const exts = new Set(['.js', '.mjs', '.json', '.wxml', '.wxss', '.css', '.html', '.md']);
const skip = new Set(['node_modules', '.git', 'dist', 'shots']);

const fix = process.argv.includes('--fix');
const hits = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (skip.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) { walk(p); continue; }
    if (!exts.has(extname(p))) continue;
    const buf = readFileSync(p);
    /* BOM 不只会在文件开头：粘贴/拼接时可能落在中间，一样会把后面那条规则废掉 */
    const text = buf.toString('utf8');
    const hasBom = text.includes('\uFEFF');
    if (hasBom) {
      hits.push(p.slice(root.length));
      if (fix) writeFileSync(p, text.replace(/\uFEFF/g, ''), 'utf8');
    }
  }
}

walk(root);

if (!hits.length) {
  console.log('✓ 没有 BOM');
} else if (fix) {
  console.log('✓ 清掉了 ' + hits.length + ' 个 BOM：\n  ' + hits.join('\n  '));
} else {
  console.log('✗ 有 ' + hits.length + ' 个文件带 BOM（加 --fix 清掉）：\n  ' + hits.join('\n  '));
  process.exitCode = 1;
}
