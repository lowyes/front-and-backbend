const storage = require('../../utils/storage');
const { createScopedThreejs } = require('../../lib/threejs-miniprogram');

Page({
  data: {
    model: null,
    hasError: false,
    errorMessage: '',
    isLoading: true,
  },

  onLoad() {
    this.loadModel();
  },

  onReady() {
    this.init3D();
  },

  onUnload() {
    this.dispose3D();
  },

  loadModel() {
    const model = storage.get('current_model');
    if (!model) {
      this.setData({
        model: null,
        hasError: true,
        errorMessage: '未找到模型数据',
        isLoading: false,
      });
      return;
    }

    if (!model.gltf_url) {
      this.setData({
        model,
        hasError: true,
        errorMessage: '该模型没有可用的3D文件',
        isLoading: false,
      });
      return;
    }

    this.setData({
      model,
      hasError: false,
      errorMessage: '',
      isLoading: true,
    });
  },

  init3D() {
    if (this.data.hasError) return;

    wx.createSelectorQuery()
      .select('#modelCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        try {
          const canvasInfo = res && res[0];
          if (!canvasInfo || !canvasInfo.node) {
            throw new Error('未找到 WebGL canvas 节点');
          }

          const canvas = canvasInfo.node;
          const dpr = wx.getSystemInfoSync().pixelRatio || 1;
          const width = canvasInfo.width || 300;
          const height = canvasInfo.height || 250;

          this.canvas = canvas;
          canvas.width = width * dpr;
          canvas.height = height * dpr;

          this.THREE = createScopedThreejs(canvas);
          this.setupScene(canvas.width, canvas.height);
          this.loadGLTFModel();
        } catch (error) {
          console.error('3D初始化失败:', error);
          this.setData({
            hasError: true,
            errorMessage: `3D初始化失败：${error.message || error}`,
            isLoading: false,
          });
        }
      });
  },

  setupScene(width, height) {
    const THREE = this.THREE;

    this.scene = new THREE.Scene();
    this.scene.background = 0x1a1a2e;

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, 5);

    this.renderer = new THREE.WebGLRenderer(this.canvas);
    this.renderer.setSize(width, height);
    this.renderer.setClearColor(0x1a1a2e);

    this.modelGroup = new THREE.Object3D();
    this.scene.add(this.modelGroup);

    this.animationId = this.requestFrame(() => this.animate());
  },

  loadGLTFModel() {
    const model = this.data.model;
    if (!model || !model.gltf_url) {
      this.createPlaceholderModel();
      this.setData({ isLoading: false });
      return;
    }

    wx.request({
      url: model.gltf_url,
      method: 'GET',
      dataType: 'json',
      success: (res) => {
        const gltf = typeof res.data === 'string' ? this.safeParseJson(res.data) : res.data;

        if (!gltf) {
          console.warn('GLTF不是有效JSON，使用占位模型');
        } else if (gltf.extensionsRequired && gltf.extensionsRequired.indexOf('KHR_draco_mesh_compression') !== -1) {
          console.warn('当前glTF使用Draco压缩，小程序端暂未集成Draco解码器，使用占位模型');
        }

        this.createPlaceholderModel();
        this.setData({ isLoading: false });
      },
      fail: (error) => {
        console.error('加载GLTF失败:', error);
        this.createPlaceholderModel();
        this.setData({ isLoading: false });
      },
    });
  },

  safeParseJson(text) {
    try {
      return JSON.parse(text);
    } catch (error) {
      return null;
    }
  },

  createPlaceholderModel() {
    if (!this.THREE || !this.modelGroup) return;

    const THREE = this.THREE;
    this.modelGroup.children = [];

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 1.0, 0.5),
      new THREE.Material(0x4a90d9)
    );
    this.modelGroup.add(body);

    const left = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 16, 16),
      new THREE.Material(0x93c5fd)
    );
    left.position.set(-1.2, 0, 0);
    this.modelGroup.add(left);

    const right = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 16, 16),
      new THREE.Material(0x93c5fd)
    );
    right.position.set(1.2, 0, 0);
    this.modelGroup.add(right);
  },

  animate() {
    if (this.modelGroup && this.renderer && this.scene && this.camera) {
      this.modelGroup.rotation.y += 0.01;
      this.renderer.render(this.scene, this.camera);
    }
    this.animationId = this.requestFrame(() => this.animate());
  },

  requestFrame(callback) {
    if (this.canvas && this.canvas.requestAnimationFrame) {
      return this.canvas.requestAnimationFrame(callback);
    }
    return setTimeout(callback, 16);
  },

  cancelFrame(frameId) {
    if (!frameId) return;
    if (this.canvas && this.canvas.cancelAnimationFrame) {
      this.canvas.cancelAnimationFrame(frameId);
      return;
    }
    clearTimeout(frameId);
  },

  dispose3D() {
    this.cancelFrame(this.animationId);
    this.animationId = null;

    if (this.renderer) {
      this.renderer.dispose();
    }

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.modelGroup = null;
    this.THREE = null;
    this.canvas = null;
  },

  goBack() {
    this.dispose3D();
    if (getCurrentPages().length > 1) {
      wx.navigateBack();
      return;
    }
    wx.redirectTo({
      url: '/pages/home/home',
    });
  },

  resetView() {
    if (this.camera) {
      this.camera.position.set(0, 0, 5);
    }
  },

  zoomIn() {
    if (this.camera) {
      this.camera.position.z = Math.max(this.camera.position.z - 0.5, 1);
    }
  },

  zoomOut() {
    if (this.camera) {
      this.camera.position.z = Math.min(this.camera.position.z + 0.5, 20);
    }
  },
});
