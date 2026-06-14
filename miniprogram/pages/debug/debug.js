const storage = require('../../utils/storage');

Page({
  data: {
    result: null,
    resultJson: '',
    currentModel: null,
    currentModelJson: '',
  },

  onLoad() {
    this.loadData();
  },

  loadData() {
    const result = storage.get('last_recognition_result');
    const currentModel = storage.get('current_model');
    
    this.setData({
      result,
      resultJson: result ? JSON.stringify(result, null, 2) : '{}',
      currentModel,
      currentModelJson: currentModel ? JSON.stringify(currentModel, null, 2) : '{}',
    });
  },

  goBack() {
    wx.navigateBack();
  },

  clearStorage() {
    storage.clear();
    this.setData({
      result: null,
      resultJson: '{}',
      currentModel: null,
      currentModelJson: '{}',
    });
    wx.showToast({
      title: '缓存已清除',
      icon: 'success',
    });
  },
});