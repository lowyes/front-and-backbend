const ENV = 'dev';

const config = {
  dev: {
    BASE_URL: 'http://127.0.0.1:8000'
  },
  lan: {
    BASE_URL: 'http://192.168.1.100:8000'
  },
  prod: {
    BASE_URL: 'https://your-domain.com'
  }
};

module.exports = config[ENV];