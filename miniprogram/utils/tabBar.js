const TAB_INDEX = {
  "pages/todos/index": 0,
  "pages/daily-progress/index": 1,
  "pages/quick-notes/index": 2,
  "pages/profile/index": 3,
};

function updateTabBarSelected(page) {
  if (typeof page.getTabBar !== "function") return;
  const tabBar = page.getTabBar();
  if (!tabBar) return;
  const selected = TAB_INDEX[page.route];
  if (selected === undefined) return;
  tabBar.setData({ selected });
}

module.exports = {
  updateTabBarSelected,
};
