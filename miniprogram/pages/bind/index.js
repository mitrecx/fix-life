const { bindWithCode } = require("../../utils/services/auth");
const { getStoredUser } = require("../../utils/auth");

Page({
  data: {
    bindCode: "",
    loading: false,
    user: null,
    isBound: false,
  },

  onShow() {
    const user = getStoredUser();
    const email = (user && user.email || "").toLowerCase();
    const isBound = user && !email.endsWith("@weixin.fixlife.mitrecx.top");
    this.setData({ user, isBound: !!isBound });
  },

  onCodeInput(e) {
    this.setData({ bindCode: e.detail.value });
  },

  async handleBind() {
    const code = this.data.bindCode.trim();
    if (code.length !== 6) {
      wx.showToast({ title: "请输入 6 位绑定码", icon: "none" });
      return;
    }
    this.setData({ loading: true });
    try {
      const data = await bindWithCode(code);
      this.setData({
        user: data.user,
        isBound: true,
        bindCode: "",
      });
      wx.showToast({ title: "绑定成功", icon: "success" });
      setTimeout(() => wx.switchTab({ url: "/pages/todos/index" }), 800);
    } catch (error) {
      wx.showToast({ title: error.message || "绑定失败", icon: "none" });
    } finally {
      this.setData({ loading: false });
    }
  },
});
