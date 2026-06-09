const quickNote = require("../../utils/services/quickNote");
const { decorateQuickNote } = require("../../utils/quickNoteContent");
const {
  formatQuickNoteMessageTime,
  formatQuickNoteDateDivider,
  isSameCalendarDay,
} = require("../../utils/date");

const PAGE_SIZE = 10;
const SEARCH_LIMIT = 200;

function enrichNotesForDisplay(notes, highlightQuery) {
  return notes.map((note, index) => {
    const prev = index > 0 ? notes[index - 1] : null;
    const showDateDivider =
      index === 0 || (prev !== null && !isSameCalendarDay(prev.created_at, note.created_at));
    return {
      ...decorateQuickNote(note, highlightQuery),
      messageTime: formatQuickNoteMessageTime(note.created_at),
      dateDivider: showDateDivider ? formatQuickNoteDateDivider(note.created_at) : "",
    };
  });
}

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
    if (this._skipNextOnShowRefresh) {
      this._skipNextOnShowRefresh = false;
      return;
    }
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

  currentSearchQ() {
    return (this._searchQ ?? this.data.searchQ ?? "").trim();
  },

  readSearchInputValue() {
    return new Promise((resolve) => {
      wx.createSelectorQuery()
        .in(this)
        .select(".search-input")
        .fields({ properties: ["value"] })
        .exec((res) => {
          const value = res && res[0] ? res[0].value : this.data.searchQ;
          resolve((value ?? "").trim());
        });
    });
  },

  async refreshNotes({ scrollToBottom = false } = {}) {
    const q = this.currentSearchQ();
    const filters = q ? { q } : {};
    const searching = !!q;
    const displayNotes = (list) => enrichNotesForDisplay(list, q);

    this.setData({ loading: true, searchQ: q });
    try {
      if (searching) {
        const res = await quickNote.list(filters, SEARCH_LIMIT, 0);
        const total = res.total || 0;
        const notes = displayNotes(res.notes || []);
        this.setData({
          notes,
          total,
          listOffset: 0,
          hasMoreOlder: total > notes.length,
          scrollIntoView: "",
        });
      } else {
        const probe = await quickNote.list(filters, 1, 0);
        const total = probe.total || 0;
        const offset = Math.max(0, total - PAGE_SIZE);
        const res = await quickNote.list(filters, PAGE_SIZE, offset);
        this.setData({
          notes: displayNotes(res.notes || []),
          total,
          listOffset: offset,
          hasMoreOlder: offset > 0,
          scrollIntoView: "",
        });
      }
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

    const q = this.currentSearchQ();
    const filters = q ? { q } : {};
    const displayNotes = (list) => enrichNotesForDisplay(list, q);

    try {
      if (q) {
        const newOffset = this.data.notes.length;
        const res = await quickNote.list(filters, SEARCH_LIMIT, newOffset);
        const merged = [...this.data.notes, ...(res.notes || [])];
        const notes = displayNotes(merged);
        this.setData(
          {
            notes,
            listOffset: newOffset,
            hasMoreOlder: newOffset + (res.notes || []).length < (res.total || 0),
            loadingMore: false,
          },
          () => {
            wx.nextTick(() => {
              this.setData({ scrollIntoView: `note-${anchorId}` });
              setTimeout(() => this.setData({ scrollIntoView: "" }), 120);
            });
          }
        );
        return;
      }

      const newOffset = Math.max(0, this.data.listOffset - PAGE_SIZE);
      const fetchCount = this.data.listOffset - newOffset;
      const res = await quickNote.list(filters, fetchCount, newOffset);
      const merged = [...(res.notes || []), ...this.data.notes];
      const notes = displayNotes(merged);

      this.setData(
        {
          notes,
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
    this._searchQ = e.detail.value;
    this.setData({ searchQ: e.detail.value });
  },

  async onSearch(e) {
    const fromEvent = e && e.detail && e.detail.value != null ? e.detail.value : null;
    const q = (fromEvent != null ? fromEvent : await this.readSearchInputValue()).trim();
    this._searchQ = q;
    this.setData({ searchQ: q }, () => {
      this.refreshNotes({ scrollToBottom: true });
    });
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

  previewImage(e) {
    const { src, id } = e.currentTarget.dataset;
    const note = this.data.notes.find((n) => n.id === id);
    const urls = note && note.imageUrls && note.imageUrls.length ? note.imageUrls : [src];
    // Closing the native preview fires onShow; skip reload so scroll position is preserved.
    this._skipNextOnShowRefresh = true;
    wx.previewImage({
      current: src,
      urls,
      fail: () => {
        this._skipNextOnShowRefresh = false;
      },
    });
  },
});
