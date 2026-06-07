const { getToken } = require("./utils/request");

App({
  onLaunch() {
    if (!getToken()) {
      wx.reLaunch({ url: "/pages/login/index" });
    }
  },
});
