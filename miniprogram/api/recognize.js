const { BASE_URL } = require('../config/env');

function recognizeImage(filePath) {
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${BASE_URL}/api/recognize`,
      filePath: filePath,
      name: 'file',
      timeout: 120000,
      success: (res) => {
        try {
          const data = JSON.parse(res.data);
          resolve(data);
        } catch (e) {
          reject(new Error('JSON解析失败'));
        }
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
}

module.exports = {
  recognizeImage,
};