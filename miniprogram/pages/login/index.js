const { loginWithWeChat } = require("../../utils/auth");

Page({
  data: {
    loading: false,
    error: "",
  },

  async handleLogin() {
    this.setData({ loading: true, error: "" });
    try {
      await loginWithWeChat();
      wx.switchTab({ url: "/pages/todos/index" });
    } catch (error) {
      this.setData({ error: error.message || "登录失败" });
    } finally {
      this.setData({ loading: false });
    }
  },
});
