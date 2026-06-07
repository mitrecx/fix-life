const { getStoredUser } = require("../../utils/auth");
const { hasPermission } = require("../../utils/format");
const { PERM_SYSTEM_STATUS } = require("../../utils/constants");

Page({
  data: {
    canSystemStatus: false,
  },

  onShow() {
    const user = getStoredUser();
    this.setData({
      canSystemStatus: hasPermission(user, PERM_SYSTEM_STATUS),
    });
  },

  navigate(e) {
    wx.navigateTo({ url: e.currentTarget.dataset.url });
  },
});
