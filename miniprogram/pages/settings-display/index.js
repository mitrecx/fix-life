const settings = require("../../utils/services/settings");

Page({
  data: {
    loading: true,
    saving: false,
    showDailySummary: false,
  },

  onShow() {
    this.loadSettings();
  },

  async loadSettings() {
    this.setData({ loading: true });
    try {
      const data = await settings.getSettings();
      this.setData({ showDailySummary: !!data.show_daily_summary });
    } catch (error) {
      wx.showToast({ title: error.message || "加载失败", icon: "none" });
    } finally {
      this.setData({ loading: false });
    }
  },

  async onToggle(e) {
    const showDailySummary = e.detail.value;
    this.setData({ saving: true, showDailySummary });
    try {
      await settings.updateSettings({ show_daily_summary: showDailySummary });
      wx.showToast({ title: "已保存", icon: "success" });
    } catch (error) {
      wx.showToast({ title: error.message || "保存失败", icon: "none" });
      await this.loadSettings();
    } finally {
      this.setData({ saving: false });
    }
  },
});
