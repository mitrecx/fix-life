const weeklySummary = require("../../utils/services/weeklySummary");

const now = new Date();

Page({
  data: {
    loading: false,
    year: now.getFullYear(),
    summaries: [],
    generating: false,
  },

  onShow() {
    this.loadSummaries();
  },

  onPullDownRefresh() {
    this.loadSummaries().finally(() => wx.stopPullDownRefresh());
  },

  onYearPrev() {
    this.setData({ year: this.data.year - 1 }, () => this.loadSummaries());
  },

  onYearNext() {
    this.setData({ year: this.data.year + 1 }, () => this.loadSummaries());
  },

  async loadSummaries() {
    this.setData({ loading: true });
    try {
      const res = await weeklySummary.list({ year: this.data.year, limit: 50 });
      this.setData({ summaries: res.summaries || res.items || [] });
    } catch (error) {
      wx.showToast({ title: error.message || "加载失败", icon: "none" });
    } finally {
      this.setData({ loading: false });
    }
  },

  openDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/weekly-summary-detail/index?id=${id}` });
  },

  async handleGenerate() {
    this.setData({ generating: true });
    try {
      const summary = await weeklySummary.generate({});
      wx.showToast({ title: "已生成", icon: "success" });
      await this.loadSummaries();
      if (summary && summary.id) {
        wx.navigateTo({ url: `/pages/weekly-summary-detail/index?id=${summary.id}` });
      }
    } catch (error) {
      wx.showToast({ title: error.message || "生成失败", icon: "none" });
    } finally {
      this.setData({ generating: false });
    }
  },
});
