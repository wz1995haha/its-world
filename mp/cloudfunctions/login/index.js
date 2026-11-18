// cloudfunctions/login/index.js
// 最小登录云函数：把微信给的 openid 原样返回。
// 小程序里 wx.cloud.callFunction({ name: 'login' }) 就能拿到。
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async () => {
  const ctx = cloud.getWXContext();
  return {
    openid: ctx.OPENID,
    appid: ctx.APPID,
    unionid: ctx.UNIONID || ''
  };
};
