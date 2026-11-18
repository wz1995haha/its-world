#!/usr/bin/env node
/* 让本地分支指向远端那个提交（github.com 连不上、没法 fetch 时用）
   用法：node tools/adopt-remote.mjs <owner/repo> [branch] */
import { execFileSync } from 'node:child_process';

const [repo, branch = 'main'] = process.argv.slice(2);
const token = execFileSync('gh', ['auth', 'token'], { encoding: 'utf8' }).trim();
const get = async (path) => {
  const res = await fetch('https://api.github.com' + path, {
    headers: { authorization: 'Bearer ' + token, accept: 'application/vnd.github+json' }
  });
  const body = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(body));
  return body;
};

const ref = await get(`/repos/${repo}/git/ref/heads/${branch}`);
const info = await get(`/repos/${repo}/git/commits/${ref.object.sha}`);

const ts = (iso) => {
  const d = new Date(iso);
  return `${Math.floor(d.getTime() / 1000)} +0000`;
};

const body = `${info.message.replace(/\s+$/, '')}\n`;
const raw =
  `tree ${info.tree.sha}\n` +
  info.parents.map((p) => `parent ${p.sha}\n`).join('') +
  `author ${info.author.name} <${info.author.email}> ${ts(info.author.date)}\n` +
  `committer ${info.committer.name} <${info.committer.email}> ${ts(info.committer.date)}\n` +
  `\n${body}`;

const sha = execFileSync('git', ['hash-object', '-t', 'commit', '-w', '--stdin'], {
  input: raw,
  encoding: 'utf8'
}).trim();
console.log(`远端提交 ${info.sha}`);
console.log(`本地对象 ${sha}${sha === info.sha ? '（一致）' : '（! 不一致）'}`);
if (sha === info.sha) {
  execFileSync('git', ['update-ref', `refs/heads/${branch}`, sha]);
  execFileSync('git', ['update-ref', `refs/remotes/origin/${branch}`, sha]);
  console.log(`✓ 本地 ${branch} 已对齐`);
}
