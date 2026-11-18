import { readFileSync, statSync } from 'node:fs';

const p = 'dist/index.html';
const s = readFileSync(p, 'utf8');
const external = [...s.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)].map((m) => m[1]);
const css = [...s.matchAll(/url\((https?:[^)]+)\)/g)].map((m) => m[1]);
console.log('字节数:', statSync(p).size, '≈', Math.round(statSync(p).size / 1024) + ' KB');
console.log('外部 src/href:', external.length, external.slice(0, 5));
console.log('外部 url():', css.length, css.slice(0, 5));
console.log('含 <script src=:', /<script[^>]+src=/.test(s));
console.log('含 fetch(/XMLHttpRequest:', /fetch\(|XMLHttpRequest/.test(s));
