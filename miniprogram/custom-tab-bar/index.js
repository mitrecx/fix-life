Component({
  data: {
    selected: 0,
    color: "#6b7280",
    selectedColor: "#4f46e5",
    list: [
      {
        pagePath: "/pages/todos/index",
        text: "待办",
        iconPath: "/assets/tab/todos.png",
        selectedIconPath: "/assets/tab/todos-active.png",
      },
      {
        pagePath: "/pages/daily-progress/index",
        text: "每日",
        iconPath: "/assets/tab/daily.png",
        selectedIconPath: "/assets/tab/daily-active.png",
      },
      {
        pagePath: "/pages/quick-notes/index",
        text: "随手记",
        iconPath: "/assets/tab/notes.png",
        selectedIconPath: "/assets/tab/notes-active.png",
      },
      {
        pagePath: "/pages/profile/index",
        text: "我的",
        iconPath: "/assets/tab/profile.png",
        selectedIconPath: "/assets/tab/profile-active.png",
      },
    ],
  },

  methods: {
    switchTab(e) {
      const { path, index } = e.currentTarget.dataset;
      if (this.data.selected === index) return;
      this.setData({ selected: index });
      wx.switchTab({ url: path });
    },
  },
});
