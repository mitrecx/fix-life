const monthlyPlan = require("../../utils/services/monthlyPlan");
const { TASK_CONTEXT, TASK_PRIORITY } = require("../../utils/constants");

Page({
  data: {
    planId: "",
    plan: null,
    tasks: [],
    loading: true,
    newTitle: "",
    newContext: "learning",
    newPriority: "medium",
    contexts: TASK_CONTEXT,
    priorities: TASK_PRIORITY,
    editNotes: "",
  },

  onLoad(options) {
    this.setData({ planId: options.id || "" });
    this.loadPlan();
  },

  async loadPlan() {
    if (!this.data.planId) return;
    this.setData({ loading: true });
    try {
      const [plan, tasks] = await Promise.all([
        monthlyPlan.getById(this.data.planId),
        monthlyPlan.getTasks(this.data.planId),
      ]);
      this.setData({
        plan,
        tasks: tasks || [],
        editNotes: plan.notes || "",
      });
    } catch (error) {
      wx.showToast({ title: error.message || "加载失败", icon: "none" });
    } finally {
      this.setData({ loading: false });
    }
  },

  onNotesInput(e) {
    this.setData({ editNotes: e.detail.value });
  },

  async handleSaveNotes() {
    try {
      await monthlyPlan.update(this.data.planId, { notes: this.data.editNotes.trim() || undefined });
      wx.showToast({ title: "已保存", icon: "success" });
      await this.loadPlan();
    } catch (error) {
      wx.showToast({ title: error.message || "保存失败", icon: "none" });
    }
  },

  onNewTitleInput(e) {
    this.setData({ newTitle: e.detail.value });
  },

  onNewContext(e) {
    this.setData({ newContext: e.currentTarget.dataset.value });
  },

  onNewPriority(e) {
    this.setData({ newPriority: e.currentTarget.dataset.value });
  },

  async handleAddTask() {
    const title = this.data.newTitle.trim();
    if (!title) {
      wx.showToast({ title: "请输入任务标题", icon: "none" });
      return;
    }
    try {
      await monthlyPlan.createTask(this.data.planId, {
        title,
        context: this.data.newContext,
        priority: this.data.newPriority,
        status: "todo",
      });
      this.setData({ newTitle: "" });
      await this.loadPlan();
    } catch (error) {
      wx.showToast({ title: error.message || "添加失败", icon: "none" });
    }
  },

  async handleToggleTask(e) {
    const id = e.currentTarget.dataset.id;
    const status = e.currentTarget.dataset.status;
    const next = status === "done" ? "todo" : "done";
    try {
      await monthlyPlan.updateTaskStatus(id, next);
      await this.loadPlan();
    } catch (error) {
      wx.showToast({ title: error.message || "更新失败", icon: "none" });
    }
  },

  async handleDeleteTask(e) {
    const id = e.currentTarget.dataset.id;
    const res = await wx.showModal({ title: "删除任务", content: "确定删除此月度任务？" });
    if (!res.confirm) return;
    try {
      await monthlyPlan.removeTask(id);
      await this.loadPlan();
    } catch (error) {
      wx.showToast({ title: error.message || "删除失败", icon: "none" });
    }
  },

  async handleDeletePlan() {
    const res = await wx.showModal({
      title: "删除计划",
      content: "确定删除整个月度计划？",
      confirmColor: "#dc2626",
    });
    if (!res.confirm) return;
    try {
      await monthlyPlan.remove(this.data.planId);
      wx.navigateBack();
    } catch (error) {
      wx.showToast({ title: error.message || "删除失败", icon: "none" });
    }
  },
});
