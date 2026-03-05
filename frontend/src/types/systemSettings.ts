export interface SystemSettings {
  show_daily_summary: boolean;
  weekly_summary_email_enabled: boolean;
  weekly_summary_email: string | null;
  weekly_summary_feishu_enabled: boolean;
  feishu_app_id: string | null;
  feishu_app_secret: string | null;
  feishu_chat_id: string | null;
}

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  show_daily_summary: false,
  weekly_summary_email_enabled: false,
  weekly_summary_email: null,
  weekly_summary_feishu_enabled: false,
  feishu_app_id: null,
  feishu_app_secret: null,
  feishu_chat_id: null,
};
