const dailyProgress = require("../../utils/services/dailyProgress");
const { TASK_CONTEXT, TASK_PRIORITY, ENTRY_STATUS } = require("../../utils/constants");
const { decorateEntry } = require("../../utils/format");

Page({
  data: {
    entryId: "",
    dayId: "",
    entry: null,
    loading: true,
    saving: false,
    editTitle: "",
    editDescription: "",
    editContext: "learning",
    editPriority: "medium",
    editStatus: "todo",
    editEstimated: "",
    editActual: "",
    contexts: TASK_CONTEXT,
    priorities: TASK_PRIORITY,
    statuses: ENTRY_STATUS,
  },

  onLoad(options) {
    this.setData({
      entryId: options.id || "",
      dayId: options.dayId || "",
    });
    this.loadEntry();
  },

  async loadEntry() {
    if (!this.data.entryId) return;
    this.setData({ loading: true });
    try {
      let entry = null;
      if (this.data.dayId) {
        const entries = await dailyProgress.getEntries(this.data.dayId);
        entry = (entries || []).find((e) => e.id === this.data.entryId);
      }
      if (!entry) {
        wx.showToast({ title: "条目未找到", icon: "none" });
        return;
      }
      const decorated = decorateEntry(entry);
      this.setData({
        entry: decorated,
        editTitle: decorated.title,
        editDescription: decorated.description || "",
        editContext: decorated.context,
        editPriority: decorated.priority,
        editStatus: decorated.status,
        editEstimated: decorated.estimated_minutes != null ? String(decorated.estimated_minutes) : "",
        editActual: String(decorated.actual_minutes || 0),
      });
    } catch (error) {
      wx.showToast({ title: error.message || "加载失败", icon: "none" });
    } finally {
      this.setData({ loading: false });
    }
  },

  onTitleInput(e) {
    this.setData({ editTitle: e.detail.value });
  },

  onDescInput(e) {
    this.setData({ editDescription: e.detail.value });
  },

  onContextChange(e) {
    this.setData({ editContext: e.currentTarget.dataset.value });
  },

  onPriorityChange(e) {
    this.setData({ editPriority: e.currentTarget.dataset.value });
  },

  onStatusChange(e) {
    this.setData({ editStatus: e.currentTarget.dataset.value });
  },

  onEstimatedInput(e) {
    this.setData({ editEstimated: e.detail.value });
  },

  onActualInput(e) {
    this.setData({ editActual: e.detail.value });
  },

  async handleSave() {
    const title = this.data.editTitle.trim();
    if (!title) {
      wx.showToast({ title: "标题不能为空", icon: "none" });
      return;
    }
    this.setData({ saving: true });
    try {
      await dailyProgress.updateEntry(this.data.entryId, {
        title,
        description: this.data.editDescription.trim() || undefined,
        context: this.data.editContext,
        priority: this.data.editPriority,
        status: this.data.editStatus,
        estimated_minutes: this.data.editEstimated ? Number(this.data.editEstimated) : undefined,
        actual_minutes: Number(this.data.editActual) || 0,
      });
      wx.showToast({ title: "已保存", icon: "success" });
      setTimeout(() => wx.navigateBack(), 400);
    } catch (error) {
      wx.showToast({ title: error.message || "保存失败", icon: "none" });
    } finally {
      this.setData({ saving: false });
    }
  },

  async handleDelete() {
    const res = await wx.showModal({ title: "删除", content: "确定删除此条目？" });
    if (!res.confirm) return;
    try {
      await dailyProgress.removeEntry(this.data.entryId);
      wx.navigateBack();
    } catch (error) {
      wx.showToast({ title: error.message || "删除失败", icon: "none" });
    }
  },
});
