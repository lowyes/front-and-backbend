const storage = require('../../utils/storage');
const { formatScore } = require('../../utils/format');

Page({
  data: {
    result: null,
    showDebug: false,
    isCandidate: false,
  },

  onLoad() {
    this.loadResult();
  },

  loadResult() {
    const result = storage.get('last_recognition_result');
    if (result) {
      this.setData({ result });
    } else {
      wx.showToast({
        title: '未找到识别结果',
        icon: 'none',
      });
    }
  },

  goToModelViewer() {
    const { result } = this.data;
    
    if (result.matched && result.top1) {
      storage.set('current_model', result.top1);
      wx.navigateTo({
        url: `/pages/model-native/model-native?model_id=${encodeURIComponent(result.top1.model_id)}`,
      });
    }
  },

  selectCandidate(event) {
    const candidate = event.currentTarget.dataset.candidate;
    if (!candidate) return;

    this.setData({ isCandidate: true });
    storage.set('current_model', candidate);
    wx.navigateTo({
      url: `/pages/model-native/model-native?model_id=${encodeURIComponent(candidate.model_id)}`,
    });
  },

  toggleDebug() {
    this.setData({ showDebug: !this.data.showDebug });
  },

  goBack() {
    wx.navigateBack();
  },

  goToModelList() {
    wx.navigateTo({
      url: '/pages/model-list/model-list',
    });
  },

  formatScore(score) {
    return formatScore(score);
  },
});
