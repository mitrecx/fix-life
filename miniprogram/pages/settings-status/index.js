const system = require("../../utils/services/system");
const { CHECK_LABELS } = require("../../utils/constants");

Page({
  data: {
    loading: true,
    checks: [],
    allOk: false,
    checkedAt: "",
  },

  onShow() {
    this.loadStatus();
  },

  async loadStatus() {
    this.setData({ loading: true });
    try {
      const res = await system.getStatus();
      const checks = (res.checks || []).map((c) => ({
        ...c,
        label: CHECK_LABELS[c.name] || c.name,
      }));
      this.setData({
        checks,
        allOk: !!res.all_ok,
        checkedAt: res.checked_at || "",
      });
    } catch (error) {
      wx.showToast({ title: error.message || "加载失败", icon: "none" });
    } finally {
      this.setData({ loading: false });
    }
  },
});
