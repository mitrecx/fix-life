const userService = require("../../utils/services/user");
const { getStoredUser } = require("../../utils/auth");
const { clearToken } = require("../../utils/request");
const { hasPermission } = require("../../utils/format");
const { PERM_USERS_MANAGE } = require("../../utils/constants");
const { apiBaseUrl } = require("../../config");
const { updateTabBarSelected } = require("../../utils/tabBar");

function resolveAvatarUrl(url) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  const origin = apiBaseUrl.replace(/\/api\/v1$/, "");
  return `${origin}${url}`;
}

Page({
  data: {
    user: {},
    editName: "",
    editBio: "",
    showEdit: false,
    canAdmin: false,
    needsBind: true,
    avatarInitial: "修",
  },

  onShow() {
    updateTabBarSelected(this);
    this.loadProfile();
  },

  async loadProfile() {
    const cached = getStoredUser();
    if (cached) {
      this.applyUser(cached);
    }
    try {
      const user = await userService.getMe();
      wx.setStorageSync("auth_user", user);
      this.applyUser(user);
    } catch (error) {
      if (!cached) {
        wx.showToast({ title: error.message || "加载失败", icon: "none" });
      }
    }
  },

  applyUser(user) {
    const normalized = {
      ...user,
      avatar_url: resolveAvatarUrl(user.avatar_url),
    };
    const avatarInitial = (normalized.full_name || normalized.username || "修").charAt(0).toUpperCase();
    this.setData({
      user: normalized,
      editName: normalized.full_name || "",
      editBio: normalized.bio || "",
      canAdmin: hasPermission(normalized, PERM_USERS_MANAGE),
      needsBind: (normalized.email || "").toLowerCase().endsWith("@weixin.fixlife.mitrecx.top"),
      avatarInitial,
    });
  },

  toggleEdit() {
    this.setData({ showEdit: !this.data.showEdit });
  },

  onNameInput(e) {
    this.setData({ editName: e.detail.value });
  },

  onBioInput(e) {
    this.setData({ editBio: e.detail.value });
  },

  async handleSaveProfile() {
    try {
      const user = await userService.updateProfile({
        full_name: this.data.editName.trim() || undefined,
        bio: this.data.editBio.trim() || undefined,
      });
      wx.setStorageSync("auth_user", user);
      this.applyUser(user);
      this.setData({ showEdit: false });
      wx.showToast({ title: "已保存", icon: "success" });
    } catch (error) {
      wx.showToast({ title: error.message || "保存失败", icon: "none" });
    }
  },

  async handleChooseAvatar() {
    try {
      const res = await wx.chooseMedia({
        count: 1,
        mediaType: ["image"],
        sourceType: ["album", "camera"],
      });
      await userService.uploadAvatar(res.tempFiles[0].tempFilePath);
      await this.loadProfile();
      wx.showToast({ title: "头像已更新", icon: "success" });
    } catch (error) {
      if (error.errMsg && error.errMsg.includes("cancel")) return;
      wx.showToast({ title: error.message || "上传失败", icon: "none" });
    }
  },

  navigate(e) {
    const url = e.currentTarget.dataset.url;
    wx.navigateTo({ url });
  },

  handleLogout() {
    clearToken();
    wx.reLaunch({ url: "/pages/login/index" });
  },
});
