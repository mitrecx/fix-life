const monthlyPlan = require("../../utils/services/monthlyPlan");
const yearlyGoal = require("../../utils/services/yearlyGoal");
const { decorateGoal } = require("../../utils/format");
const { GOAL_CATEGORIES } = require("../../utils/constants");

const now = new Date();

Page({
  data: {
    planTab: "monthly",
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    monthlyPlans: [],
    yearlyGoals: [],
    showCreateMonthly: false,
    showCreateYearly: false,
    newMonthlyTitle: "",
    newYearlyTitle: "",
    newYearlyCategory: "learning",
    newYearlyTarget: "100",
    categories: GOAL_CATEGORIES,
  },

  onShow() {
    this.loadPlans();
  },

  onPullDownRefresh() {
    this.loadPlans().finally(() => wx.stopPullDownRefresh());
  },

  onPlanTab(e) {
    this.setData({ planTab: e.currentTarget.dataset.tab });
  },

  async loadPlans() {
    try {
      const [monthly, yearly] = await Promise.all([
        monthlyPlan.list(this.data.year, this.data.month),
        yearlyGoal.list(this.data.year),
      ]);
      this.setData({
        monthlyPlans: monthly,
        yearlyGoals: yearly.map(decorateGoal),
      });
    } catch (error) {
      wx.showToast({ title: error.message || "加载失败", icon: "none" });
    }
  },

  onYearPrev() {
    this.setData({ year: this.data.year - 1 }, () => this.loadPlans());
  },

  onYearNext() {
    this.setData({ year: this.data.year + 1 }, () => this.loadPlans());
  },

  onMonthChange(e) {
    this.setData({ month: Number(e.detail.value) + 1 }, () => this.loadPlans());
  },

  toggleCreateMonthly() {
    this.setData({ showCreateMonthly: !this.data.showCreateMonthly });
  },

  toggleCreateYearly() {
    this.setData({ showCreateYearly: !this.data.showCreateYearly });
  },

  onNewMonthlyTitle(e) {
    this.setData({ newMonthlyTitle: e.detail.value });
  },

  onNewYearlyTitle(e) {
    this.setData({ newYearlyTitle: e.detail.value });
  },

  onNewYearlyCategory(e) {
    this.setData({ newYearlyCategory: e.currentTarget.dataset.value });
  },

  onNewYearlyTarget(e) {
    this.setData({ newYearlyTarget: e.detail.value });
  },

  async handleCreateMonthly() {
    const title = this.data.newMonthlyTitle.trim();
    try {
      await monthlyPlan.create({
        year: this.data.year,
        month: this.data.month,
        title: title || undefined,
      });
      this.setData({ newMonthlyTitle: "", showCreateMonthly: false });
      await this.loadPlans();
      wx.showToast({ title: "已创建", icon: "success" });
    } catch (error) {
      wx.showToast({ title: error.message || "创建失败", icon: "none" });
    }
  },

  async handleCreateYearly() {
    const title = this.data.newYearlyTitle.trim();
    if (!title) {
      wx.showToast({ title: "请输入目标标题", icon: "none" });
      return;
    }
    const target = Number(this.data.newYearlyTarget);
    if (!target || target <= 0) {
      wx.showToast({ title: "请输入有效目标值", icon: "none" });
      return;
    }
    try {
      await yearlyGoal.create({
        year: this.data.year,
        title,
        category: this.data.newYearlyCategory,
        target_value: target,
        auto_generate_milestones: true,
      });
      this.setData({ newYearlyTitle: "", showCreateYearly: false });
      await this.loadPlans();
      wx.showToast({ title: "已创建", icon: "success" });
    } catch (error) {
      wx.showToast({ title: error.message || "创建失败", icon: "none" });
    }
  },

  openMonthly(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/monthly-plan-detail/index?id=${id}` });
  },

  openYearly(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/yearly-goal-detail/index?id=${id}` });
  },
});
