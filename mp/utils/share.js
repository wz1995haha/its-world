/**
 * 分享图：把宠物头像 + 名字 + 年龄画成一张 500x400 的卡片，
 * 供 onShareAppMessage / onShareTimeline 使用。
 *
 * 用法（页面里）：
 *   const share = require('../../utils/share.js');
 *   share.prepare(this, pet);              // 页面 onLoad / onShow 时调，异步出图
 *   onShareAppMessage() { return share.message(this, pet); }
 */

const CACHE = {};

function facePath(pet) {
  if (pet && pet.photo) return pet.photo;
  const species = (pet && pet.species) || 'cat';
  const breed = (pet && pet.breedId) || (species === 'cat' ? 'orange' : 'tianyuan');
  return '/assets/faces/' + species + '-' + breed + '-calm.png';
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function ageText(pet) {
  if (!pet || !pet.birthday) return '';
  const b = new Date(pet.birthday.replace(/-/g, '/'));
  if (isNaN(b.getTime())) return '';
  const now = new Date();
  let m = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) m -= 1;
  if (m < 0) return '';
  if (m < 12) return m + ' 个月';
  return Math.floor(m / 12) + ' 岁' + (m % 12 ? ' ' + (m % 12) + ' 个月' : '');
}

function daysText(pet) {
  if (!pet) return '';
  const from = pet.homeDate || String(pet.createdAt || '').slice(0, 10);
  if (!from) return '';
  const a = new Date(from.replace(/-/g, '/'));
  if (isNaN(a.getTime())) return '';
  const d = Math.floor((Date.now() - a.getTime()) / 86400000) + 1;
  if (d < 1) return '';
  return '陪伴第 ' + d + ' 天';
}

/* 画图 */
function draw(page, pet, cb) {
  const q = wx.createSelectorQuery().in(page);
  q.select('#shareCanvas').fields({ node: true, size: true }).exec(function (res) {
    if (!res || !res[0] || !res[0].node) { cb(''); return; }
    const canvas = res[0].node;
    const ctx = canvas.getContext('2d');
    const W = 500, H = 400, dpr = 2;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    /* 背景 */
    ctx.fillStyle = '#F5EEE3';
    ctx.fillRect(0, 0, W, H);

    /* 右上角的暖色圆 */
    ctx.beginPath();
    ctx.arc(430, 60, 90, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(194, 97, 63, 0.10)';
    ctx.fill();

    const done = function (avatar) {
      /* 头像 */
      if (avatar) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(120, 150, 66, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, 54, 84, 132, 132);
        ctx.restore();
        ctx.beginPath();
        ctx.arc(120, 150, 66, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(58, 50, 44, 0.18)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      /* 名字 */
      ctx.fillStyle = '#3A322C';
      ctx.font = 'bold 44px sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText((pet.name || '它').slice(0, 8), 210, 120);

      /* 品种 / 年龄 */
      const bits = [];
      if (pet.breedLabel) bits.push(pet.breedLabel);
      const age = ageText(pet);
      if (age) bits.push(age);
      ctx.fillStyle = '#8C8074';
      ctx.font = '24px sans-serif';
      if (bits.length) ctx.fillText(bits.join(' · '), 212, 164);

      /* 一行关键词 */
      ctx.fillStyle = '#C2613F';
      ctx.font = '22px sans-serif';
      ctx.fillText('疫苗 · 驱虫 · 看病 · 体重', 211, 206);

      /* 陪伴天数 */
      const dtext = daysText(pet);
      if (dtext) {
        ctx.fillStyle = '#8C8074';
        ctx.font = '24px sans-serif';
        ctx.fillText(dtext, 212, 244);
      }

      /* 底部卡片 */
      roundRect(ctx, 40, 300, 420, 64, 16);
      ctx.fillStyle = 'rgba(255, 253, 248, 0.85)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(58, 50, 44, 0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#3A322C';
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText('爪记一生', 66, 333);

      ctx.fillStyle = '#8C8074';
      ctx.font = '20px sans-serif';
      ctx.fillText('疫苗、驱虫、看病，一页记一辈子', 186, 334);

      wx.canvasToTempFilePath({
        canvas: canvas,
        destWidth: W * dpr,
        destHeight: H * dpr,
        success: function (r) { cb(r.tempFilePath); },
        fail: function () { cb(''); }
      });
    };

    const img = canvas.createImage();
    img.onload = function () { done(img); };
    img.onerror = function () { done(null); };
    img.src = facePath(pet);
  });
}

/* 页面里调：异步生成并缓存 */
function prepare(page, pet) {
  if (!page || !pet) return;
  const key = pet.id + '|' + (pet.name || '') + '|' + (pet.photo ? pet.photo.slice(-16) : '');
  if (CACHE[key]) {
    page.setData({ shareImg: CACHE[key] });
    return;
  }
  setTimeout(function () {
    draw(page, pet, function (path) {
      if (!path) return;
      CACHE[key] = path;
      try { page.setData({ shareImg: path }); } catch (e) {}
    });
  }, 300);
}

/* 组装 onShareAppMessage 的返回 */
function message(page, pet) {
  const name = (pet && pet.name) || '它';
  return {
    title: name + ' 的健康本 · 疫苗、驱虫、看病都记着',
    path: '/pages/home/home',
    imageUrl: (page && page.data && page.data.shareImg) || ''
  };
}

/* 组装 onShareTimeline 的返回 */
function timeline(page, pet) {
  const name = (pet && pet.name) || '它';
  return {
    title: name + ' 的健康本 · 爪记一生',
    query: '',
    imageUrl: (page && page.data && page.data.shareImg) || ''
  };
}

module.exports = {
  prepare: prepare,
  message: message,
  timeline: timeline,
  facePath: facePath
};
