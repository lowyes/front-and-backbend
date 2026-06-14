const storage = require('../../utils/storage');

Page({
  data: {
    model: null,
    hasError: false,
    errorMessage: '',
  },

  onLoad() {
    this.loadModel();
  },

  loadModel() {
    const model = storage.get('current_model');
    if (model) {
      if (!model.gltf_url) {
        this.setData({
          model,
          hasError: true,
          errorMessage: '该模型没有可用的3D文件',
        });
      } else {
        this.setData({
          model,
          hasError: false,
          errorMessage: '',
        });
      }
    } else {
      this.setData({
        model: null,
        hasError: true,
        errorMessage: '未找到模型数据',
      });
    }
  },

  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack();
      return;
    }

    wx.redirectTo({
      url: '/pages/home/home',
    });
  },
});
