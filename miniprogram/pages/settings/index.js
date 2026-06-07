Page({
  navigate(e) {
    wx.navigateTo({ url: e.currentTarget.dataset.url });
  },
});
