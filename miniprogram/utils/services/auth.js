const { request, setToken } = require("../request");

function bindWithCode(bindCode) {
  return new Promise((resolve, reject) => {
    wx.login({
      success(loginRes) {
        if (!loginRes.code) {
          reject(new Error("微信登录失败"));
          return;
        }
        request({
          url: "/auth/wechat-bind",
          method: "POST",
          data: {
            code: bindCode.trim(),
            wx_code: loginRes.code,
          },
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

module.exports = { bindWithCode };
