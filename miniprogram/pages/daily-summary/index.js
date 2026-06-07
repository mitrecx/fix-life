const dailySummary = require("../../utils/services/dailySummary");

Page({
  data: {
    dayId: "",
    progressDate: "",
    loading: true,
    saving: false,
    summary: null,
    summaryTypes: {},
    typeKeys: [],
    selectedType: "",
    content: "",
  },

  onLoad(options) {
    this.setData({
      dayId: options.dayId || "",
      progressDate: options.date || "",
    });
    this.loadData();
  },

  async loadData() {
    this.setData({ loading: true });
    try {
      const types = await dailySummary.getSummaryTypes();
      const typeKeys = Object.keys(types);
      let summary = null;
      try {
        summary = await dailySummary.getByDayId(this.data.dayId);
      } catch (error) {
        summary = null;
      }
      const typeLabels = typeKeys.map((k) => types[k] || k);
      const selectedType = summary?.summary_type || typeKeys[0] || "";
      this.setData({
        summaryTypes: types,
        typeKeys,
        typeLabels,
        typeIndex: Math.max(0, typeKeys.indexOf(selectedType)),
        summary,
        selectedType,
        content: summary?.content || "",
      });
    } catch (error) {
      wx.showToast({ title: error.message || "加载失败", icon: "none" });
    } finally {
      this.setData({ loading: false });
    }
  },

  onTypeChange(e) {
    const idx = Number(e.detail.value);
    const key = this.data.typeKeys[idx];
    if (key) this.setData({ selectedType: key, typeIndex: idx });
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value });
  },

  async handleSave() {
    const content = this.data.content.trim();
    if (!content) {
      wx.showToast({ title: "请填写总结内容", icon: "none" });
      return;
    }
    this.setData({ saving: true });
    try {
      if (this.data.summary) {
        await dailySummary.update(this.data.summary.id, {
          summary_type: this.data.selectedType,
          content,
        });
      } else {
        await dailySummary.create(this.data.dayId, {
          summary_type: this.data.selectedType,
          content,
        });
      }
      wx.showToast({ title: "已保存", icon: "success" });
      await this.loadData();
    } catch (error) {
      wx.showToast({ title: error.message || "保存失败", icon: "none" });
    } finally {
      this.setData({ saving: false });
    }
  },

  async handleDelete() {
    if (!this.data.summary) return;
    const res = await wx.showModal({ title: "删除总结", content: "确定删除此日总结？" });
    if (!res.confirm) return;
    try {
      await dailySummary.remove(this.data.summary.id);
      this.setData({ summary: null, content: "" });
      wx.showToast({ title: "已删除", icon: "success" });
    } catch (error) {
      wx.showToast({ title: error.message || "删除失败", icon: "none" });
    }
  },
});
