const quickNote = require("../../utils/services/quickNote");
const { decorateQuickNote } = require("../../utils/quickNoteContent");

const PAGE_SIZE = 10;

Page({
  data: {
    loading: false,
    loadingMore: false,
    notes: [],
    content: "",
    searchQ: "",
    total: 0,
    listOffset: 0,
    hasMoreOlder: false,
    scrollIntoView: "",
    showSearch: false,
    searchFocus: false,
  },

  onShow() {
    this.refreshNotes({ scrollToBottom: true });
  },

  onPullDownRefresh() {
    this.refreshNotes({ scrollToBottom: true }).finally(() => wx.stopPullDownRefresh());
  },

  scrollToBottom() {
    this.setData({ scrollIntoView: "" });
    wx.nextTick(() => {
      this.setData({ scrollIntoView: "notes-bottom-anchor" });
      setTimeout(() => this.setData({ scrollIntoView: "" }), 120);
    });
  },

  async refreshNotes({ scrollToBottom = false } = {}) {
    this.setData({ loading: true });
    try {
      const filters = { q: this.data.searchQ };
      const probe = await quickNote.list(filters, 1, 0);
      const total = probe.total || 0;
      const offset = Math.max(0, total - PAGE_SIZE);
      const res = await quickNote.list(filters, PAGE_SIZE, offset);
      this.setData({
        notes: (res.notes || []).map(decorateQuickNote),
        total,
        listOffset: offset,
        hasMoreOlder: offset > 0,
        scrollIntoView: "",
      });
      if (scrollToBottom) {
        wx.nextTick(() => this.scrollToBottom());
      }
    } catch (error) {
      wx.showToast({ title: error.message || "加载失败", icon: "none" });
    } finally {
      this.setData({ loading: false });
    }
  },

  async onScrollToUpper() {
    if (this.data.loading || this.data.loadingMore || !this.data.hasMoreOlder) return;

    const now = Date.now();
    if (now - (this._lastUpperLoadAt || 0) < 800) return;

    const anchorId = this.data.notes[0]?.id;
    if (!anchorId) return;

    this._lastUpperLoadAt = now;
    this.setData({ loadingMore: true, scrollIntoView: "" });

    try {
      const newOffset = Math.max(0, this.data.listOffset - PAGE_SIZE);
      const fetchCount = this.data.listOffset - newOffset;
      const res = await quickNote.list({ q: this.data.searchQ }, fetchCount, newOffset);
      const older = (res.notes || []).map(decorateQuickNote);

      this.setData(
        {
          notes: [...older, ...this.data.notes],
          listOffset: newOffset,
          hasMoreOlder: newOffset > 0,
          loadingMore: false,
        },
        () => {
          wx.nextTick(() => {
            this.setData({ scrollIntoView: `note-${anchorId}` });
            setTimeout(() => this.setData({ scrollIntoView: "" }), 120);
          });
        }
      );
    } catch (error) {
      this.setData({ loadingMore: false });
      wx.showToast({ title: error.message || "加载失败", icon: "none" });
    }
  },

  toggleSearch() {
    if (this.data.showSearch) {
      this.setData({ showSearch: false, searchFocus: false });
      wx.hideKeyboard();
      return;
    }
    this.setData({ showSearch: true, searchFocus: true });
  },

  onSearchTouchStart(e) {
    this._searchTouchStartY = e.touches[0].clientY;
  },

  onSearchTouchEnd(e) {
    if (this.data.showSearch) return;
    const deltaY = e.changedTouches[0].clientY - (this._searchTouchStartY || 0);
    if (deltaY > 40) {
      this.setData({ showSearch: true, searchFocus: true });
    }
  },

  onSearchInput(e) {
    this.setData({ searchQ: e.detail.value });
  },

  onSearch() {
    this.refreshNotes({ scrollToBottom: true });
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value });
  },

  async handleCreate() {
    const content = this.data.content.trim();
    if (!content) {
      wx.showToast({ title: "请输入内容", icon: "none" });
      return;
    }
    try {
      await quickNote.create({ content });
      this.setData({ content: "" });
      await this.refreshNotes({ scrollToBottom: true });
      wx.showToast({ title: "已保存", icon: "success" });
    } catch (error) {
      wx.showToast({ title: error.message || "保存失败", icon: "none" });
    }
  },

  async handleDeleteOne(e) {
    const id = e.currentTarget.dataset.id;
    const res = await wx.showModal({ title: "删除", content: "确定删除此条随手记？" });
    if (!res.confirm) return;
    try {
      await quickNote.remove(id);
      await this.refreshNotes({ scrollToBottom: false });
    } catch (error) {
      wx.showToast({ title: error.message || "删除失败", icon: "none" });
    }
  },

  handleCopy(e) {
    const content = e.currentTarget.dataset.content;
    wx.setClipboardData({
      data: content,
      success: () => wx.showToast({ title: "已复制", icon: "success" }),
    });
  },

  previewImage(e) {
    const { src, id } = e.currentTarget.dataset;
    const note = this.data.notes.find((n) => n.id === id);
    const urls = note && note.imageUrls && note.imageUrls.length ? note.imageUrls : [src];
    wx.previewImage({ current: src, urls });
  },
});
