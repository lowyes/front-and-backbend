const { BASE_URL } = require('../config/env');

function getModels() {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}/api/models`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          reject(new Error(`请求失败，状态码: ${res.statusCode}`));
        }
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
}

function getHealth() {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}/api/health`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          reject(new Error(`请求失败，状态码: ${res.statusCode}`));
        }
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
}

module.exports = {
  getModels,
  getHealth,
};