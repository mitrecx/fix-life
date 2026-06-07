const system = require("../../utils/services/system");

Page({
  data: {
    loading: true,
    items: [],
  },

  onShow() {
    this.loadBans();
  },

  async loadBans() {
    this.setData({ loading: true });
    try {
      const res = await system.listIpBans();
      this.setData({ items: res.items || [] });
    } catch (error) {
      wx.showToast({ title: error.message || "加载失败", icon: "none" });
    } finally {
      this.setData({ loading: false });
    }
  },

  async handleUnban(e) {
    const ip = e.currentTarget.dataset.ip;
    const scope = e.currentTarget.dataset.scope;
    const res = await wx.showModal({ title: "解封 IP", content: `确定解封 ${ip}？` });
    if (!res.confirm) return;
    try {
      await system.unbanIp(ip, scope);
      wx.showToast({ title: "已解封", icon: "success" });
      await this.loadBans();
    } catch (error) {
      wx.showToast({ title: error.message || "操作失败", icon: "none" });
    }
  },
});
