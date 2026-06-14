const mockModels = [
  {
    model_id: 'part_0001',
    name: '带圆柱凸台支座零件',
    category: '支座类',
    ref_image: '/static/images/part_0001.png',
    model_format: 'gltf',
    gltf_url: 'http://127.0.0.1:8000/static/models/part_0001/test2.gltf',
    bin_file: 'http://127.0.0.1:8000/static/models/part_0001/data.bin',
    description: '带圆孔凸台底座，常用于机械支撑结构',
  },
  {
    model_id: 'part_0002',
    name: '倒角孔板零件',
    category: '板类',
    ref_image: '/static/images/part_0002.png',
    model_format: 'gltf',
    gltf_url: 'http://127.0.0.1:8000/static/models/part_0002/model.gltf',
    bin_file: 'http://127.0.0.1:8000/static/models/part_0002/data.bin',
    description: '带倒角孔的板类零件，用于连接固定',
  },
  {
    model_id: 'part_0003',
    name: '支承座零件',
    category: '支座类',
    ref_image: '/static/images/part_0003.png',
    model_format: 'gltf',
    gltf_url: 'http://127.0.0.1:8000/static/models/part_0003/model.gltf',
    bin_file: 'http://127.0.0.1:8000/static/models/part_0003/data.bin',
    description: '用于支撑旋转轴的支承座',
  },
  {
    model_id: 'part_0004',
    name: '法兰盘零件',
    category: '连接类',
    ref_image: '/static/images/part_0004.png',
    model_format: 'gltf',
    gltf_url: null,
    bin_file: null,
    description: '用于管道连接的法兰盘',
  },
];

function getMockModels() {
  return {
    success: true,
    count: mockModels.length,
    models: mockModels,
  };
}

function getMockModelById(modelId) {
  const model = mockModels.find(m => m.model_id === modelId);
  return model ? { success: true, model } : { success: false, message: '模型未找到' };
}

module.exports = {
  mockModels,
  getMockModels,
  getMockModelById,
};