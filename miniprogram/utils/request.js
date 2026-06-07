const { apiBaseUrl } = require("../config");

const TOKEN_KEY = "auth_token";

function getToken() {
  try {
    return wx.getStorageSync(TOKEN_KEY) || "";
  } catch (error) {
    return "";
  }
}

function setToken(token) {
  wx.setStorageSync(TOKEN_KEY, token);
}

function clearToken() {
  wx.removeStorageSync(TOKEN_KEY);
  wx.removeStorageSync("auth_user");
}

function handleAuthError(reject) {
  clearToken();
  wx.reLaunch({ url: "/pages/login/index" });
  reject(new Error("登录已过期，请重新登录"));
}

function extractError(res) {
  const detail = (res.data && res.data.detail) || "请求失败";
  return new Error(typeof detail === "string" ? detail : "请求失败");
}

function requestRaw({ url, method = "GET", data, header = {}, allowStatuses }) {
  return new Promise((resolve, reject) => {
    const token = getToken();
    wx.request({
      url: `${apiBaseUrl}${url}`,
      method,
      data,
      timeout: 30000,
      header: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...header,
      },
      success(res) {
        if (res.statusCode === 401) {
          handleAuthError(reject);
          return;
        }
        if (allowStatuses && allowStatuses.includes(res.statusCode)) {
          resolve({ statusCode: res.statusCode, data: res.data });
          return;
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(extractError(res));
          return;
        }
        resolve({ statusCode: res.statusCode, data: res.data });
      },
      fail(error) {
        reject(new Error(error.errMsg || "网络请求失败"));
      },
    });
  });
}

function request(options) {
  return requestRaw(options).then((res) => res.data);
}

function uploadFile({ url, filePath, name = "file" }) {
  return new Promise((resolve, reject) => {
    const token = getToken();
    wx.uploadFile({
      url: `${apiBaseUrl}${url}`,
      filePath,
      name,
      header: token ? { Authorization: `Bearer ${token}` } : {},
      success(res) {
        if (res.statusCode === 401) {
          handleAuthError(reject);
          return;
        }
        let data = res.data;
        try {
          data = typeof data === "string" ? JSON.parse(data) : data;
        } catch (error) {
          reject(new Error("上传响应解析失败"));
          return;
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(extractError({ data }));
          return;
        }
        resolve(data);
      },
      fail(error) {
        reject(new Error(error.errMsg || "上传失败"));
      },
    });
  });
}

module.exports = {
  request,
  requestRaw,
  uploadFile,
  getToken,
  setToken,
  clearToken,
};
