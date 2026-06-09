const backlog = require("../../utils/services/backlog");
const { BACKLOG_TABS, TASK_CONTEXT, TASK_PRIORITY } = require("../../utils/constants");
const { decorateTask } = require("../../utils/format");
const { todayString, monthLabel, buildMonthCalendar } = require("../../utils/date");
const { updateTabBarSelected } = require("../../utils/tabBar");

Page({
  data: {
    loading: false,
    refreshing: false,
    tab: "pending",
    tabs: BACKLOG_TABS,
    contextFilter: "all",
    priorityFilter: "all",
    searchQ: "",
    contexts: TASK_CONTEXT,
    priorities: TASK_PRIORITY,
    tasks: [],
    showSearch: false,
    searchFocus: false,
    searchPanelVisible: false,
    searchPanelActive: false,
    searchClosing: false,
    filterActive: false,
    showScheduleSheet: false,
    scheduleSheetActive: false,
    scheduleTaskId: "",
    scheduleSelectedDate: "",
    scheduleViewYear: 0,
    scheduleViewMonth: 0,
    scheduleMonthLabel: "",
    scheduleCalendarDays: [],
    scheduleDefaultDate: todayString(),
  },

  onShow() {
    updateTabBarSelected(this);
    this.loadTasks();
  },

  onPullDownRefresh() {
    this.onScrollRefresh();
  },

  onScrollRefresh() {
    this.setData({ refreshing: true });
    this.loadTasks().finally(() => {
      this.setData({ refreshing: false });
      wx.stopPullDownRefresh();
    });
  },

  syncFilterActive() {
    const filterActive = !!(
      String(this.data.searchQ || "").trim() ||
      this.data.contextFilter !== "all" ||
      this.data.priorityFilter !== "all"
    );
    if (filterActive !== this.data.filterActive) {
      this.setData({ filterActive });
    }
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
      this.syncFilterActive();
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
    this.setData({ contextFilter: e.currentTarget.dataset.value }, () => {
      this.syncFilterActive();
      this.loadTasks();
    });
  },

  onPriorityFilter(e) {
    this.setData({ priorityFilter: e.currentTarget.dataset.value }, () => {
      this.syncFilterActive();
      this.loadTasks();
    });
  },

  onSearchInput(e) {
    this.setData({ searchQ: e.detail.value }, () => this.syncFilterActive());
  },

  onSearchConfirm() {
    this.syncFilterActive();
    this.closeSearchPanel();
    this.loadTasks();
  },

  toggleSearch() {
    if (this.data.showSearch) {
      this.closeSearchPanel();
      return;
    }
    this.openSearchPanel();
  },

  openSearchPanel() {
    clearTimeout(this._searchCloseTimer);
    this.setData({
      showSearch: true,
      searchPanelVisible: true,
      searchClosing: false,
      searchPanelActive: false,
      searchFocus: true,
    });
    this._searchScrollTop = null;
    wx.nextTick(() => {
      setTimeout(() => this.setData({ searchPanelActive: true }), 30);
    });
  },

  closeSearchPanel() {
    if (!this.data.showSearch || this.data.searchClosing) return;
    this.setData({
      searchPanelActive: false,
      searchClosing: true,
      searchFocus: false,
    });
    wx.hideKeyboard();
    clearTimeout(this._searchCloseTimer);
    this._searchCloseTimer = setTimeout(() => {
      this.setData({
        showSearch: false,
        searchPanelVisible: false,
        searchClosing: false,
      });
    }, 380);
  },

  noop() {},

  preventTouchMove() {},

  dismissSearchAndQuery() {
    if (!this.data.showSearch || this.data.searchClosing) return;
    this.onSearchConfirm();
  },

  onTodosScroll(e) {
    if (!this.data.showSearch || this.data.searchClosing) return;
    const scrollTop = e.detail.scrollTop ?? 0;
    if (this._searchScrollTop == null) {
      this._searchScrollTop = scrollTop;
      return;
    }
    if (Math.abs(scrollTop - this._searchScrollTop) < 6) return;
    this._searchScrollTop = scrollTop;
    this.closeSearchPanel();
  },

  onSearchTouchStart(e) {
    this._searchTouchStartY = e.touches[0].clientY;
  },

  onSearchTouchEnd(e) {
    if (this.data.showSearch) return;
    const deltaY = e.changedTouches[0].clientY - (this._searchTouchStartY || 0);
    if (deltaY > 40) {
      this.openSearchPanel();
    }
  },

  openCreate() {
    wx.navigateTo({ url: "/pages/task-create/index" });
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

  refreshScheduleCalendar() {
    const { scheduleViewYear, scheduleViewMonth, scheduleSelectedDate } = this.data;
    this.setData({
      scheduleMonthLabel: monthLabel(scheduleViewYear, scheduleViewMonth),
      scheduleCalendarDays: buildMonthCalendar(
        scheduleViewYear,
        scheduleViewMonth,
        scheduleSelectedDate
      ),
    });
  },

  openScheduleSheet(e) {
    const id = e.currentTarget.dataset.id;
    const scheduled = e.currentTarget.dataset.scheduled || this.data.scheduleDefaultDate;
    const [y, m] = scheduled.split("-").map(Number);
    this.setData({
      showScheduleSheet: true,
      scheduleSheetActive: false,
      scheduleTaskId: id,
      scheduleSelectedDate: scheduled,
      scheduleViewYear: y,
      scheduleViewMonth: m,
    });
    this.refreshScheduleCalendar();
    wx.nextTick(() => {
      setTimeout(() => this.setData({ scheduleSheetActive: true }), 30);
    });
  },

  closeScheduleSheet() {
    this.setData({ scheduleSheetActive: false });
    setTimeout(() => {
      this.setData({
        showScheduleSheet: false,
        scheduleTaskId: "",
      });
    }, 280);
  },

  onSchedulePrevMonth() {
    let { scheduleViewYear, scheduleViewMonth } = this.data;
    if (scheduleViewMonth === 1) {
      scheduleViewYear -= 1;
      scheduleViewMonth = 12;
    } else {
      scheduleViewMonth -= 1;
    }
    this.setData({ scheduleViewYear, scheduleViewMonth }, () => this.refreshScheduleCalendar());
  },

  onScheduleNextMonth() {
    let { scheduleViewYear, scheduleViewMonth } = this.data;
    if (scheduleViewMonth === 12) {
      scheduleViewYear += 1;
      scheduleViewMonth = 1;
    } else {
      scheduleViewMonth += 1;
    }
    this.setData({ scheduleViewYear, scheduleViewMonth }, () => this.refreshScheduleCalendar());
  },

  onScheduleDayTap(e) {
    const date = e.currentTarget.dataset.date;
    if (!date) return;
    const [y, m] = date.split("-").map(Number);
    this.setData(
      {
        scheduleSelectedDate: date,
        scheduleViewYear: y,
        scheduleViewMonth: m,
      },
      () => this.refreshScheduleCalendar()
    );
  },

  async confirmSchedule() {
    const { scheduleTaskId, scheduleSelectedDate } = this.data;
    if (!scheduleTaskId || !scheduleSelectedDate) return;
    try {
      await backlog.schedule(scheduleTaskId, scheduleSelectedDate);
      wx.showToast({ title: "已安排", icon: "success" });
      this.closeScheduleSheet();
      await this.loadTasks();
    } catch (error) {
      wx.showToast({ title: error.message || "安排失败", icon: "none" });
    }
  },
});
