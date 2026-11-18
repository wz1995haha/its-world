/* faces.js — 品种头像图（构建时用浏览器版同一套矢量画出来的 PNG）
 * 只有 calm / happy 两种表情出图，其余表情归到这两种，
 * 找不到图（新加品种还没出图）时返回空串，组件会退回拼出来的脸。
 */
var MOOD_MAP = {
  calm: 'calm',
  happy: 'happy',
  proud: 'happy',
  excited: 'happy',
  love: 'happy',
  sick: 'calm',
  sleepy: 'calm'
};

function pathOf(species, breedId, mood) {
  var sp = species === 'dog' ? 'dog' : 'cat';
  var id = breedId || (sp === 'cat' ? 'orange' : 'shiba');
  var m = MOOD_MAP[mood] || 'calm';
  return '/assets/faces/' + sp + '-' + id + '-' + m + '.png';
}

module.exports = { pathOf: pathOf, MOOD_MAP: MOOD_MAP };
