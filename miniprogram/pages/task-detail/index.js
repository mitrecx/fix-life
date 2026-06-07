const backlog = require("../../utils/services/backlog");
const {
  TASK_CONTEXT,
  TASK_PRIORITY,
  PROGRESS_PRESETS,
} = require("../../utils/constants");
const { decorateTask } = require("../../utils/format");
const { todayString } = require("../../utils/date");

Page({
  data: {
    taskId: "",
    loading: true,
    saving: false,
    task: null,
    occurrences: [],
    contexts: TASK_CONTEXT,
    priorities: TASK_PRIORITY,
    progressPresets: PROGRESS_PRESETS,
    editTitle: "",
    editDescription: "",
    editContext: "learning",
    editPriority: "medium",
    editProgress: 0,
    scheduleDate: todayString(),
  },

  onLoad(options) {
    this.setData({ taskId: options.id || "" });
    this.loadTask();
  },

  async loadTask() {
    if (!this.data.taskId) return;
    this.setData({ loading: true });
    try {
      const detail = await backlog.get(this.data.taskId);
      const task = decorateTask(detail);
      this.setData({
        task,
        occurrences: detail.occurrences || [],
        editTitle: task.title,
        editDescription: task.description || "",
        editContext: task.context,
        editPriority: task.priority,
        editProgress: task.progress || 0,
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

  onProgressChange(e) {
    this.setData({ editProgress: Number(e.currentTarget.dataset.value) });
  },

  onScheduleDateChange(e) {
    this.setData({ scheduleDate: e.detail.value });
  },

  async handleSave() {
    const title = this.data.editTitle.trim();
    if (!title) {
      wx.showToast({ title: "标题不能为空", icon: "none" });
      return;
    }
    this.setData({ saving: true });
    try {
      await backlog.update(this.data.taskId, {
        title,
        description: this.data.editDescription.trim() || undefined,
        context: this.data.editContext,
        priority: this.data.editPriority,
        progress: this.data.editProgress,
        progress_plan_date: todayString(),
      });
      wx.showToast({ title: "已保存", icon: "success" });
      await this.loadTask();
    } catch (error) {
      wx.showToast({ title: error.message || "保存失败", icon: "none" });
    } finally {
      this.setData({ saving: false });
    }
  },

  async handleComplete() {
    try {
      await backlog.complete(this.data.taskId);
      wx.showToast({ title: "已完成", icon: "success" });
      await this.loadTask();
    } catch (error) {
      wx.showToast({ title: error.message || "操作失败", icon: "none" });
    }
  },

  async handleStart() {
    try {
      await backlog.update(this.data.taskId, { status: "in_progress" });
      wx.showToast({ title: "已开始", icon: "success" });
      await this.loadTask();
    } catch (error) {
      wx.showToast({ title: error.message || "操作失败", icon: "none" });
    }
  },

  async handleSchedule() {
    try {
      await backlog.schedule(this.data.taskId, this.data.scheduleDate);
      wx.showToast({ title: "已排期", icon: "success" });
      await this.loadTask();
    } catch (error) {
      wx.showToast({ title: error.message || "排期失败", icon: "none" });
    }
  },

  async handleRevert() {
    const res = await wx.showModal({
      title: "确认",
      content: "将任务退回待办收件箱？",
    });
    if (!res.confirm) return;
    try {
      await backlog.revert(this.data.taskId);
      wx.showToast({ title: "已退回", icon: "success" });
      await this.loadTask();
    } catch (error) {
      wx.showToast({ title: error.message || "操作失败", icon: "none" });
    }
  },

  async handleDelete() {
    const res = await wx.showModal({
      title: "删除待办",
      content: "确定删除此待办？此操作不可恢复。",
      confirmColor: "#dc2626",
    });
    if (!res.confirm) return;
    try {
      await backlog.remove(this.data.taskId);
      wx.showToast({ title: "已删除", icon: "success" });
      setTimeout(() => wx.navigateBack(), 500);
    } catch (error) {
      wx.showToast({ title: error.message || "删除失败", icon: "none" });
    }
  },
});
