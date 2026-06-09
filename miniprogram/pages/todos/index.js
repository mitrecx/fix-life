const backlog = require("../../utils/services/backlog");
const { BACKLOG_TABS, TASK_CONTEXT, TASK_PRIORITY } = require("../../utils/constants");
const { decorateTask } = require("../../utils/format");
const { updateTabBarSelected } = require("../../utils/tabBar");
const scheduleSheet = require("../../utils/scheduleSheet");

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
    scheduleTaskId: "",
    ...scheduleSheet.initialData(),
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

  openScheduleSheet(e) {
    const id = e.currentTarget.dataset.id;
    const scheduled = e.currentTarget.dataset.scheduled || this.data.scheduleDefaultDate;
    this.setData({ scheduleTaskId: id });
    scheduleSheet.open(this, scheduled);
  },

  closeScheduleSheet() {
    scheduleSheet.close(this, { scheduleTaskId: "" });
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
