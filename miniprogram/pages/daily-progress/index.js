const dailyProgress = require("../../utils/services/dailyProgress");
const dailySummary = require("../../utils/services/dailySummary");
const settingsService = require("../../utils/services/settings");
const backlog = require("../../utils/services/backlog");
const { TASK_CONTEXT, TASK_PRIORITY, ENTRY_STATUS } = require("../../utils/constants");
const { decorateEntry } = require("../../utils/format");
const {
  todayString,
  addDays,
  weekDates,
  formatDisplayDate,
} = require("../../utils/date");

Page({
  data: {
    loading: false,
    progressDate: todayString(),
    displayDate: "",
    weekDays: [],
    dayId: "",
    entries: [],
    contextFilter: "all",
    contexts: TASK_CONTEXT,
    priorities: TASK_PRIORITY,
    entryStatuses: ENTRY_STATUS,
    showAddPanel: false,
    newTitle: "",
    newContext: "learning",
    newPriority: "medium",
    showBacklogPicker: false,
    backlogTasks: [],
    backlogLoading: false,
    showDailySummary: false,
    summaryPreview: "",
  },

  onShow() {
    this.refreshWeek();
    this.loadSettings();
    this.loadDay();
  },

  async loadSettings() {
    try {
      const settings = await settingsService.getSettings();
      this.setData({ showDailySummary: !!settings.show_daily_summary });
    } catch (error) {
      this.setData({ showDailySummary: false });
    }
  },

  onPullDownRefresh() {
    this.loadDay().finally(() => wx.stopPullDownRefresh());
  },

  refreshWeek() {
    const progressDate = this.data.progressDate;
    const dates = weekDates(progressDate);
    const today = todayString();
    this.setData({
      displayDate: formatDisplayDate(progressDate),
      weekDays: dates.map((d) => ({
        date: d,
        label: d.slice(5),
        isToday: d === today,
        isSelected: d === progressDate,
      })),
    });
  },

  async ensureDay(progressDate) {
    let head = await dailyProgress.getDayHeadByDate(progressDate);
    if (!head) {
      const result = await dailyProgress.create({ progress_date: progressDate });
      head = result.day;
    }
    return head.id;
  },

  async loadDay() {
    this.setData({ loading: true });
    try {
      const dayId = await this.ensureDay(this.data.progressDate);
      const entries = await dailyProgress.getEntries(dayId);
      let list = entries || [];
      if (this.data.contextFilter !== "all") {
        list = list.filter((e) => e.context === this.data.contextFilter);
      }
      let summaryPreview = "";
      if (this.data.showDailySummary) {
        try {
          const summary = await dailySummary.getByDayId(dayId);
          summaryPreview = summary.content || "";
        } catch (error) {
          summaryPreview = "";
        }
      }
      this.setData({
        dayId,
        entries: list.map(decorateEntry),
        summaryPreview,
      });
    } catch (error) {
      wx.showToast({ title: error.message || "加载失败", icon: "none" });
    } finally {
      this.setData({ loading: false });
    }
  },

  onSelectDay(e) {
    const date = e.currentTarget.dataset.date;
    this.setData({ progressDate: date }, () => {
      this.refreshWeek();
      this.loadDay();
    });
  },

  onPrevDay() {
    const date = addDays(this.data.progressDate, -1);
    this.setData({ progressDate: date }, () => {
      this.refreshWeek();
      this.loadDay();
    });
  },

  onNextDay() {
    const date = addDays(this.data.progressDate, 1);
    this.setData({ progressDate: date }, () => {
      this.refreshWeek();
      this.loadDay();
    });
  },

  onGoToday() {
    const date = todayString();
    this.setData({ progressDate: date }, () => {
      this.refreshWeek();
      this.loadDay();
    });
  },

  onContextFilter(e) {
    this.setData({ contextFilter: e.currentTarget.dataset.value }, () => this.loadDay());
  },

  toggleAddPanel() {
    this.setData({ showAddPanel: !this.data.showAddPanel });
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

  async handleAddEntry() {
    const title = this.data.newTitle.trim();
    if (!title) {
      wx.showToast({ title: "请输入标题", icon: "none" });
      return;
    }
    try {
      await dailyProgress.createEntry(this.data.dayId, {
        title,
        context: this.data.newContext,
        priority: this.data.newPriority,
        status: "todo",
      });
      this.setData({ newTitle: "", showAddPanel: false });
      await this.loadDay();
      wx.showToast({ title: "已添加", icon: "success" });
    } catch (error) {
      wx.showToast({ title: error.message || "添加失败", icon: "none" });
    }
  },

  async openBacklogPicker() {
    this.setData({ showBacklogPicker: true, backlogLoading: true });
    try {
      const data = await backlog.list("pending", {}, { limit: 50, offset: 0 });
      this.setData({ backlogTasks: data.tasks || [] });
    } catch (error) {
      wx.showToast({ title: error.message || "加载待办失败", icon: "none" });
    } finally {
      this.setData({ backlogLoading: false });
    }
  },

  closeBacklogPicker() {
    this.setData({ showBacklogPicker: false });
  },

  async handlePickBacklog(e) {
    const taskId = e.currentTarget.dataset.id;
    try {
      await backlog.schedule(taskId, this.data.progressDate);
      this.setData({ showBacklogPicker: false });
      await this.loadDay();
      wx.showToast({ title: "已从待办排入", icon: "success" });
    } catch (error) {
      wx.showToast({ title: error.message || "排入失败", icon: "none" });
    }
  },

  async handleToggleStatus(e) {
    const entryId = e.currentTarget.dataset.id;
    const current = e.currentTarget.dataset.status;
    const order = ["todo", "in-progress", "done"];
    const idx = order.indexOf(current);
    const next = order[(idx + 1) % order.length];
    try {
      await dailyProgress.updateEntryStatus(entryId, next);
      await this.loadDay();
    } catch (error) {
      wx.showToast({ title: error.message || "更新失败", icon: "none" });
    }
  },

  async handleDeleteEntry(e) {
    const entryId = e.currentTarget.dataset.id;
    const res = await wx.showModal({ title: "删除条目", content: "确定删除此每日条目？" });
    if (!res.confirm) return;
    try {
      await dailyProgress.removeEntry(entryId);
      await this.loadDay();
    } catch (error) {
      wx.showToast({ title: error.message || "删除失败", icon: "none" });
    }
  },

  openSummary() {
    wx.navigateTo({
      url: `/pages/daily-summary/index?dayId=${this.data.dayId}&date=${this.data.progressDate}`,
    });
  },
});
