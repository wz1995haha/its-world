/* app.js — 小程序入口
 *
 * 云开发是「能开就开」：
 * 没填环境 ID 就安静地跳过，本地的记录功能完全不依赖它。
 * 填法：把下面的 ENV_ID 换成自己的云开发环境 ID（形如 itsworld-3gxxxxx）。
 */
var PT = require('./utils/all.js');

var ENV_ID = ''; /* ← 在这里填你的环境 ID */

App({
  globalData: {
    openid: '',
    cloudReady: false,
    envId: ENV_ID
  },

  onLaunch: function () {
    var self = this;
    if (!wx.cloud) {
      console.warn('[mp] 基础库太低，没有 wx.cloud');
      return;
    }
    if (!this.globalData.envId) {
      console.info('[mp] 没填云开发环境 ID，先用本地存储（填了就会自动登录并同步）');
      return;
    }
    try {
      wx.cloud.init({ env: this.globalData.envId, traceUser: true });
      this.globalData.cloudReady = true;
      wx.cloud.callFunction({ name: 'login' })
        .then(function (r) {
          self.globalData.openid = (r && r.result && r.result.openid) || '';
          console.info('[mp] openid =', self.globalData.openid);
        })
        .catch(function (e) {
          console.warn('[mp] login 云函数调用失败：', e && e.errMsg);
        });
    } catch (e) {
      console.warn('[mp] 云开发初始化失败：', e && e.message);
    }
  }
});
