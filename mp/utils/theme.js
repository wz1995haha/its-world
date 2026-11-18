/* theme.js — 主题：换一层纸的颜色，字和卡片都跟着走 */
(function () {
  'use strict';
  var PT = require('./pt-core.js');

  var THEMES = [
    {
      id: 'paper', label: '纸墨', hint: '原来那层暖白',
      vars: {
        '--paper': '#F5EEE3', '--paper-2': '#FBF6EC', '--paper-3': '#FFFDF8', '--paper-4': '#E7DCCB',
        '--wash': '#FDF1EA', '--wash-2': '#FBEDE6',
        '--ink': '#3A322C', '--ink-soft': '#5C5148', '--muted': '#8C8074',
        '--line': 'rgba(58, 50, 44, .12)', '--line-soft': 'rgba(58, 50, 44, .07)',
        '--accent': '#C2613F', '--accent-rgb': '194, 97, 63', '--sh': '58, 50, 44',
        '--sage': '#7E8F6E',
        '--bg': '#E9DFCE', '--bg-glow': '#FBF6EC', '--bg-2': '#E2D5BF'
      }
    },
    {
      id: 'night', label: '夜灯', hint: '关灯以后写',
      vars: {
        '--paper': '#262320', '--paper-2': '#2E2A26', '--paper-3': '#35302B', '--paper-4': '#3B3530',
        '--wash': '#3A3128', '--wash-2': '#332C24',
        '--ink': '#F0E7D9', '--ink-soft': '#D8CBB8', '--muted': '#A2958A',
        '--line': 'rgba(240, 231, 217, .14)', '--line-soft': 'rgba(240, 231, 217, .08)',
        '--accent': '#E0895C', '--accent-rgb': '224, 137, 92', '--sh': '0, 0, 0',
        '--sage': '#9FB38C',
        '--bg': '#1B1917', '--bg-glow': '#2B2622', '--bg-2': '#141312'
      }
    },
    {
      id: 'mint', label: '薄荷', hint: '早上，凉的',
      vars: {
        '--paper': '#EDF2EA', '--paper-2': '#F5F9F2', '--paper-3': '#FBFDF9', '--paper-4': '#DCE5D6',
        '--wash': '#E6F2E8', '--wash-2': '#E0EEE3',
        '--ink': '#2E3730', '--ink-soft': '#4F5B50', '--muted': '#7C887C',
        '--line': 'rgba(46, 55, 48, .14)', '--line-soft': 'rgba(46, 55, 48, .07)',
        '--accent': '#4E7A5C', '--accent-rgb': '78, 122, 92', '--sh': '46, 55, 48',
        '--sage': '#6E8F72',
        '--bg': '#DEE7DA', '--bg-glow': '#F5F9F2', '--bg-2': '#CFDBC9'
      }
    },
    {
      id: 'sakura', label: '樱野', hint: '软一点的粉',
      vars: {
        '--paper': '#FAF0EE', '--paper-2': '#FEF8F6', '--paper-3': '#FFFCFB', '--paper-4': '#EFDCD9',
        '--wash': '#FBE7E4', '--wash-2': '#FADFDB',
        '--ink': '#3E2D2B', '--ink-soft': '#5F4A47', '--muted': '#8F7A77',
        '--line': 'rgba(62, 45, 43, .13)', '--line-soft': 'rgba(62, 45, 43, .07)',
        '--accent': '#C2596B', '--accent-rgb': '194, 89, 107', '--sh': '62, 45, 43',
        '--sage': '#8B9A76',
        '--bg': '#F0DDDA', '--bg-glow': '#FEF8F6', '--bg-2': '#E7CFCB'
      }
    },
    {
      id: 'sepia', label: '旧照', hint: '牛皮纸',
      vars: {
        '--paper': '#EFE4CA', '--paper-2': '#F7EFDC', '--paper-3': '#FDF8EC', '--paper-4': '#DDCEA9',
        '--wash': '#F6E7CE', '--wash-2': '#F2E2C6',
        '--ink': '#463725', '--ink-soft': '#5F4E38', '--muted': '#8B7A60',
        '--line': 'rgba(70, 55, 37, .15)', '--line-soft': 'rgba(70, 55, 37, .08)',
        '--accent': '#A25E2C', '--accent-rgb': '162, 94, 44', '--sh': '70, 55, 37',
        '--sage': '#7C8A5E',
        '--bg': '#E0D2AF', '--bg-glow': '#F7EFDC', '--bg-2': '#CFBE96'
      }
    }
  ];

  function themeById(id) {
    return THEMES.filter(function (t) { return t.id === id; })[0] || THEMES[0];
  }

  function apply(id) {
    var t = themeById(id);
    var root = document.documentElement;
    Object.keys(t.vars).forEach(function (k) { root.style.setProperty(k, t.vars[k]); });
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t.vars['--paper']);
    return t;
  }

  PT.THEMES = THEMES;
  PT.themeById = themeById;
  PT.applyTheme = apply;
})();

module.exports = require('./pt-core.js');
