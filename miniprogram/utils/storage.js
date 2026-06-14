const STORAGE_KEYS = {
  LAST_RECOGNITION_RESULT: 'last_recognition_result',
  CURRENT_MODEL: 'current_model',
};

function set(key, value) {
  try {
    wx.setStorageSync(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error('Storage set error:', e);
    return false;
  }
}

function get(key) {
  try {
    const data = wx.getStorageSync(key);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error('Storage get error:', e);
    return null;
  }
}

function remove(key) {
  try {
    wx.removeStorageSync(key);
    return true;
  } catch (e) {
    console.error('Storage remove error:', e);
    return false;
  }
}

function clear() {
  try {
    wx.clearStorageSync();
    return true;
  } catch (e) {
    console.error('Storage clear error:', e);
    return false;
  }
}

module.exports = {
  STORAGE_KEYS,
  set,
  get,
  remove,
  clear,
};