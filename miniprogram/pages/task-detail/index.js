const backlog = require("../../utils/services/backlog");
const {
  TASK_CONTEXT,
  TASK_PRIORITY,
} = require("../../utils/constants");
const { decorateTask } = require("../../utils/format");
const { todayString, formatDisplayDate } = require("../../utils/date");
const scheduleSheet = require("../../utils/scheduleSheet");
const { getNavLayout } = require("../../utils/navBar");

function buildScheduleDates(occurrences) {
  if (!occurrences.length) return [];
  return [...occurrences]
    .sort((a, b) => String(b.plan_date).localeCompare(String(a.plan_date)))
    .map((occ) => ({
      id: occ.daily_task_id,
      label: formatDisplayDate(occ.plan_date),
    }));
}

Page({
  data: {
    taskId: "",
    loading: true,
    saving: false,
    task: null,
    scheduleDates: [],
    contexts: TASK_CONTEXT,
    priorities: TASK_PRIORITY,
    editTitle: "",
    editDescription: "",
    editContext: "learning",
    editPriority: "medium",
    editProgress: 0,
    statusBarHeight: 20,
    navBarHeight: 44,
    navTopInset: 64,
    ...scheduleSheet.initialData(),
  },

  onLoad(options) {
    this.setData({
      taskId: options.id || "",
      ...getNavLayout(),
    });
    this.loadTask();
  },

  goBack() {
    wx.navigateBack({
      fail: () => {
        wx.switchTab({ url: "/pages/todos/index" });
      },
    });
  },

  async loadTask() {
    if (!this.data.taskId) return;
    this.setData({ loading: true });
    try {
      const detail = await backlog.get(this.data.taskId);
      const task = decorateTask(detail);
      const occurrences = detail.occurrences || [];
      this.setData({
        task,
        scheduleDates: buildScheduleDates(occurrences),
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

  updateProgressFromTouch(touch) {
    const rect = this._progressTrackRect;
    if (!rect || !rect.width) return;
    const x = touch.clientX - rect.left;
    let progress = Math.round((x / rect.width) * 100);
    progress = Math.max(0, Math.min(100, progress));
    if (progress !== this.data.editProgress) {
      this.setData({ editProgress: progress });
    }
  },

  onProgressTouchStart(e) {
    const touch = e.touches[0];
    if (!touch) return;
    wx.createSelectorQuery()
      .in(this)
      .select(".progress-track")
      .boundingClientRect((rect) => {
        this._progressTrackRect = rect;
        this.updateProgressFromTouch(touch);
      })
      .exec();
  },

  onProgressTouchMove(e) {
    const touch = e.touches[0];
    if (!touch || !this._progressTrackRect) return;
    this.updateProgressFromTouch(touch);
  },

  onProgressTouchEnd() {
    this._progressTrackRect = null;
  },

  openScheduleSheet() {
    const initialDate =
      this.data.task?.scheduled_date ||
      this.data.task?.last_plan_date ||
      this.data.scheduleDefaultDate;
    scheduleSheet.open(this, initialDate);
  },

  closeScheduleSheet() {
    scheduleSheet.close(this);
  },

  onSchedulePrevMonth() {
    scheduleSheet.prevMonth(this);
  },

  onScheduleNextMonth() {
    scheduleSheet.nextMonth(this);
  },

  onScheduleDayTap(e) {
    scheduleSheet.selectDay(this, e.currentTarget.dataset.date);
  },

  async confirmSchedule() {
    const { scheduleSelectedDate, taskId } = this.data;
    if (!taskId || !scheduleSelectedDate) return;
    try {
      await backlog.schedule(taskId, scheduleSelectedDate);
      wx.showToast({ title: "已排期", icon: "success" });
      this.closeScheduleSheet();
      await this.loadTask();
    } catch (error) {
      wx.showToast({ title: error.message || "排期失败", icon: "none" });
    }
  },

  noop() {},

  preventTouchMove() {},

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

  async handleDelete() {
    const res = await wx.showModal({
      title: "删除",
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
