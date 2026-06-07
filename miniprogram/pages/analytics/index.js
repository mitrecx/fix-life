const analytics = require("../../utils/services/analytics");

const now = new Date();

Page({
  data: {
    loading: true,
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    dashboard: null,
    yearly: null,
    monthly: null,
    heatmap: null,
    completionTrend: null,
    tab: "dashboard",
  },

  onShow() {
    this.loadAll();
  },

  onPullDownRefresh() {
    this.loadAll().finally(() => wx.stopPullDownRefresh());
  },

  onTab(e) {
    this.setData({ tab: e.currentTarget.dataset.tab });
  },

  onYearPrev() {
    this.setData({ year: this.data.year - 1 }, () => this.loadAll());
  },

  onYearNext() {
    this.setData({ year: this.data.year + 1 }, () => this.loadAll());
  },

  onMonthChange(e) {
    this.setData({ month: Number(e.detail.value) + 1 }, () => this.loadMonthly());
  },

  async loadAll() {
    this.setData({ loading: true });
    try {
      const [dashboard, yearly, heatmap, completionTrend] = await Promise.all([
        analytics.getDashboard(),
        analytics.getYearly(this.data.year),
        analytics.getHeatmap({ days: 90 }),
        analytics.getCompletionRate("daily", { days: 30 }),
      ]);
      this.setData({ dashboard, yearly, heatmap, completionTrend });
      await this.loadMonthly();
    } catch (error) {
      wx.showToast({ title: error.message || "加载失败", icon: "none" });
    } finally {
      this.setData({ loading: false });
    }
  },

  async loadMonthly() {
    try {
      const monthly = await analytics.getMonthly(this.data.year, this.data.month);
      this.setData({ monthly });
    } catch (error) {
      wx.showToast({ title: error.message || "月度数据加载失败", icon: "none" });
    }
  },
});
