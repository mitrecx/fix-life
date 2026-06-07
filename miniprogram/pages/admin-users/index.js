const admin = require("../../utils/services/admin");

Page({
  data: {
    loading: true,
    users: [],
  },

  onShow() {
    this.loadUsers();
  },

  async loadUsers() {
    this.setData({ loading: true });
    try {
      const res = await admin.listUsers();
      this.setData({ users: res.users || res.items || [] });
    } catch (error) {
      wx.showToast({ title: error.message || "加载失败", icon: "none" });
    } finally {
      this.setData({ loading: false });
    }
  },

  async handleUnlock(e) {
    const id = e.currentTarget.dataset.id;
    try {
      await admin.unlockLogin(id);
      wx.showToast({ title: "已解锁", icon: "success" });
    } catch (error) {
      wx.showToast({ title: error.message || "操作失败", icon: "none" });
    }
  },
});
