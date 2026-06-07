const { request, setToken } = require("./request");

function loginWithWeChat() {
  return new Promise((resolve, reject) => {
    wx.login({
      success(loginRes) {
        if (!loginRes.code) {
          reject(new Error("微信登录失败"));
          return;
        }
        request({
          url: "/auth/wechat-login",
          method: "POST",
          data: { code: loginRes.code },
        })
          .then((data) => {
            setToken(data.access_token);
            wx.setStorageSync("auth_user", data.user);
            resolve(data);
          })
          .catch(reject);
      },
      fail(error) {
        reject(new Error(error.errMsg || "微信登录失败"));
      },
    });
  });
}

function getStoredUser() {
  try {
    return wx.getStorageSync("auth_user") || null;
  } catch (error) {
    return null;
  }
}

module.exports = {
  loginWithWeChat,
  getStoredUser,
};
