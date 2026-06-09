function getNavLayout() {
  const systemInfo = wx.getSystemInfoSync();
  const menuButton = wx.getMenuButtonBoundingClientRect();
  const statusBarHeight = systemInfo.statusBarHeight || 20;
  const navBarHeight = (menuButton.top - statusBarHeight) * 2 + menuButton.height;
  const navTopInset = statusBarHeight + navBarHeight;

  return {
    statusBarHeight,
    navBarHeight,
    navTopInset,
  };
}

module.exports = {
  getNavLayout,
};
