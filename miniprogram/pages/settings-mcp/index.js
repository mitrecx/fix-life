const settings = require("../../utils/services/settings");

Page({
  data: {
    loading: true,
    keys: [],
    creating: false,
    newKeyName: "小程序",
  },

  onShow() {
    this.loadKeys();
  },

  async loadKeys() {
    this.setData({ loading: true });
    try {
      const keys = await settings.listMcpKeys();
      this.setData({ keys });
    } catch (error) {
      wx.showToast({ title: error.message || "加载失败", icon: "none" });
    } finally {
      this.setData({ loading: false });
    }
  },

  async handleCreate() {
    this.setData({ creating: true });
    try {
      const res = await settings.createMcpKey(this.data.newKeyName);
      wx.setClipboardData({
        data: res.api_key || res.key || "",
        success: () => wx.showToast({ title: "Key 已复制", icon: "success" }),
      });
      await this.loadKeys();
    } catch (error) {
      wx.showToast({ title: error.message || "创建失败", icon: "none" });
    } finally {
      this.setData({ creating: false });
    }
  },

  async handleRevoke(e) {
    const id = e.currentTarget.dataset.id;
    const res = await wx.showModal({ title: "吊销 Key", content: "确定吊销此 API Key？" });
    if (!res.confirm) return;
    try {
      await settings.revokeMcpKey(id);
      await this.loadKeys();
    } catch (error) {
      wx.showToast({ title: error.message || "操作失败", icon: "none" });
    }
  },
});
