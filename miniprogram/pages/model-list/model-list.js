const { getModels } = require('../../api/models');
const { getMockModels } = require('../../mock/models');
const storage = require('../../utils/storage');

Page({
  data: {
    models: [],
    useMock: false,
    isLoading: false,
  },

  onLoad() {
    this.loadModels();
  },

  async loadModels() {
    this.setData({ isLoading: true });
    
    try {
      const result = await getModels();
      if (result.success && result.models) {
        this.setData({
          models: result.models,
          useMock: false,
        });
      } else {
        throw new Error('获取模型列表失败');
      }
    } catch (err) {
      console.error('加载模型失败，使用mock数据:', err);
      const mockResult = getMockModels();
      this.setData({
        models: mockResult.models,
        useMock: true,
      });
      wx.showToast({
        title: '使用mock数据',
        icon: 'none',
      });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  selectModel(model) {
    storage.set('current_model', model);
    wx.navigateTo({
      url: '/pages/model-viewer/model-viewer',
    });
  },

  goBack() {
    wx.navigateBack();
  },

  hasGltf(model) {
    return model.gltf_url && model.gltf_url.length > 0;
  },
});