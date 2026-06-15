const config = require('../../config/env');
const storage = require('../../utils/storage');

Page({
  data: {
    viewerUrl: '',
  },

  onLoad(options) {
    const storedModel = storage.get('current_model') || {};
    const modelId = options.model_id || storedModel.model_id || 'part_0001';
    const viewerUrl = `${config.BASE_URL}/viewer/model/${encodeURIComponent(modelId)}?t=${Date.now()}`;

    this.setData({ viewerUrl });
  },

  handleLoad() {
    console.log('H5 model viewer loaded:', this.data.viewerUrl);
  },

  handleError(event) {
    console.error('H5 model viewer failed:', event);
    wx.showToast({
      title: 'H5查看器加载失败，请检查后端是否启动',
      icon: 'none',
      duration: 2500,
    });
  },
});
