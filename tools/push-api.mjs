#!/usr/bin/env node
/* 用 GitHub REST API 推送本地提交（github.com:443 连不上时备用）
   用法：node tools/push-api.mjs <owner/repo> <branch>   （在 git 仓库根目录跑） */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const [repo, branch = 'main'] = process.argv.slice(2);
if (!repo) {
  console.error('用法: node tools/push-api.mjs owner/repo [branch]');
  process.exit(1);
}

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const token = execFileSync('gh', ['auth', 'token'], { encoding: 'utf8' }).trim();

async function api(path, init = {}) {
  const res = await fetch('https://api.github.com' + path, {
    ...init,
    headers: {
      authorization: 'Bearer ' + token,
      accept: 'application/vnd.github+json',
      'content-type': 'application/json',
      'user-agent': 'push-api'
    }
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${path}\n${text}`);
  return text ? JSON.parse(text) : null;
}

const head = git('rev-parse', 'HEAD');
const parent = git('rev-parse', 'HEAD^');
const baseTree = git('rev-parse', 'HEAD^^{tree}');
const tree = git('rev-parse', 'HEAD^{tree}');
const message = execFileSync('git', ['log', '-1', '--format=%B'], { encoding: 'utf8' }).replace(/\s+$/, '');
const meta = git('log', '-1', '--format=%an%x00%ae%x00%aI%x00%cn%x00%ce%x00%cI');
const [an, ae, aI, cn, ce, cI] = meta.split('\0');

console.log(`本地 HEAD   ${head}`);
console.log(`父提交      ${parent}`);
console.log(`树          ${tree}`);

const remote = await api(`/repos/${repo}/git/ref/heads/${branch}`);
console.log(`远端 ${branch}  ${remote.object.sha}`);
if (remote.object.sha === head) {
  console.log('远端已经是最新，不用推。');
  process.exit(0);
}
if (remote.object.sha !== parent) {
  /* 之前走过 API 推送时，远端 sha 会和本地不同但内容一致。比一下树再决定。 */
  const rCommit = await api(`/repos/${repo}/git/commits/${remote.object.sha}`);
  if (rCommit.tree.sha === baseTree) {
    console.log('远端提交 sha 不同但树一致，按对齐处理。');
  } else {
    console.error('远端和本地父提交不一致，脚本不处理这种情况。');
    process.exit(2);
  }
}

/* 1. 把这次改动的文件做成 blob */
const changed = git('diff-tree', '-r', '--name-status', '--no-commit-id', parent, head)
  .split('\n').filter(Boolean)
  .map((line) => line.split('\t'));
const entries = [];
for (const [status, path] of changed) {
  if (status.startsWith('D')) {
    entries.push({ path, mode: '100644', type: 'blob', sha: null });
    continue;
  }
  if (status.startsWith('R') || status.startsWith('C')) continue;
  /* 从 git 对象里取内容（工作区可能是 CRLF，直接用会跟本地 blob 不一致） */
  const buf = execFileSync('git', ['cat-file', 'blob', `${head}:${path}`]);
  const blob = await api(`/repos/${repo}/git/blobs`, {
    method: 'POST',
    body: JSON.stringify({ content: buf.toString('base64'), encoding: 'base64' })
  });
  entries.push({ path, mode: '100644', type: 'blob', sha: blob.sha });
  console.log(`  blob ${blob.sha.slice(0, 7)}  ${path}`);
}

/* 2. 在父树基础上拼出新树 */
const newTree = await api(`/repos/${repo}/git/trees`, {
  method: 'POST',
  body: JSON.stringify({ base_tree: baseTree, tree: entries })
});
console.log(`新树        ${newTree.sha}${newTree.sha === tree ? '（和本地一致）' : '（! 和本地不同）'}`);

const created = await api(`/repos/${repo}/git/commits`, {
  method: 'POST',
  body: JSON.stringify({
    message,
    tree: newTree.sha,
    /* 远端 sha 与本地不同（但树一致）时，新提交必须挂在远端那个 sha 下面 */
    parents: [remote.object.sha],
    author: { name: an, email: ae, date: aI },
    committer: { name: cn, email: ce, date: cI }
  })
});
console.log(`远端新提交  ${created.sha}`);
if (created.sha !== head) {
  console.log('! 提交 sha 和本地不同（作者/时间/消息有差异），只能用远端的这个');
}

await api(`/repos/${repo}/git/refs/heads/${branch}`, {
  method: 'PATCH',
  body: JSON.stringify({ sha: created.sha, force: false })
});
console.log(`✓ ${branch} 已指向 ${created.sha.slice(0, 7)}`);
