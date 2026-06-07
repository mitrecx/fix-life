const weeklySummary = require("../../utils/services/weeklySummary");

Page({
  data: {
    summaryId: "",
    summary: null,
    loading: true,
    editText: "",
    saving: false,
  },

  onLoad(options) {
    this.setData({ summaryId: options.id || "" });
    this.loadSummary();
  },

  async loadSummary() {
    if (!this.data.summaryId) return;
    this.setData({ loading: true });
    try {
      const summary = await weeklySummary.getById(this.data.summaryId);
      this.setData({
        summary,
        editText: summary.summary_text || "",
      });
    } catch (error) {
      wx.showToast({ title: error.message || "加载失败", icon: "none" });
    } finally {
      this.setData({ loading: false });
    }
  },

  onTextInput(e) {
    this.setData({ editText: e.detail.value });
  },

  async handleSave() {
    const summary_text = this.data.editText.trim();
    if (!summary_text) {
      wx.showToast({ title: "内容不能为空", icon: "none" });
      return;
    }
    this.setData({ saving: true });
    try {
      await weeklySummary.update(this.data.summaryId, { summary_text });
      wx.showToast({ title: "已保存", icon: "success" });
      await this.loadSummary();
    } catch (error) {
      wx.showToast({ title: error.message || "保存失败", icon: "none" });
    } finally {
      this.setData({ saving: false });
    }
  },

  async handleDelete() {
    const res = await wx.showModal({ title: "删除", content: "确定删除此周总结？" });
    if (!res.confirm) return;
    try {
      await weeklySummary.remove(this.data.summaryId);
      wx.navigateBack();
    } catch (error) {
      wx.showToast({ title: error.message || "删除失败", icon: "none" });
    }
  },
});
