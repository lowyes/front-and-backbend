const mockMatchedResult = {
  success: true,
  matched: true,
  top1: {
    model_id: 'part_0001',
    name: '带圆柱凸台支座零件',
    final_score: 0.78,
    vlm_score: 0.668,
    pair_judge_score: 0.855,
    decision: 'match',
    reason: '结构匹配通过',
    gltf_url: 'http://127.0.0.1:8000/static/models/part_0001/test2.gltf',
    bin_file: 'http://127.0.0.1:8000/static/models/part_0001/data.bin'
  },
  candidates: [],
  query_signature: {
    drawing_type: 'three_view_mechanical_drawing',
    top_view: {
      hole_layout: 'single_center_concentric_hole',
      side_feature_type: 'open_semicircle_slots'
    }
  }
};

const mockCandidateResult = {
  success: true,
  matched: false,
  top1: null,
  candidates: [
    {
      model_id: 'part_0001',
      name: '带圆柱凸台支座零件',
      final_score: 0.45,
      vlm_score: 0.52,
      pair_judge_score: 0.41,
      reason: '特征匹配度较低'
    },
    {
      model_id: 'part_0002',
      name: '倒角孔板零件',
      final_score: 0.38,
      vlm_score: 0.45,
      pair_judge_score: 0.35,
      reason: '部分结构相似'
    }
  ],
  query_signature: {
    drawing_type: 'incomplete_drawing',
    top_view: {
      hole_layout: 'multiple_holes',
      side_feature_type: 'unknown'
    }
  }
};

const mockNoMatchResult = {
  success: true,
  matched: false,
  top1: null,
  candidates: [],
  query_signature: {
    drawing_type: 'non_mechanical',
    top_view: null
  },
  message: '未匹配到模型'
};

function generateMockResult(type = 'matched') {
  switch (type) {
    case 'matched':
      return mockMatchedResult;
    case 'candidate':
      return mockCandidateResult;
    case 'no_match':
      return mockNoMatchResult;
    default:
      const rand = Math.random();
      if (rand < 0.6) return mockMatchedResult;
      if (rand < 0.85) return mockCandidateResult;
      return mockNoMatchResult;
  }
}

module.exports = {
  mockMatchedResult,
  mockCandidateResult,
  mockNoMatchResult,
  generateMockResult,
};