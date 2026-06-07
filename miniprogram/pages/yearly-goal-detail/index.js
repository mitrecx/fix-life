const yearlyGoal = require("../../utils/services/yearlyGoal");
const { GOAL_STATUS } = require("../../utils/constants");
const { decorateGoal } = require("../../utils/format");

Page({
  data: {
    goalId: "",
    goal: null,
    loading: true,
    editTitle: "",
    editDescription: "",
    editTarget: "",
    progressValue: "",
    progressNote: "",
    statuses: GOAL_STATUS,
  },

  onLoad(options) {
    this.setData({ goalId: options.id || "" });
    this.loadGoal();
  },

  async loadGoal() {
    if (!this.data.goalId) return;
    this.setData({ loading: true });
    try {
      const raw = await yearlyGoal.getById(this.data.goalId);
      const goal = decorateGoal(raw);
      this.setData({
        goal,
        editTitle: goal.title,
        editDescription: goal.description || "",
        editTarget: String(goal.target_value),
        progressValue: String(goal.current_value),
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

  onTargetInput(e) {
    this.setData({ editTarget: e.detail.value });
  },

  onProgressInput(e) {
    this.setData({ progressValue: e.detail.value });
  },

  onProgressNoteInput(e) {
    this.setData({ progressNote: e.detail.value });
  },

  async handleSave() {
    const title = this.data.editTitle.trim();
    const target = Number(this.data.editTarget);
    if (!title) {
      wx.showToast({ title: "标题不能为空", icon: "none" });
      return;
    }
    try {
      await yearlyGoal.update(this.data.goalId, {
        title,
        description: this.data.editDescription.trim() || undefined,
        target_value: target,
      });
      wx.showToast({ title: "已保存", icon: "success" });
      await this.loadGoal();
    } catch (error) {
      wx.showToast({ title: error.message || "保存失败", icon: "none" });
    }
  },

  async handleUpdateProgress() {
    const progress = Number(this.data.progressValue);
    if (Number.isNaN(progress)) {
      wx.showToast({ title: "请输入有效进度", icon: "none" });
      return;
    }
    try {
      await yearlyGoal.updateProgress(this.data.goalId, {
        progress,
        note: this.data.progressNote.trim() || undefined,
      });
      wx.showToast({ title: "进度已更新", icon: "success" });
      await this.loadGoal();
    } catch (error) {
      wx.showToast({ title: error.message || "更新失败", icon: "none" });
    }
  },

  async handleStatusChange(e) {
    const status = e.currentTarget.dataset.value;
    try {
      await yearlyGoal.update(this.data.goalId, { status });
      await this.loadGoal();
    } catch (error) {
      wx.showToast({ title: error.message || "更新失败", icon: "none" });
    }
  },

  async handleDelete() {
    const res = await wx.showModal({
      title: "删除目标",
      content: "确定删除此年度目标？",
      confirmColor: "#dc2626",
    });
    if (!res.confirm) return;
    try {
      await yearlyGoal.remove(this.data.goalId);
      wx.navigateBack();
    } catch (error) {
      wx.showToast({ title: error.message || "删除失败", icon: "none" });
    }
  },
});
