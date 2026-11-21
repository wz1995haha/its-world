/* photo.js — 选一张照片并存到本地（重启还在）
 * 优先 chooseMedia（基础库 2.10+），老版本退回 chooseImage。
 */

function pickTemp(cb) {
  if (wx.chooseMedia) {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function (r) {
        var f = (r.tempFiles && r.tempFiles[0]) || null;
        cb(f ? f.tempFilePath : '');
      },
      fail: function () { cb(''); }
    });
    return;
  }
  wx.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: function (r) {
      cb((r.tempFilePaths && r.tempFilePaths[0]) || '');
    },
    fail: function () { cb(''); }
  });
}

/* 存进 USER_DATA_PATH；失败就把临时路径原样返回（本次还能看） */
function persist(tempPath, cb) {
  if (!tempPath) return cb('');
  var fs = wx.getFileSystemManager();
  var dest = wx.env.USER_DATA_PATH + '/avatar_' + Date.now() + '.jpg';
  try {
    fs.saveFile({
      tempFilePath: tempPath,
      filePath: dest,
      success: function (r) { cb(r.savedFilePath); },
      fail: function () { cb(tempPath); }
    });
  } catch (e) {
    cb(tempPath);
  }
}

function pick(cb) {
  pickTemp(function (t) { persist(t, cb); });
}

function drop(path) {
  if (!path || path.indexOf(wx.env.USER_DATA_PATH) !== 0) return;
  try { wx.getFileSystemManager().unlink({ filePath: path }); } catch (e) {}
}

module.exports = { pick: pick, pickTemp: pickTemp, persist: persist, drop: drop };
