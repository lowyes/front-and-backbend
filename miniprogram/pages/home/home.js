const { recognizeImage } = require('../../api/recognize');
const { mockMatchedResult } = require('../../mock/recognition');
const storage = require('../../utils/storage');

Page({
  data: {
    isLoading: false,
    useMock: false,
  },

  onLoad() {
    this.checkBackendStatus();
  },

  checkBackendStatus() {
    const { getHealth } = require('../../api/models');
    getHealth().then(() => {
      this.setData({ useMock: false });
    }).catch(() => {
      this.setData({ useMock: true });
      wx.showToast({
        title: '后端未启动，使用mock数据',
        icon: 'none',
        duration: 2000,
      });
    });
  },

  takePhoto() {
    this.chooseImage(['camera']);
  },

  chooseFromAlbum() {
    this.chooseImage(['album']);
  },

  chooseImage(sourceType) {
    if (this.data.isLoading) return;

    wx.chooseImage({
      count: 1,
      sourceType: sourceType,
      success: (res) => {
        const filePath = res.tempFilePaths[0];
        this.recognize(filePath);
      },
      fail: (err) => {
        console.error('选择图片失败:', err);
        wx.showToast({
          title: '选择图片失败',
          icon: 'none',
        });
      }
    });
  },

  async recognize(filePath) {
    this.setData({ isLoading: true });
    wx.showLoading({ title: '识别中...' });

    try {
      let result;
      if (this.data.useMock) {
        result = mockMatchedResult;
      } else {
        result = await recognizeImage(filePath);
      }

      storage.set('last_recognition_result', result);
      wx.hideLoading();
      this.setData({ isLoading: false });

      wx.navigateTo({
        url: '/pages/result/result',
      });
    } catch (err) {
      console.error('识别失败:', err);
      wx.hideLoading();
      this.setData({ isLoading: false });
      wx.showToast({
        title: '识别失败，请重试',
        icon: 'none',
      });
    }
  },

  goToModelList() {
    wx.navigateTo({
      url: '/pages/model-list/model-list',
    });
  },

  goToDebug() {
    wx.navigateTo({
      url: '/pages/debug/debug',
    });
  },
});