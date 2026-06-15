const storage = require('../../utils/storage');

Page({
  data: {
    model: null,
    hasError: false,
    errorMessage: '',
    isLoading: true,
    loadingText: '加载中...',
    modelScale: 80,
    modelRotation: '0 0 0',
  },

  onLoad() {
    this.loadModel();
  },

  onUnload() {
    this.clearLoadTimer();
  },

  loadModel() {
    const model = this.normalizeModel(storage.get('current_model'));
    if (!model) {
      this.showError('未找到模型数据');
      return;
    }

    if (!model.gltf_url) {
      this.showError('该模型没有可用的3D文件');
      return;
    }

    this.setData({
      model,
      hasError: false,
      errorMessage: '',
      isLoading: true,
      loadingText: '加载中...',
      modelScale: 80,
      modelRotation: '0 0 0',
    });

    this.startLoadTimer();
  },

  normalizeModel(model) {
    if (!model) return model;
    const normalized = { ...model };
    if (normalized.model_id === 'part_0001') {
      if (normalized.gltf_url && normalized.gltf_url.indexOf('/test2.gltf') !== -1) {
        normalized.gltf_url = normalized.gltf_url.replace('/test2.gltf', '/model_plain.glb');
      }
      if (normalized.gltf_url && normalized.gltf_url.indexOf('/model_plain.gltf') !== -1) {
        normalized.gltf_url = normalized.gltf_url.replace('/model_plain.gltf', '/model_plain.glb');
      }
      if (normalized.bin_file && normalized.bin_file.indexOf('/data.bin') !== -1) {
        normalized.bin_file = '';
      }
      if (normalized.bin_file && normalized.bin_file.indexOf('/model_plain.bin') !== -1) {
        normalized.bin_file = '';
      }
    }
    storage.set('current_model', normalized);
    return normalized;
  },

  startLoadTimer() {
    this.clearLoadTimer();
    this.loadTimer = setTimeout(() => {
      if (!this.data.isLoading) return;
      this.setData({
        isLoading: false,
        loadingText: '加载时间较长',
      });
      wx.showToast({
        title: '模型加载较慢，请确认后端已启动',
        icon: 'none',
        duration: 2500,
      });
    }, 12000);
  },

  clearLoadTimer() {
    if (this.loadTimer) {
      clearTimeout(this.loadTimer);
      this.loadTimer = null;
    }
  },

  showError(message) {
    this.clearLoadTimer();
    this.setData({
      model: this.data.model,
      hasError: true,
      errorMessage: message,
      isLoading: false,
    });
  },

  handleSceneReady() {
    this.setData({ loadingText: '场景初始化...' });
  },

  handleAssetsProgress(event) {
    const progress = event && event.detail && event.detail.progress;
    if (typeof progress === 'number') {
      this.setData({ loadingText: `模型加载 ${Math.round(progress * 100)}%` });
    }
  },

  handleAssetsLoaded() {
    this.clearLoadTimer();
    this.setData({
      isLoading: false,
      loadingText: '加载完成',
    });
  },

  handleGltfLoaded() {
    this.clearLoadTimer();
    this.setData({
      isLoading: false,
      loadingText: '加载完成',
    });
  },

  handleAssetsError(event) {
    console.error('xr-frame asset load failed:', event);
    this.showError('模型资源加载失败，请确认后端地址和模型文件可访问');
  },

  handleGltfError(event) {
    console.error('xr-frame glTF load failed:', event);
    this.showError('glTF模型解析失败，请确认已使用非Draco模型');
  },

  goBack() {
    this.clearLoadTimer();
    if (getCurrentPages().length > 1) {
      wx.navigateBack();
      return;
    }

    wx.redirectTo({
      url: '/pages/home/home',
    });
  },

  resetView() {
    this.setData({
      modelScale: 80,
      modelRotation: '0 0 0',
    });
  },

  zoomIn() {
    this.setData({
      modelScale: Math.min(this.data.modelScale + 20, 220),
    });
  },

  zoomOut() {
    this.setData({
      modelScale: Math.max(this.data.modelScale - 20, 10),
    });
  },
});
