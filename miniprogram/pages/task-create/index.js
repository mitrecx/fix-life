const backlog = require("../../utils/services/backlog");
const { TASK_CONTEXT, TASK_PRIORITY } = require("../../utils/constants");

Page({
  data: {
    saving: false,
    title: "",
    description: "",
    context: "learning",
    priority: "medium",
    contexts: TASK_CONTEXT,
    priorities: TASK_PRIORITY,
  },

  onTitleInput(e) {
    this.setData({ title: e.detail.value });
  },

  onDescInput(e) {
    this.setData({ description: e.detail.value });
  },

  onContextChange(e) {
    this.setData({ context: e.currentTarget.dataset.value });
  },

  onPriorityChange(e) {
    this.setData({ priority: e.currentTarget.dataset.value });
  },

  async handleCreate() {
    const title = this.data.title.trim();
    if (!title) {
      wx.showToast({ title: "请输入标题", icon: "none" });
      return;
    }
    this.setData({ saving: true });
    try {
      await backlog.create({
        title,
        description: this.data.description.trim() || undefined,
        context: this.data.context,
        priority: this.data.priority,
        progress: 0,
      });
      wx.showToast({ title: "已添加", icon: "success" });
      setTimeout(() => wx.navigateBack(), 400);
    } catch (error) {
      wx.showToast({ title: error.message || "创建失败", icon: "none" });
    } finally {
      this.setData({ saving: false });
    }
  },
});
