const backlog = require("../../utils/services/backlog");
const { BACKLOG_TABS, TASK_CONTEXT, TASK_PRIORITY } = require("../../utils/constants");
const { decorateTask } = require("../../utils/format");
const { todayString } = require("../../utils/date");

Page({
  data: {
    loading: false,
    tab: "pending",
    tabs: BACKLOG_TABS,
    contextFilter: "all",
    priorityFilter: "all",
    searchQ: "",
    title: "",
    createContext: "learning",
    createPriority: "medium",
    contexts: TASK_CONTEXT,
    priorities: TASK_PRIORITY,
    tasks: [],
    showCreatePanel: false,
  },

  onShow() {
    this.loadTasks();
  },

  onPullDownRefresh() {
    this.loadTasks().finally(() => wx.stopPullDownRefresh());
  },

  async loadTasks() {
    this.setData({ loading: true });
    try {
      const data = await backlog.list(
        this.data.tab,
        {
          context: this.data.contextFilter,
          priority: this.data.priorityFilter,
          q: this.data.searchQ,
        },
        { limit: 100, offset: 0 }
      );
      this.setData({
        tasks: (data.tasks || []).map(decorateTask),
      });
    } catch (error) {
      wx.showToast({ title: error.message || "加载失败", icon: "none" });
    } finally {
      this.setData({ loading: false });
    }
  },

  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === this.data.tab) return;
    this.setData({ tab }, () => this.loadTasks());
  },

  onContextFilter(e) {
    this.setData({ contextFilter: e.currentTarget.dataset.value }, () => this.loadTasks());
  },

  onPriorityFilter(e) {
    this.setData({ priorityFilter: e.currentTarget.dataset.value }, () => this.loadTasks());
  },

  onSearchInput(e) {
    this.setData({ searchQ: e.detail.value });
  },

  onSearchConfirm() {
    this.loadTasks();
  },

  onTitleInput(e) {
    this.setData({ title: e.detail.value });
  },

  onCreateContext(e) {
    this.setData({ createContext: e.currentTarget.dataset.value });
  },

  onCreatePriority(e) {
    this.setData({ createPriority: e.currentTarget.dataset.value });
  },

  toggleCreatePanel() {
    this.setData({ showCreatePanel: !this.data.showCreatePanel });
  },

  async handleCreate() {
    const title = this.data.title.trim();
    if (!title) {
      wx.showToast({ title: "请输入标题", icon: "none" });
      return;
    }
    try {
      await backlog.create({
        title,
        context: this.data.createContext,
        priority: this.data.createPriority,
        progress: 0,
      });
      this.setData({ title: "", showCreatePanel: false });
      await this.loadTasks();
      wx.showToast({ title: "已添加", icon: "success" });
    } catch (error) {
      wx.showToast({ title: error.message || "创建失败", icon: "none" });
    }
  },

  openDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/task-detail/index?id=${id}` });
  },

  async handleStart(e) {
    const id = e.currentTarget.dataset.id;
    try {
      await backlog.update(id, { status: "in_progress" });
      await this.loadTasks();
    } catch (error) {
      wx.showToast({ title: error.message || "操作失败", icon: "none" });
    }
  },

  async handleComplete(e) {
    const id = e.currentTarget.dataset.id;
    try {
      await backlog.complete(id);
      await this.loadTasks();
      wx.showToast({ title: "已完成", icon: "success" });
    } catch (error) {
      wx.showToast({ title: error.message || "操作失败", icon: "none" });
    }
  },

  async handleScheduleToday(e) {
    const id = e.currentTarget.dataset.id;
    try {
      await backlog.schedule(id, todayString());
      wx.showToast({ title: "已排入今日", icon: "success" });
      await this.loadTasks();
    } catch (error) {
      wx.showToast({ title: error.message || "排期失败", icon: "none" });
    }
  },
});
