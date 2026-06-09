const dailyProgress = require("../../utils/services/dailyProgress");
const dailySummary = require("../../utils/services/dailySummary");
const settingsService = require("../../utils/services/settings");
const { TASK_CONTEXT, ENTRY_STATUS } = require("../../utils/constants");
const { decorateEntry } = require("../../utils/format");
const {
  todayString,
  addDays,
  formatDisplayDate,
} = require("../../utils/date");
const { updateTabBarSelected } = require("../../utils/tabBar");

Page({
  data: {
    loading: false,
    progressDate: todayString(),
    displayDate: "",
    isToday: true,
    dayId: "",
    entries: [],
    contextFilter: "all",
    contexts: TASK_CONTEXT,
    entryStatuses: ENTRY_STATUS,
    showDailySummary: false,
    summaryPreview: "",
    deleteRevealPx: 72,
    swipingId: null,
    swipeOffset: 0,
    openSwipeId: null,
    refreshing: false,
    showFilter: false,
    filterPanelVisible: false,
    filterPanelActive: false,
    filterClosing: false,
    filterActive: false,
  },

  onLoad() {
    this.setData({ deleteRevealPx: this.getDeleteRevealPx() });
  },

  onShow() {
    updateTabBarSelected(this);
    this.refreshDate();
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
    this.onScrollRefresh();
  },

  onScrollRefresh() {
    this.setData({ refreshing: true });
    this.loadDay().finally(() => {
      this.setData({ refreshing: false });
      wx.stopPullDownRefresh();
    });
  },

  syncFilterActive() {
    const filterActive = this.data.contextFilter !== "all";
    if (filterActive !== this.data.filterActive) {
      this.setData({ filterActive });
    }
  },

  refreshDate() {
    const progressDate = this.data.progressDate;
    const today = todayString();
    this.setData({
      displayDate: formatDisplayDate(progressDate),
      isToday: progressDate === today,
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
        openSwipeId: null,
      });
      this.syncFilterActive();
    } catch (error) {
      wx.showToast({ title: error.message || "加载失败", icon: "none" });
    } finally {
      this.setData({ loading: false });
    }
  },

  onPrevDay() {
    const date = addDays(this.data.progressDate, -1);
    this.setData({ progressDate: date }, () => {
      this.refreshDate();
      this.loadDay();
    });
  },

  onNextDay() {
    const date = addDays(this.data.progressDate, 1);
    this.setData({ progressDate: date }, () => {
      this.refreshDate();
      this.loadDay();
    });
  },

  onGoToday() {
    if (this.data.isToday) return;
    const date = todayString();
    this.setData({ progressDate: date }, () => {
      this.refreshDate();
      this.loadDay();
    });
  },

  onContextFilter(e) {
    this.setData({ contextFilter: e.currentTarget.dataset.value }, () => {
      this.syncFilterActive();
      this.loadDay();
    });
  },

  toggleFilterPanel() {
    if (this.data.showFilter) {
      this.closeFilterPanel();
      return;
    }
    this.openFilterPanel();
  },

  openFilterPanel() {
    clearTimeout(this._filterCloseTimer);
    this.setData({
      showFilter: true,
      filterPanelVisible: true,
      filterClosing: false,
      filterPanelActive: false,
    });
    this._filterScrollTop = null;
    wx.nextTick(() => {
      setTimeout(() => this.setData({ filterPanelActive: true }), 30);
    });
  },

  closeFilterPanel() {
    if (!this.data.showFilter || this.data.filterClosing) return;
    this.setData({
      filterPanelActive: false,
      filterClosing: true,
    });
    clearTimeout(this._filterCloseTimer);
    this._filterCloseTimer = setTimeout(() => {
      this.setData({
        showFilter: false,
        filterPanelVisible: false,
        filterClosing: false,
      });
    }, 380);
  },

  noop() {},

  preventTouchMove() {},

  dismissFilterAndQuery() {
    if (!this.data.showFilter || this.data.filterClosing) return;
    this.closeFilterPanel();
    this.loadDay();
  },

  onDailyScroll(e) {
    if (!this.data.showFilter || this.data.filterClosing) return;
    const scrollTop = e.detail.scrollTop ?? 0;
    if (this._filterScrollTop == null) {
      this._filterScrollTop = scrollTop;
      return;
    }
    if (Math.abs(scrollTop - this._filterScrollTop) < 6) return;
    this._filterScrollTop = scrollTop;
    this.closeFilterPanel();
  },

  onFilterTouchStart(e) {
    this._filterTouchStartY = e.touches[0].clientY;
  },

  onFilterTouchEnd(e) {
    if (this.data.showFilter) return;
    const deltaY = e.changedTouches[0].clientY - (this._filterTouchStartY || 0);
    if (deltaY > 40) {
      this.openFilterPanel();
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
      this.setData({ openSwipeId: null });
      await this.loadDay();
    } catch (error) {
      wx.showToast({ title: error.message || "删除失败", icon: "none" });
    }
  },

  getDeleteRevealPx() {
    const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    return (160 / 750) * sys.windowWidth;
  },

  onEntrySwipeStart(e) {
    const id = e.currentTarget.dataset.id;
    const reveal = this.data.deleteRevealPx || this.getDeleteRevealPx();
    let startOffset = 0;
    if (this.data.openSwipeId === id) {
      startOffset = -reveal;
    } else if (this.data.openSwipeId) {
      this.setData({ openSwipeId: null });
    }
    this._swipe = {
      id,
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      startOffset,
      reveal,
      horizontal: null,
    };
  },

  onEntrySwipeMove(e) {
    if (!this._swipe) return;
    const deltaX = e.touches[0].clientX - this._swipe.startX;
    const deltaY = e.touches[0].clientY - this._swipe.startY;
    if (this._swipe.horizontal == null) {
      if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) return;
      this._swipe.horizontal = Math.abs(deltaX) > Math.abs(deltaY);
    }
    if (!this._swipe.horizontal) return;

    let x = this._swipe.startOffset + deltaX;
    x = Math.min(0, Math.max(-this._swipe.reveal, x));
    this.setData({
      swipingId: this._swipe.id,
      swipeOffset: x,
    });
  },

  onEntrySwipeEnd() {
    if (!this._swipe) return;
    const { id, reveal, horizontal } = this._swipe;
    if (!horizontal) {
      this._swipe = null;
      return;
    }

    const currentX = this.data.swipingId === id ? this.data.swipeOffset : 0;
    const shouldOpen = currentX < -reveal / 3;

    this.setData({
      swipingId: null,
      swipeOffset: 0,
      openSwipeId: shouldOpen ? id : this.data.openSwipeId === id ? null : this.data.openSwipeId,
    });
    this._swipe = null;
  },

  openSummary() {
    wx.navigateTo({
      url: `/pages/daily-summary/index?dayId=${this.data.dayId}&date=${this.data.progressDate}`,
    });
  },

  openEntryDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (this.data.openSwipeId === id) {
      this.setData({ openSwipeId: null });
      return;
    }
    if (this.data.openSwipeId) {
      this.setData({ openSwipeId: null });
    }
    wx.navigateTo({
      url: `/pages/daily-entry-detail/index?id=${id}&dayId=${this.data.dayId}`,
    });
  },
});
