/* face.js — 小程序里的简化版脸
 *
 * 浏览器版用 SVG 画了 26 个品种的头像；小程序没有 DOM，
 * 这里先用「一堆 view + 圆角」拼一个简化脸，只保留最能认人的三件事：
 *   毛色 / 耳朵形状 / 花纹色块
 * 之后要换成真 SVG，把这一个文件换掉就行，页面不用动。
 */

var PT = require('./all.js');

/* 每个品种：耳朵形状 + 额外色块 */
var TRAITS = {
  /* 猫 */
  orange: { ear: 'point' },
  lihua: { ear: 'point', stripe: true },
  sanhua: { ear: 'point', patch: true },
  cow: { ear: 'point', patch: true },
  white: { ear: 'point' },
  black: { ear: 'point' },
  ragdoll: { ear: 'point', mask: true },
  siamese: { ear: 'point', mask: true },
  blue: { ear: 'point' },
  silver: { ear: 'point', stripe: true },
  tiger: { ear: 'point', stripe: true },
  /* 狗 */
  shiba: { ear: 'prick', blaze: false },
  corgi: { ear: 'prick', blaze: true },
  golden: { ear: 'flop' },
  lab: { ear: 'flop' },
  poodle: { ear: 'flop', topknot: true },
  border: { ear: 'semi', blaze: true },
  husky: { ear: 'prick', mask: true },
  samoyed: { ear: 'prick', chest: true },
  bichon: { ear: 'flop', cloud: true },
  maltese: { ear: 'long' },
  shihtzu: { ear: 'long', bow: true },
  westie: { ear: 'small' },
  schnauzer: { ear: 'semi', beard: true },
  pomeranian: { ear: 'small', cloud: true },
  tianyuan: { ear: 'prick' }
};

var MOOD_EYES = {
  calm: 'open',
  happy: 'open',
  love: 'open',
  proud: 'squint',
  sick: 'droop',
  sleepy: 'shut',
  excited: 'open'
};

/* 给 wxml 用的样式对象 */
function styleOf(species, mood, breedId) {
  var b = PT.breedById(species, breedId) || {};
  var t = TRAITS[(b && b.id) || ''] || { ear: species === 'dog' ? 'prick' : 'point' };

  /* 花纹优先看品种表里的 pattern，没写再看 TRAITS */
  var pat = b.pattern || '';
  var stripe = pat === 'tabby' || !!t.stripe;
  var patch = pat === 'calico' || pat === 'patch' || !!t.patch;
  var mask = pat === 'point' || pat === 'mask' || !!t.mask;

  var fur = b.fur || '#E8D6BC';
  var furD = b.furD || '#C9B295';
  return {
    fur: fur,
    furd: furD,
    eye: b.eye || '#3A322C',
    ear: t.ear,
    stripe: stripe,
    patch: patch,
    mask: mask,
    blaze: !!t.blaze,
    chest: !!t.chest,
    cloud: !!t.cloud,
    beard: !!t.beard,
    bow: !!t.bow,
    topknot: !!t.topknot,
    eyes: MOOD_EYES[mood] || 'open',
    dark: isDark(fur)
  };
}

function isDark(hex) {
  var h = String(hex).replace('#', '');
  if (h.length !== 6) return false;
  var r = parseInt(h.slice(0, 2), 16);
  var g = parseInt(h.slice(2, 4), 16);
  var b = parseInt(h.slice(4, 6), 16);
  return (r * 0.299 + g * 0.587 + b * 0.114) < 120;
}

module.exports = { styleOf: styleOf, TRAITS: TRAITS };
