/* build.mjs — 把 src/ 内联成单文件 dist/index.html */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const src = join(root, 'src');
const dist = join(root, 'dist');

let html = readFileSync(join(src, 'index.html'), 'utf8');

/* 读文件时顺手去掉 BOM：CSS 里的 BOM 会让 :root 变量整块失效（内联后会变成选择器的一部分） */
const read = (f) => readFileSync(join(src, f), 'utf8').replace(/^\uFEFF/, '');

html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, f) => {
  const css = read(f);
  return `<style>\n${css}\n</style>`;
});

html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, f) => {
  const js = read(f);
  if (/<\/script>/i.test(js)) throw new Error(`${f} 含有 </script>，无法内联`);
  return `<script>\n${js}\n</script>`;
});

if (!html.includes('<style>')) throw new Error('样式没有内联成功');

mkdirSync(dist, { recursive: true });
writeFileSync(join(dist, 'index.html'), html, 'utf8');

/* docs/ = 给 GitHub Pages 用的同一份产物（Pages 只认 / 或 /docs） */
const docs = join(root, 'docs');
mkdirSync(docs, { recursive: true });
writeFileSync(join(docs, 'index.html'), html, 'utf8');
for (const f of ['manifest.json', 'icon-192.png', 'icon-512.png']) {
  try {
    writeFileSync(join(docs, f), readFileSync(join(dist, f)));
  } catch { /* 图标还没生成，跳过 */ }
}

const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);
console.log(`✓ dist/index.html  ${kb} KB  （单文件，可直接双击打开）`);
