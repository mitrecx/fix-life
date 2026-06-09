const dailyProgress = require("../../utils/services/dailyProgress");
const backlog = require("../../utils/services/backlog");
const { decorateEntry } = require("../../utils/format");

Page({
  data: {
    entryId: "",
    dayId: "",
    progressDate: "",
    entry: null,
    loading: true,
    saving: false,
    editProgress: 0,
    progressMin: 0,
    backlogTaskId: "",
    canEditProgress: false,
  },

  onLoad(options) {
    this.setData({
      entryId: options.id || "",
      dayId: options.dayId || "",
      progressDate: options.date || "",
    });
    this.loadEntry();
  },

  async loadEntry() {
    if (!this.data.entryId) return;
    this.setData({ loading: true });
    try {
      let entry = null;
      if (this.data.dayId) {
        const entries = await dailyProgress.getEntries(this.data.dayId);
        entry = (entries || []).find((e) => e.id === this.data.entryId);
      }
      if (!entry) {
        wx.showToast({ title: "条目未找到", icon: "none" });
        return;
      }

      if (!this.data.progressDate && this.data.dayId) {
        const day = await dailyProgress.getById(this.data.dayId);
        if (day?.progress_date) {
          this.setData({ progressDate: day.progress_date });
        }
      }

      const decorated = decorateEntry(entry);
      const total = decorated.progress_after ?? 0;
      const past = Math.max(0, total - (decorated.progress_delta ?? 0));
      const backlogTaskId = decorated.backlog_task_id ? String(decorated.backlog_task_id) : "";

      this.setData({
        entry: decorated,
        editProgress: total,
        progressMin: past,
        backlogTaskId,
        canEditProgress: !!backlogTaskId,
      });
    } catch (error) {
      wx.showToast({ title: error.message || "加载失败", icon: "none" });
    } finally {
      this.setData({ loading: false });
    }
  },

  updateProgressFromTouch(touch) {
    const rect = this._progressTrackRect;
    if (!rect || !rect.width) return;
    const x = touch.clientX - rect.left;
    let progress = Math.round((x / rect.width) * 100);
    progress = Math.max(this.data.progressMin, Math.min(100, progress));
    if (progress !== this.data.editProgress) {
      this.setData({ editProgress: progress });
    }
  },

  onProgressTouchStart(e) {
    if (!this.data.canEditProgress) return;
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
    if (!this.data.canEditProgress) return;
    const touch = e.touches[0];
    if (!touch || !this._progressTrackRect) return;
    this.updateProgressFromTouch(touch);
  },

  onProgressTouchEnd() {
    this._progressTrackRect = null;
  },

  openTask() {
    if (!this.data.backlogTaskId) return;
    wx.navigateTo({
      url: `/pages/task-detail/index?id=${this.data.backlogTaskId}`,
    });
  },

  async handleSave() {
    if (!this.data.canEditProgress || !this.data.backlogTaskId) return;
    if (!this.data.progressDate) {
      wx.showToast({ title: "缺少排期日期", icon: "none" });
      return;
    }

    this.setData({ saving: true });
    try {
      await backlog.update(this.data.backlogTaskId, {
        progress: this.data.editProgress,
        progress_plan_date: this.data.progressDate,
      });
      wx.showToast({ title: "已保存", icon: "success" });
      setTimeout(() => wx.navigateBack(), 400);
    } catch (error) {
      wx.showToast({ title: error.message || "保存失败", icon: "none" });
    } finally {
      this.setData({ saving: false });
    }
  },

  async handleDelete() {
    const res = await wx.showModal({ title: "删除", content: "确定删除此条目？" });
    if (!res.confirm) return;
    try {
      await dailyProgress.removeEntry(this.data.entryId);
      wx.navigateBack();
    } catch (error) {
      wx.showToast({ title: error.message || "删除失败", icon: "none" });
    }
  },
});
