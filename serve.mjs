/* serve.mjs — 本地预览（只是为了方便在浏览器里打开，应用本身不依赖服务器） */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 5188);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.svg': 'image/svg+xml'
};

createServer(async (req, res) => {
  try {
    let p = decodeURIComponent((req.url || '/').split('?')[0]);
    /* 让页面晚点 load 完：无头截图靠这个把渲染时机往后推 */
    if (p === '/slow') {
      const ms = Math.min(60000, Number(new URL(req.url, 'http://x').searchParams.get('ms') || 1000));
      setTimeout(() => res.writeHead(204).end(), ms);
      return;
    }
    if (p === '/' || p === '') p = '/dist/index.html';
    const file = join(root, p);
    if (!file.startsWith(root)) { res.writeHead(403).end('no'); return; }
    let buf;
    try {
      buf = await readFile(file);
    } catch {
      /* 根路径找不到就去 dist/ 里找：这样 /manifest.json、/icon-192.png 也能用 */
      buf = await readFile(join(root, 'dist', p));
    }
    res.writeHead(200, {
      'content-type': types[extname(file)] || 'application/octet-stream',
      'cache-control': 'no-store'
    });
    res.end(buf);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('404');
  }
}).listen(port, process.env.HOST || '127.0.0.1', () => {
  console.log(`它眼里的世界 → http://127.0.0.1:${port}`);
});
