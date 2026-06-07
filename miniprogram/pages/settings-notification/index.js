const settings = require("../../utils/services/settings");

Page({
  data: {
    loading: true,
    saving: false,
    emailEnabled: false,
    email: "",
    feishuEnabled: false,
    feishuAppId: "",
    feishuAppSecret: "",
    feishuChatId: "",
  },

  onShow() {
    this.loadSettings();
  },

  async loadSettings() {
    this.setData({ loading: true });
    try {
      const data = await settings.getSettings();
      this.setData({
        emailEnabled: !!data.weekly_summary_email_enabled,
        email: data.weekly_summary_email || "",
        feishuEnabled: !!data.weekly_summary_feishu_enabled,
        feishuAppId: data.feishu_app_id || "",
        feishuAppSecret: data.feishu_app_secret || "",
        feishuChatId: data.feishu_chat_id || "",
      });
    } catch (error) {
      wx.showToast({ title: error.message || "加载失败", icon: "none" });
    } finally {
      this.setData({ loading: false });
    }
  },

  onEmailToggle(e) {
    this.setData({ emailEnabled: e.detail.value });
  },

  onFeishuToggle(e) {
    this.setData({ feishuEnabled: e.detail.value });
  },

  onEmailInput(e) {
    this.setData({ email: e.detail.value });
  },

  onFeishuAppIdInput(e) {
    this.setData({ feishuAppId: e.detail.value });
  },

  onFeishuSecretInput(e) {
    this.setData({ feishuAppSecret: e.detail.value });
  },

  onFeishuChatInput(e) {
    this.setData({ feishuChatId: e.detail.value });
  },

  async handleSave() {
    this.setData({ saving: true });
    try {
      await settings.updateSettings({
        weekly_summary_email_enabled: this.data.emailEnabled,
        weekly_summary_email: this.data.email.trim() || null,
        weekly_summary_feishu_enabled: this.data.feishuEnabled,
        feishu_app_id: this.data.feishuAppId.trim() || null,
        feishu_app_secret: this.data.feishuAppSecret.trim() || null,
        feishu_chat_id: this.data.feishuChatId.trim() || null,
      });
      wx.showToast({ title: "已保存", icon: "success" });
    } catch (error) {
      wx.showToast({ title: error.message || "保存失败", icon: "none" });
    } finally {
      this.setData({ saving: false });
    }
  },
});
