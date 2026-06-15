import {
  $cancelAnimationFrame,
  $requestAnimationFrame,
  $window,
  AmbientLight,
  Box3,
  Color,
  DirectionalLight,
  DoubleSide,
  MeshStandardMaterial,
  PerspectiveCamera,
  PLATFORM,
  Scene,
  sRGBEncoding,
  Vector3,
  WebGL1Renderer,
} from 'three-platformize';
import { WechatPlatform } from 'three-platformize/src/WechatPlatform';
import { GLTF, GLTFLoader } from 'three-platformize/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three-platformize/examples/jsm/controls/OrbitControls';

const storage = require('../../utils/storage');

type ModelInfo = {
  name?: string;
  model_id?: string;
  gltf_url?: string;
  bin_file?: string;
};

type CanvasQueryResult = {
  node: any;
  width: number;
  height: number;
};

Page({
  disposing: false,
  frameId: -1,
  platform: null as WechatPlatform | null,
  renderer: null as WebGL1Renderer | null,
  scene: null as Scene | null,
  camera: null as PerspectiveCamera | null,
  controls: null as OrbitControls | null,
  modelObject: null as any,
  canvas: null as any,

  data: {
    model: null as ModelInfo | null,
    statusText: '准备加载模型...',
    loading: true,
    hasError: false,
    errorMessage: '',
  },

  onLoad(options: Record<string, string>) {
    const storedModel = storage.get('current_model') || {};
    const model: ModelInfo = {
      ...storedModel,
      model_id: options.model_id || storedModel.model_id || 'part_0001',
    };

    if (model.model_id === 'part_0001') {
      model.gltf_url = '/assets/models/part_0001/model_plain.glb';
      model.bin_file = '';
    }

    this.setData({ model });
    storage.set('current_model', model);
  },

  onReady() {
    wx.createSelectorQuery()
      .select('#nativeGl')
      .fields({ node: true, size: true })
      .exec((res: CanvasQueryResult[]) => {
        const result = res && res[0];
        if (!result || !result.node) {
          this.showError('没有找到 WebGL Canvas');
          return;
        }
        this.initCanvas(result.node, result.width, result.height);
      });
  },

  onUnload() {
    this.disposeScene();
  },

  initCanvas(canvas: any, width: number, height: number) {
    try {
      this.disposing = false;
      this.canvas = canvas;
      this.platform = new WechatPlatform(canvas, width, height).patchXHR();
      PLATFORM.set(this.platform);

      const renderer = new WebGL1Renderer({ canvas, antialias: true, alpha: false });
      const scene = new Scene();
      const camera = new PerspectiveCamera(45, width / Math.max(height, 1), 0.001, 1000);
      const controls = new OrbitControls(camera, canvas);

      scene.background = new Color(0x101827);
      scene.add(new AmbientLight(0xffffff, 1.8));

      const directional = new DirectionalLight(0xffffff, 2.2);
      directional.position.set(3, 4, 5);
      scene.add(directional);

      controls.enableDamping = true;
      controls.dampingFactor = 0.08;

      renderer.outputEncoding = sRGBEncoding;
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min($window.devicePixelRatio || 1, 2));

      this.renderer = renderer;
      this.scene = scene;
      this.camera = camera;
      this.controls = controls;

      this.loadModel();
      this.renderLoop();
    } catch (error) {
      console.error('native 3D init failed:', error);
      this.showError('原生3D初始化失败，请查看调试控制台');
    }
  },

  async loadModel() {
    const model = this.data.model;
    if (!model || !model.gltf_url) {
      this.showError('模型地址不存在');
      return;
    }

    this.setData({
      loading: true,
      statusText: '正在读取模型文件...',
      hasError: false,
      errorMessage: '',
    });

    try {
      const loader = new GLTFLoader();
      const gltf = await this.loadGltf(loader, model.gltf_url);
      if (this.disposing) return;

      const object = gltf.scene;
      this.applyDisplayMaterial(object);
      this.scene?.add(object);
      this.modelObject = object;
      this.fitCamera(object);

      this.setData({
        loading: false,
        statusText: '模型加载完成，可拖动旋转、双指缩放',
      });
    } catch (error) {
      console.error('native glTF load failed:', error);
      this.showError('模型加载失败，请确认小程序包内 GLB 文件存在');
    }
  },

  loadGltf(loader: GLTFLoader, url: string): Promise<GLTF> {
    if (/^https?:\/\//i.test(url)) {
      return loader.loadAsync(url) as Promise<GLTF>;
    }

    return this.readLocalModel(url).then((buffer: ArrayBuffer) => {
      return new Promise((resolve, reject) => {
        loader.parse(buffer, '', resolve, reject);
      });
    }) as Promise<GLTF>;
  },

  readLocalModel(url: string): Promise<ArrayBuffer> {
    const fs = wx.getFileSystemManager();
    const normalized = url.replace(/^\/+/, '');
    const candidates = [url, normalized, `/${normalized}`];

    return new Promise((resolve, reject) => {
      const tryRead = (index: number) => {
        if (index >= candidates.length) {
          reject(new Error(`cannot read local model: ${url}`));
          return;
        }

        fs.readFile({
          filePath: candidates[index],
          success: (res: WechatMiniprogram.ReadFileSuccessCallbackResult) => {
            resolve(res.data as ArrayBuffer);
          },
          fail: () => tryRead(index + 1),
        });
      };

      tryRead(0);
    });
  },

  applyDisplayMaterial(object: any) {
    object.traverse((child: any) => {
      if (!child || !child.isMesh) return;
      child.material = new MeshStandardMaterial({
        color: 0x2f8cff,
        roughness: 0.45,
        metalness: 0,
        side: DoubleSide,
      });
    });
  },

  fitCamera(object: any) {
    if (!this.camera || !this.controls) return;

    const box = new Box3().setFromObject(object);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    object.position.sub(center);

    const maxSize = Math.max(size.x, size.y, size.z) || 1;
    const distance = maxSize / (2 * Math.tan((this.camera.fov * Math.PI) / 360));

    this.camera.position.set(distance * 0.9, distance * 0.7, distance * 1.5);
    this.camera.near = Math.max(distance / 100, 0.0001);
    this.camera.far = distance * 100;
    this.camera.updateProjectionMatrix();

    this.controls.target.set(0, 0, 0);
    this.controls.update();
  },

  renderLoop() {
    if (this.disposing) return;

    this.controls?.update();
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }

    this.frameId = $requestAnimationFrame(() => this.renderLoop());
  },

  showError(message: string) {
    this.setData({
      loading: false,
      hasError: true,
      errorMessage: message,
      statusText: message,
    });
  },

  resetView() {
    if (this.modelObject) {
      this.fitCamera(this.modelObject);
    }
  },

  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack();
      return;
    }

    wx.redirectTo({ url: '/pages/home/home' });
  },

  onTX(event: WechatMiniprogram.TouchEvent) {
    if (this.platform) {
      this.platform.dispatchTouchEvent(event);
    }
  },

  disposeScene() {
    this.disposing = true;

    if (this.frameId >= 0) {
      $cancelAnimationFrame(this.frameId);
      this.frameId = -1;
    }

    if (this.modelObject) {
      this.modelObject.traverse((child: any) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((material: any) => material.dispose && material.dispose());
          } else if (child.material.dispose) {
            child.material.dispose();
          }
        }
      });
      this.modelObject = null;
    }

    if (this.controls && this.controls.dispose) {
      this.controls.dispose();
    }

    if (this.renderer && this.renderer.dispose) {
      this.renderer.dispose();
    }

    this.scene = null;
    this.camera = null;
    this.controls = null;
    this.renderer = null;
    this.canvas = null;

    PLATFORM.dispose();
    this.platform = null;
  },
});
