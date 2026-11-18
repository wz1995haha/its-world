/* art.js — 手绘风格 SVG：宠物表情、爪印、空状态小画
   猫狗的脸按品种改五官：头形、耳朵（立耳/垂耳/半立/卷毛球）、口鼻（白口罩）、额头白斑、眼罩、眉毛 */
(function () {
  'use strict';
  var PT = (window.PT = window.PT || {});

  var INK = '#3A322C';
  var FUR = '#EFE3D0';
  var FUR_D = '#E2D2BB';
  var ACC = '#C2613F';
  var BLUSH = '#D98A72';
  var CREAM = '#F6EEE1';
  var PINK = '#D79A93';

  function esc(n) { return (Math.round(n * 10) / 10).toString(); }

  function lum(hex) {
    var n = parseInt(String(hex).replace('#', ''), 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return (r * 0.299 + g * 0.587 + b * 0.114) / 255;
  }

  /* 猫：脸型按品种微调 */
  var CAT_TRAITS = {
    orange: { ears: 'point', cheek: true },
    lihua: { ears: 'point' },
    sanhua: { ears: 'point' },
    cow: { ears: 'point' },
    white: { ears: 'point', pink: true },
    black: { ears: 'point' },
    ragdoll: { ears: 'point', cheek: true, fluffy: true },
    siamese: { ears: 'point', big: true },
    blue: { ears: 'point', cheek: true, round: true },
    silver: { ears: 'point', cheek: true },
    tiger: { ears: 'point', cheek: true }
  };

  /* 狗：决定「像不像」的几个关键——耳朵、头形、口鼻、白斑、眉毛 */
  var DOG_TRAITS = {
    shiba: { ears: 'prick', head: 'wedge', muzzle: 'cream', brows: true, cheeks: true },
    corgi: { ears: 'prick', head: 'round', muzzle: 'cream', blaze: true, brows: true, mz: 1.02 },
    golden: { ears: 'flop', head: 'broad', muzzle: 'cream', mz: 1.14 },
    lab: { ears: 'flop', head: 'broad', muzzle: 'cream', mz: 1.12 },
    poodle: { ears: 'flop', head: 'round', muzzle: 'same', topknot: true, mz: 0.94 },
    border: { ears: 'semi', head: 'broad', muzzle: 'cream', blaze: true },
    husky: { ears: 'prick', head: 'broad', muzzle: 'cream', blaze: true, mask: true },
    samoyed: { ears: 'prick', earScale: 1.1, head: 'broad', muzzle: 'cream', smile: true, chest: true, mz: 1.06 },
    bichon: { ears: 'drop', head: 'round', cloud: true, muzzle: 'short', mz: 0.92 },
    westie: { ears: 'prick', earScale: 0.74, head: 'wedge', muzzle: 'short', brows: true, chest: true, mz: 0.92 },
    schnauzer: { ears: 'semi', head: 'broad', muzzle: 'beard', browLight: true },
    shihtzu: { ears: 'long', head: 'round', muzzle: 'short', topknot: 'bow', mz: 0.86 },
    maltese: { ears: 'long', head: 'round', muzzle: 'short', mz: 0.84 },
    pomeranian: { ears: 'prick', earSmall: true, head: 'round', cloud: true, muzzle: 'short', chest: true, mz: 0.78 },
    tianyuan: { ears: 'prick', head: 'wedge', muzzle: 'cream', brows: true }
  };

  function pal(b) {
    b = b || {};
    var fur = b.fur || FUR;
    return {
      id: b.id || '',
      fur: fur,
      furD: b.furD || FUR_D,
      eye: b.eye || null,
      pattern: b.pattern || '',
      dark: lum(fur) < 0.55,
      line: lum(fur) < 0.55 ? CREAM : INK
    };
  }

  /* ---------------- 眼睛 ---------------- */

  function eye(cx, cy, kind, species, r, tint) {
    r = r || 1;
    var sw = 2.2;
    var s = 'fill="none" stroke="' + INK + '" stroke-width="' + sw + '" stroke-linecap="round"';
    var pupFill = tint ? 'fill="' + tint + '"' : 'fill="' + INK + '"';
    var w = 10 * r, h = 11 * r;
    switch (kind) {
      case 'open':
        if (species === 'dog') {
          return '<ellipse cx="' + esc(cx) + '" cy="' + esc(cy) + '" rx="' + esc(w * 0.85) + '" ry="' + esc(h * 0.9) + '" fill="#fff" stroke="' + INK + '" stroke-width="2"/>' +
            '<circle cx="' + esc(cx) + '" cy="' + esc(cy + 1) + '" r="' + esc(5.2 * r) + '" ' + pupFill + '/>' +
            '<circle cx="' + esc(cx - 2) + '" cy="' + esc(cy - 2.4) + '" r="1.5" fill="#fff"/>';
        }
        return '<ellipse cx="' + esc(cx) + '" cy="' + esc(cy) + '" rx="' + esc(w * 0.8) + '" ry="' + esc(h * 0.9) + '" fill="#fff" stroke="' + INK + '" stroke-width="1.8"/>' +
          '<ellipse cx="' + esc(cx) + '" cy="' + esc(cy + 0.5) + '" rx="' + esc(2.6 * r) + '" ry="' + esc(7.4 * r) + '" ' + pupFill + '/>' +
          '<circle cx="' + esc(cx - 1.4) + '" cy="' + esc(cy - 3.4) + '" r="1.3" fill="#fff"/>';
      case 'happy':
        return '<path d="M' + esc(cx - w) + ' ' + esc(cy + 3) + ' Q' + esc(cx) + ' ' + esc(cy - 9 * r) + ' ' + esc(cx + w) + ' ' + esc(cy + 3) + '" ' + s + '/>';
      case 'closed':
        return '<path d="M' + esc(cx - w) + ' ' + esc(cy) + ' Q' + esc(cx) + ' ' + esc(cy + 8 * r) + ' ' + esc(cx + w) + ' ' + esc(cy) + '" ' + s + '/>';
      case 'half':
        return '<path d="M' + esc(cx - w) + ' ' + esc(cy - 2) + ' Q' + esc(cx) + ' ' + esc(cy + 5 * r) + ' ' + esc(cx + w) + ' ' + esc(cy - 2) + '" ' + s + '/>' +
          '<path d="M' + esc(cx - w) + ' ' + esc(cy - 4) + ' L' + esc(cx + w) + ' ' + esc(cy - 4) + '" ' + s + '/>';
      case 'big':
        return '<ellipse cx="' + esc(cx) + '" cy="' + esc(cy) + '" rx="' + esc(w) + '" ry="' + esc(h * 1.05) + '" fill="#fff" stroke="' + INK + '" stroke-width="2"/>' +
          '<circle cx="' + esc(cx) + '" cy="' + esc(cy + 1) + '" r="' + esc(5.6 * r) + '" ' + pupFill + '/>' +
          '<circle cx="' + esc(cx - 2.2) + '" cy="' + esc(cy - 2.6) + '" r="2" fill="#fff"/>' +
          '<circle cx="' + esc(cx + 3.2) + '" cy="' + esc(cy + 3.6) + '" r="1.1" fill="#fff"/>';
      case 'sick':
        return '<path d="M' + esc(cx - w) + ' ' + esc(cy + 4) + ' Q' + esc(cx) + ' ' + esc(cy - 4) + ' ' + esc(cx + w) + ' ' + esc(cy + 4) + '" ' + s + '/>' +
          '<path d="M' + esc(cx - 3) + ' ' + esc(cy - 7) + ' Q' + esc(cx) + ' ' + esc(cy - 3) + ' ' + esc(cx + 3) + ' ' + esc(cy - 7) + '" ' + s + '/>';
      case 'sleep':
        return '<path d="M' + esc(cx - w) + ' ' + esc(cy + 2) + ' Q' + esc(cx) + ' ' + esc(cy + 9 * r) + ' ' + esc(cx + w) + ' ' + esc(cy + 2) + '" ' + s + '/>';
      default:
        return '';
    }
  }

  function blush(cx, cy, r) {
    return '<ellipse cx="' + esc(cx) + '" cy="' + esc(cy) + '" rx="' + esc(r) + '" ry="' + esc(r * 0.62) + '" fill="' + BLUSH + '" opacity=".38"/>';
  }

  var E = { open: 'open', happy: 'happy', love: 'happy', proud: 'half', sick: 'sick', sleepy: 'sleep', excited: 'big' };
  function eyeKind(mood) { return E[mood] || 'open'; }

  /* ---------------- 耳朵 ---------------- */

  function catEars(p) {
    var inner = p.dark ? CREAM : PINK;
    var fill = p.fur;
    return '<path d="M58 66 L46 18 L94 44 Z" fill="' + fill + '" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
      '<path d="M62 60 L54 32 L86 47 Z" fill="' + inner + '"/>' +
      '<path d="M142 66 L154 18 L106 44 Z" fill="' + fill + '" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
      '<path d="M138 60 L146 32 L114 47 Z" fill="' + inner + '"/>';
  }

  function dogEars(t, p) {
    var fill = p.fur;
    if (t.ears === 'prick') {
      var s = '<path d="M64 72 L46 20 L98 46 Z" fill="' + fill + '" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
        '<path d="M66 64 L55 33 L87 48 Z" fill="' + CREAM + '" opacity=".34"/>' +
        '<path d="M136 72 L154 20 L102 46 Z" fill="' + fill + '" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
        '<path d="M134 64 L145 33 L113 48 Z" fill="' + CREAM + '" opacity=".34"/>';
      var k = t.earScale || (t.earSmall ? 0.84 : 1);
      return k === 1 ? s : '<g transform="translate(100 96) scale(' + k + ') translate(-100 -96)">' + s + '</g>';
    }
    if (t.ears === 'semi') {
      return '<path d="M62 74 L42 28 Q62 16 84 40 Z" fill="' + fill + '" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
        '<path d="M138 74 L158 28 Q138 16 116 40 Z" fill="' + fill + '" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
        '<path d="M46 40 Q60 34 74 46" fill="none" stroke="' + INK + '" stroke-width="1.6" opacity=".45"/>' +
        '<path d="M154 40 Q140 34 126 46" fill="none" stroke="' + INK + '" stroke-width="1.6" opacity=".45"/>';
    }
    if (t.ears === 'puff') {
      return '<circle cx="58" cy="70" r="19" fill="' + fill + '" stroke="' + INK + '" stroke-width="2.4"/>' +
        '<circle cx="142" cy="70" r="19" fill="' + fill + '" stroke="' + INK + '" stroke-width="2.4"/>' +
        '<circle cx="50" cy="57" r="12" fill="' + fill + '" stroke="' + INK + '" stroke-width="2"/>' +
        '<circle cx="150" cy="57" r="12" fill="' + fill + '" stroke="' + INK + '" stroke-width="2"/>';
    }
    if (t.ears === 'drop') {
      /* 比熊：垂在两侧的圆毛耳，位置低、贴脸 */
      return '<circle cx="44" cy="108" r="19" fill="' + fill + '" stroke="' + INK + '" stroke-width="2.4"/>' +
        '<circle cx="156" cy="108" r="19" fill="' + fill + '" stroke="' + INK + '" stroke-width="2.4"/>' +
        '<circle cx="36" cy="130" r="12" fill="' + fill + '" stroke="' + INK + '" stroke-width="2"/>' +
        '<circle cx="164" cy="130" r="12" fill="' + fill + '" stroke="' + INK + '" stroke-width="2"/>';
    }
    if (t.ears === 'long') {
      /* 西施 / 马尔济斯：从头顶垂到下巴的长毛，画在头后面 */
      return '<path d="M64 50 C32 58 22 112 30 152 C33 170 58 170 64 152 C74 118 76 78 72 52 Z" fill="' + fill + '" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
        '<path d="M136 50 C168 58 178 112 170 152 C167 170 142 170 136 152 C126 118 124 78 128 52 Z" fill="' + fill + '" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
        '<path d="M50 80 q-8 26 -5 52" fill="none" stroke="' + p.furD + '" stroke-width="2.4" stroke-linecap="round" opacity=".75"/>' +
        '<path d="M150 80 q8 26 5 52" fill="none" stroke="' + p.furD + '" stroke-width="2.4" stroke-linecap="round" opacity=".75"/>';
    }
    /* flop：垂耳，挂在脸两侧 */
    return '<path d="M66 58 C34 46 20 88 26 122 C30 146 48 156 58 140 C68 122 70 84 66 58 Z" fill="' + fill + '" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
      '<path d="M134 58 C166 46 180 88 174 122 C170 146 152 156 142 140 C132 122 130 84 134 58 Z" fill="' + fill + '" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>';
  }

  /* 萨摩耶那种毛茸茸的立耳：短、圆、外缘有弧度 */
  function fluffyEars(p) {
    return '<path d="M66 76 Q40 50 54 26 Q80 24 96 50 Z" fill="' + p.fur + '" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
      '<path d="M134 76 Q160 50 146 26 Q120 24 104 50 Z" fill="' + p.fur + '" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
      '<path d="M68 68 Q52 50 60 36 Q78 38 88 52 Z" fill="' + CREAM + '" opacity=".5"/>' +
      '<path d="M132 68 Q148 50 140 36 Q122 38 112 52 Z" fill="' + CREAM + '" opacity=".5"/>';
  }

  /* ---------------- 头形 ---------------- */

  /* 毛球轮廓：用一段段外凸的圆弧拼出一圈毛边，避免多个描边圆互相露出接缝 */
  function scallop(cx, cy, R, n, bulge, fill, stroke, sw) {
    var pts = [], i, a, d;
    for (i = 0; i < n; i++) {
      a = (Math.PI * 2 * i) / n - Math.PI / 2;
      pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]);
    }
    d = 'M' + esc(pts[0][0]) + ' ' + esc(pts[0][1]);
    for (i = 1; i <= n; i++) {
      var q = pts[i % n];
      d += ' A' + esc(bulge) + ' ' + esc(bulge) + ' 0 0 1 ' + esc(q[0]) + ' ' + esc(q[1]);
    }
    return '<path d="' + d + ' Z" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + (sw || 2.4) + '" stroke-linejoin="round"/>';
  }

  function headShape(t, p, species) {
    var attrs = 'fill="' + p.fur + '" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"';
    if (species === 'cat') {
      return '<ellipse cx="100" cy="104" rx="' + (t.cheek ? 62 : 58) + '" ry="' + (t.cheek ? 54 : 53) + '" ' + attrs + '/>';
    }
    if (t.cloud) {
      return scallop(100, 104, 54, 9, 21, p.fur, INK, 2.4) +
        '<ellipse cx="100" cy="104" rx="52" ry="47" fill="' + p.fur + '"/>';
    }
    if (t.head === 'round') {
      return '<ellipse cx="100" cy="104" rx="58" ry="53" ' + attrs + '/>';
    }
    if (t.head === 'wedge') {
      /* 柴犬 / 田园犬：上宽下收，脸略尖 */
      return '<path d="M42 92 Q44 54 100 50 Q156 54 158 92 Q156 138 100 150 Q44 138 42 92 Z" ' + attrs + '/>';
    }
    return '<ellipse cx="100" cy="102" rx="61" ry="52" ' + attrs + '/>';
  }

  /* ---------------- 花纹 ---------------- */

  function catMark(p) {
    var s = '';
    if (p.pattern === 'tabby') {
      s += '<g fill="none" stroke="' + p.furD + '" stroke-width="5" stroke-linecap="round" opacity=".75">' +
        '<path d="M86 74 q3 -9 -3 -17"/><path d="M100 70 q0 -11 0 -19"/><path d="M114 74 q-3 -9 3 -17"/>' +
        '<path d="M52 106 q-7 3 -10 9"/><path d="M148 106 q7 3 10 9"/>' +
        '</g>';
    } else if (p.pattern === 'patch') {
      s += '<path d="M54 74 q26 -22 46 -2 q8 14 -8 18 q-30 8 -38 -16 z" fill="' + p.furD + '" opacity=".9"/>' +
        '<path d="M140 60 q12 8 10 22 q-10 4 -14 -8 z" fill="' + p.furD + '" opacity=".8"/>';
    } else if (p.pattern === 'calico') {
      s += '<path d="M56 76 q22 -22 40 -2 q8 14 -8 18 q-28 8 -32 -16 z" fill="' + p.furD + '" opacity=".88"/>' +
        '<path d="M118 84 q22 -8 30 8 q4 15 -15 16 q-19 0 -15 -24 z" fill="#C4835A" opacity=".72"/>' +
        '<ellipse cx="100" cy="116" rx="15" ry="9" fill="' + p.furD + '" opacity=".3"/>';
    } else if (p.pattern === 'point') {
      s += '<ellipse cx="100" cy="120" rx="27" ry="19" fill="' + p.furD + '" opacity=".5"/>';
    }
    return s;
  }

  function dogMark(t, p) {
    var s = '';
    if (t.blaze) {
      s += '<path d="M100 50 Q110 62 108 84 L108 112 Q100 118 92 112 L92 84 Q90 62 100 50 Z" fill="' + CREAM + '" opacity=".92"/>';
    }
    if (t.mask) {
      s += '<ellipse cx="76" cy="92" rx="20" ry="15" fill="' + p.furD + '" opacity=".55"/>' +
        '<ellipse cx="124" cy="92" rx="20" ry="15" fill="' + p.furD + '" opacity=".55"/>';
    }
    if (p.pattern === 'patch' && !t.blaze) {
      s += '<path d="M104 50 q34 -4 40 30 q-6 22 -28 16 q-18 -8 -12 -46 z" fill="' + p.furD + '" opacity=".85"/>';
    }
    if (t.brows) {
      s += '<path d="M70 76 q6 -4 12 -2" fill="none" stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round" opacity=".7"/>' +
        '<path d="M130 76 q-6 -4 -12 -2" fill="none" stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round" opacity=".7"/>';
    }
    if (t.browLight) {
      /* 雪纳瑞的浓白眉 */
      s += '<path d="M64 84 q11 -9 23 -4" fill="none" stroke="' + CREAM + '" stroke-width="8" stroke-linecap="round"/>' +
        '<path d="M136 84 q-11 -9 -23 -4" fill="none" stroke="' + CREAM + '" stroke-width="8" stroke-linecap="round"/>';
    }
    if (t.topknot === 'bow') {
      s += '<path d="M100 46 l-17 -11 q-6 11 0 22 q12 0 17 -11 z" fill="' + ACC + '" opacity=".9" stroke="' + INK + '" stroke-width="1.6" stroke-linejoin="round"/>' +
        '<path d="M100 46 l17 -11 q6 11 0 22 q-12 0 -17 -11 z" fill="' + ACC + '" opacity=".9" stroke="' + INK + '" stroke-width="1.6" stroke-linejoin="round"/>' +
        '<circle cx="100" cy="46" r="4.5" fill="' + ACC + '" stroke="' + INK + '" stroke-width="1.6"/>';
    }
    if (t.topknot === true) {
      s += '<circle cx="100" cy="42" r="20" fill="' + p.furD + '" stroke="' + INK + '" stroke-width="2.2"/>' +
        '<path d="M86 34 q14 -8 28 0" fill="none" stroke="' + INK + '" stroke-width="1.5" opacity=".35"/>';
    }
    return s;
  }

  /* ---------------- 口鼻 ---------------- */

  function dogMuzzle(t, p, mouth) {
    var style = t.muzzle || 'cream';
    var mx = (style === 'cream' || style === 'beard') ? CREAM : p.furD;
    var s = t.mz || 1;
    var y = 126, rx = 27 * s, ry = 18 * s, op = style === 'same' ? '.5' : '.95';
    if (style === 'short') { rx = 23 * s; ry = 15 * s; y = 124; }
    var beard = style === 'beard'
      ? '<path d="M72 114 q28 -10 56 0 q-2 36 -28 38 q-26 -2 -28 -38 z" fill="' + CREAM + '" opacity=".95"/>' +
        '<path d="M84 140 q16 6 32 0" fill="none" stroke="' + INK + '" stroke-width="1.6" opacity=".25"/>'
      : '';
    var noseW = 28 * Math.max(s, .8);
    return beard +
      '<ellipse cx="100" cy="' + esc(y) + '" rx="' + esc(rx) + '" ry="' + esc(ry) + '" fill="' + mx + '" opacity="' + op + '"/>' +
      '<path d="M' + esc(100 - noseW / 2) + ' ' + esc(y - 14) + ' q' + esc(noseW / 2) + ' -5 ' + esc(noseW) + ' 0 q-2 12 -' + esc(noseW / 2) + ' 13 q-' + esc(noseW / 2 - 2) + ' -1 -' + esc(noseW / 2) + ' -13 z" fill="' + INK + '" opacity=".92" transform="translate(0,-2)"/>' +
      '<ellipse cx="95" cy="' + esc(y - 17) + '" rx="3" ry="1.8" fill="#fff" opacity=".45"/>' +
      mouth;
  }

  /* ---------------- 猫脸 ---------------- */

  function catFace(mood, o) {
    o = o || {};
    var p = pal(o.breed);
    var t = CAT_TRAITS[p.id] || { ears: 'point' };
    var kind = eyeKind(mood);
    var eyeR = t.big ? 1.1 : 1;
    var eyes = eye(80, 98, kind, 'cat', eyeR, p.eye) + eye(120, 98, kind, 'cat', eyeR, p.eye);
    var mouth = '';
    var extra = '';

    if (mood === 'happy' || mood === 'love' || mood === 'excited') {
      mouth = '<path d="M88 122 Q100 136 112 122" fill="none" stroke="' + p.line + '" stroke-width="2.2" stroke-linecap="round"/>' +
        '<path d="M96 129 Q100 136 104 129 Q100 133 96 129 Z" fill="' + ACC + '" opacity=".85"/>';
    } else if (mood === 'proud') {
      mouth = '<path d="M88 124 Q94 131 100 125" fill="none" stroke="' + p.line + '" stroke-width="2.2" stroke-linecap="round"/>' +
        '<path d="M100 125 Q106 119 113 124" fill="none" stroke="' + p.line + '" stroke-width="2.2" stroke-linecap="round"/>';
    } else if (mood === 'sick') {
      mouth = '<path d="M89 126 Q94 122 99 126 Q104 130 111 124" fill="none" stroke="' + p.line + '" stroke-width="2.2" stroke-linecap="round"/>';
      extra = '<path d="M148 62 q7 9 0 13 q-7 -4 0 -13 z" fill="#9DB0C6" opacity=".85"/>' +
        '<path d="M152 74 q4 4 0 7" fill="none" stroke="#9DB0C6" stroke-width="1.6" stroke-linecap="round"/>';
    } else if (mood === 'sleepy') {
      mouth = '<path d="M94 124 q6 5 12 0" fill="none" stroke="' + p.line + '" stroke-width="2.2" stroke-linecap="round"/>';
      extra = '<text x="150" y="52" font-size="15" fill="' + p.line + '" opacity=".55" font-family="Georgia,serif">z</text>' +
        '<text x="162" y="38" font-size="11" fill="' + p.line + '" opacity=".45" font-family="Georgia,serif">z</text>';
    } else {
      mouth = '<path d="M100 116 L100 121" stroke="' + p.line + '" stroke-width="2.2" stroke-linecap="round"/>' +
        '<path d="M100 121 q-6 7 -12 2" fill="none" stroke="' + p.line + '" stroke-width="2.2" stroke-linecap="round"/>' +
        '<path d="M100 121 q6 7 12 2" fill="none" stroke="' + p.line + '" stroke-width="2.2" stroke-linecap="round"/>';
    }

    if (mood === 'love') {
      extra += blush(64, 116, 10) + blush(136, 116, 10) +
        '<path d="M152 70 c3 -5 10 -3 9 2 c-1 5 -9 9 -9 9 s-8 -4 -9 -9 c-1 -5 6 -7 9 -2 z" fill="' + ACC + '" opacity=".55"/>';
    }
    if (mood === 'happy') extra += blush(64, 116, 9) + blush(136, 116, 9);

    var whisk = '';
    [[-1, 0], [-1, 1], [-1, 2], [1, 0], [1, 1], [1, 2]].forEach(function (w) {
      var x0 = 100 + w[0] * 34, x1 = 100 + w[0] * (62 + w[1] * 2);
      var y0 = 112 + w[1] * 7, y1 = 108 + w[1] * 9;
      whisk += '<path d="M' + esc(x0) + ' ' + esc(y0) + ' L' + esc(x1) + ' ' + esc(y1) + '" stroke="' + p.line + '" stroke-width="1.4" opacity="' + (p.dark ? '.4' : '.55') + '" stroke-linecap="round"/>';
    });

    var cheeks = '';

    return '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="face-svg" role="img" aria-label="它">' +
      '<g transform="rotate(' + (o.tilt != null ? o.tilt : -1.5) + ' 100 104)">' +
      catEars(p) +
      cheeks +
      headShape(t, p, 'cat') +
      catMark(p) +
      '<path d="M84 58 q4 -8 0 -14 M100 54 q4 -9 0 -15 M116 58 q4 -8 0 -14" fill="none" stroke="' + p.furD + '" stroke-width="3" stroke-linecap="round" opacity=".8"/>' +
      eyes +
      '<path d="M94 110 L106 110 L100 117 Z" fill="' + ACC + '" opacity=".9"/>' +
      mouth + whisk + extra +
      '</g></svg>';
  }

  /* ---------------- 狗脸 ---------------- */

  function dogFace(mood, o) {
    o = o || {};
    var p = pal(o.breed);
    var t = DOG_TRAITS[p.id] || { ears: 'flop', head: 'broad', muzzle: 'cream' };
    var kind = eyeKind(mood);
    var eyes = eye(78, 96, kind, 'dog', 1.05, p.eye) + eye(122, 96, kind, 'dog', 1.05, p.eye);
    var extra = '';
    var mouth;

    if (mood === 'happy' || mood === 'love' || mood === 'excited') {
      mouth = '<path d="M86 130 q14 17 28 0" fill="' + ACC + '" opacity=".2" stroke="' + p.line + '" stroke-width="2.2" stroke-linejoin="round"/>' +
        '<path d="M92 137 q8 13 16 0" fill="' + ACC + '" opacity=".7"/>';
    } else if (mood === 'proud') {
      mouth = '<path d="M84 130 q16 8 32 -2" fill="none" stroke="' + p.line + '" stroke-width="2.2" stroke-linecap="round"/>';
    } else if (mood === 'sick') {
      mouth = '<path d="M86 132 q7 -5 14 0 q7 5 14 0" fill="none" stroke="' + p.line + '" stroke-width="2.2" stroke-linecap="round"/>';
      extra = '<path d="M150 62 q7 9 0 13 q-7 -4 0 -13 z" fill="#9DB0C6" opacity=".85"/>';
    } else if (mood === 'sleepy') {
      mouth = '<ellipse cx="100" cy="133" rx="5" ry="4" fill="none" stroke="' + p.line + '" stroke-width="2"/>';
      extra = '<text x="150" y="52" font-size="15" fill="' + p.line + '" opacity=".5" font-family="Georgia,serif">z</text>' +
        '<text x="162" y="38" font-size="11" fill="' + p.line + '" opacity=".4" font-family="Georgia,serif">z</text>';
    } else if (t.smile) {
      /* 萨摩耶那种「在笑」的嘴 */
      mouth = '<path d="M100 132 q-10 8 -17 1" fill="none" stroke="' + p.line + '" stroke-width="2.4" stroke-linecap="round"/>' +
        '<path d="M100 132 q10 8 17 1" fill="none" stroke="' + p.line + '" stroke-width="2.4" stroke-linecap="round"/>' +
        '<path d="M86 126 q14 12 28 0" fill="none" stroke="' + p.line + '" stroke-width="1.6" stroke-linecap="round" opacity=".5"/>';
    } else {
      mouth = '<path d="M100 134 q-9 6 -14 0" fill="none" stroke="' + p.line + '" stroke-width="2.2" stroke-linecap="round"/>' +
        '<path d="M100 134 q9 6 14 0" fill="none" stroke="' + p.line + '" stroke-width="2.2" stroke-linecap="round"/>';
    }
    if (mood === 'love') extra += blush(62, 114, 10) + blush(138, 114, 10);
    if (mood === 'happy') extra += blush(62, 114, 9) + blush(138, 114, 9);

    var cheeks = t.cheeks
      ? '<ellipse cx="60" cy="120" rx="15" ry="13" fill="' + CREAM + '" opacity=".95"/>' +
        '<ellipse cx="140" cy="120" rx="15" ry="13" fill="' + CREAM + '" opacity=".95"/>'
      : '';
    var bib = '';
    if (t.chest) {
      /* 下巴下面露出来的几撮毛：画在头后面，只留外缘，像一圈毛边 */
      bib = '<circle cx="74" cy="146" r="16" fill="' + p.fur + '" stroke="' + INK + '" stroke-width="2.4"/>' +
        '<circle cx="100" cy="152" r="17" fill="' + p.fur + '" stroke="' + INK + '" stroke-width="2.4"/>' +
        '<circle cx="126" cy="146" r="16" fill="' + p.fur + '" stroke="' + INK + '" stroke-width="2.4"/>';
    }

    return '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="face-svg" role="img" aria-label="它">' +
      '<g transform="rotate(' + (o.tilt != null ? o.tilt : -1.5) + ' 100 104)">' +
      (t.fluffEars ? fluffyEars(p) : dogEars(t, p)) +
      bib +
      headShape(t, p, 'dog') +
      dogMark(t, p) +
      cheeks +
      dogMuzzle(t, p, '') +
      eyes +
      mouth + extra +
      '</g></svg>';
  }

  function face(species, mood, o) {
    return (species === 'dog' ? dogFace : catFace)(mood || 'calm', o || {});
  }

  function paw(size, color) {
    size = size || 24;
    color = color || INK;
    return '<svg viewBox="0 0 64 64" width="' + size + '" height="' + size + '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<g fill="' + color + '">' +
      '<ellipse cx="32" cy="42" rx="13" ry="11"/>' +
      '<ellipse cx="15" cy="27" rx="6" ry="7.5"/>' +
      '<ellipse cx="26" cy="18" rx="6" ry="8"/>' +
      '<ellipse cx="38" cy="18" rx="6" ry="8"/>' +
      '<ellipse cx="49" cy="27" rx="6" ry="7.5"/>' +
      '</g></svg>';
  }

  PT.ART = { face: face, paw: paw, INK: INK, FUR: FUR, ACC: ACC };
})();
