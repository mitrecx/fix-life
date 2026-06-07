const quickNote = require("../../utils/services/quickNote");

Page({
  data: {
    loading: false,
    notes: [],
    content: "",
    searchQ: "",
    selectMode: false,
    selectedIds: [],
    selectedMap: {},
  },

  onShow() {
    this.loadNotes();
  },

  onPullDownRefresh() {
    this.loadNotes().finally(() => wx.stopPullDownRefresh());
  },

  async loadNotes() {
    this.setData({ loading: true });
    try {
      const res = await quickNote.list({ q: this.data.searchQ });
      this.setData({ notes: res.notes || res.items || [] });
    } catch (error) {
      wx.showToast({ title: error.message || "加载失败", icon: "none" });
    } finally {
      this.setData({ loading: false });
    }
  },

  onSearchInput(e) {
    this.setData({ searchQ: e.detail.value });
  },

  onSearch() {
    this.loadNotes();
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
      await this.loadNotes();
      wx.showToast({ title: "已保存", icon: "success" });
    } catch (error) {
      wx.showToast({ title: error.message || "保存失败", icon: "none" });
    }
  },

  async handleChooseImage() {
    try {
      const res = await wx.chooseMedia({
        count: 1,
        mediaType: ["image"],
        sourceType: ["album", "camera"],
      });
      const filePath = res.tempFiles[0].tempFilePath;
      const uploaded = await quickNote.uploadImage(filePath);
      const imageMarkdown = `![image](${uploaded.url})`;
      this.setData({ content: `${this.data.content}\n${imageMarkdown}`.trim() });
    } catch (error) {
      if (error.errMsg && error.errMsg.includes("cancel")) return;
      wx.showToast({ title: error.message || "上传失败", icon: "none" });
    }
  },

  onToggleSelect(e) {
    const id = e.currentTarget.dataset.id;
    const selected = new Set(this.data.selectedIds);
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
    const selectedIds = Array.from(selected);
    const selectedMap = {};
    selectedIds.forEach((x) => {
      selectedMap[x] = true;
    });
    this.setData({ selectedIds, selectedMap });
  },

  toggleSelectMode() {
    this.setData({ selectMode: !this.data.selectMode, selectedIds: [], selectedMap: {} });
  },

  async handleDeleteOne(e) {
    const id = e.currentTarget.dataset.id;
    const res = await wx.showModal({ title: "删除", content: "确定删除此条随手记？" });
    if (!res.confirm) return;
    try {
      await quickNote.remove(id);
      await this.loadNotes();
    } catch (error) {
      wx.showToast({ title: error.message || "删除失败", icon: "none" });
    }
  },

  async handleBatchDelete() {
    if (this.data.selectedIds.length === 0) return;
    const res = await wx.showModal({ title: "批量删除", content: `删除 ${this.data.selectedIds.length} 条？` });
    if (!res.confirm) return;
    try {
      await quickNote.batchDelete(this.data.selectedIds);
      this.setData({ selectMode: false, selectedIds: [], selectedMap: {} });
      await this.loadNotes();
    } catch (error) {
      wx.showToast({ title: error.message || "删除失败", icon: "none" });
    }
  },

  async handleBatchMerge() {
    if (this.data.selectedIds.length < 2) {
      wx.showToast({ title: "请至少选择 2 条", icon: "none" });
      return;
    }
    try {
      await quickNote.batchMerge(this.data.selectedIds);
      this.setData({ selectMode: false, selectedIds: [], selectedMap: {} });
      await this.loadNotes();
      wx.showToast({ title: "已合并", icon: "success" });
    } catch (error) {
      wx.showToast({ title: error.message || "合并失败", icon: "none" });
    }
  },

  handleCopy(e) {
    const content = e.currentTarget.dataset.content;
    wx.setClipboardData({
      data: content,
      success: () => wx.showToast({ title: "已复制", icon: "success" }),
    });
  },
});
