const ENV = "prod";

const API_BASE = {
  dev: "http://localhost:8020/api/v1",
  prod: "https://fixlife.mitrecx.top/api/v1",
};

module.exports = {
  apiBaseUrl: API_BASE[ENV] || API_BASE.prod,
};
