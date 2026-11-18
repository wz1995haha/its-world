/* all.js — 一次把四个模块都装上，页面只 require 这一个
 *
 * 原来浏览器里靠 <script> 的顺序保证 PT 上东西齐全；
 * 小程序没有那个顺序，所以这里显式 require 一遍。
 */
require('./types.js');
require('./writer.js');
require('./theme.js');
require('./store.js');

module.exports = require('./pt-core.js');
