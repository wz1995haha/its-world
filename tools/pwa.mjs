/* pwa.mjs — 生成加到桌面要用的东西
 * - dist/icon-192.png、dist/icon-512.png（由 shots/icon.html 渲染，这里只是复制）
 * - dist/manifest.json（standalone，加到桌面后没有浏览器地址栏）
 * 这样「发链接」的场景下，手机加到主屏幕会是一张正经图标，而不是网页截图。
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, 'dist');
mkdirSync(dist, { recursive: true });

const icons = [
  ['assets/icon-192.png', 'icon-192.png'],
  ['assets/icon-512.png', 'icon-512.png']
];

for (const [from, to] of icons) {
  const src = join(root, from);
  if (!existsSync(src)) {
    console.log('! 缺少 ' + from);
    continue;
  }
  copyFileSync(src, join(dist, to));
}

const manifest = {
  name: '它眼里的世界',
  short_name: '它的世界',
  description: '你只记事实，它来写日记。',
  start_url: './index.html',
  scope: './',
  display: 'standalone',
  orientation: 'portrait',
  background_color: '#F5EEE3',
  theme_color: '#F5EEE3',
  lang: 'zh-CN',
  icons: [
    { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
  ]
};

writeFileSync(join(dist, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log('✓ dist/manifest.json + 图标');
