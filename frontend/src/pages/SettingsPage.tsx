import { useState, useEffect } from "react";
import {
  Settings,
  Loader2,
  Save,
  Monitor,
  Send,
  Mail,
  MessageSquare,
} from "lucide-react";
import { Switch, Input, message, Tabs } from "antd";
import type { TabsProps } from "antd";
import { systemSettingsService } from "@/services/systemSettingsService";
import type { SystemSettings } from "@/types/systemSettings";

type SettingTab = "display" | "notification";
type NotificationTab = "email" | "feishu";

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>({
    show_daily_summary: false,
    weekly_summary_email_enabled: false,
    weekly_summary_email: null,
    weekly_summary_feishu_enabled: false,
    feishu_app_id: null,
    feishu_app_secret: null,
    feishu_chat_id: null,
  });
  const [activeTab, setActiveTab] = useState<SettingTab>("display");
  const [notificationTab, setNotificationTab] = useState<NotificationTab>("email");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const data = await systemSettingsService.getSettings();
      setSettings(data);
    } catch (error) {
      console.error("Failed to load system settings:", error);
      message.error("加载设置失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await systemSettingsService.updateSettings(settings);
      systemSettingsService.clearCache();
      message.success("设置已保存");
    } catch (error) {
      console.error("Failed to save system settings:", error);
      message.error("保存设置失败");
    } finally {
      setIsSaving(false);
    }
  };

  const menuItems = [
    {
      key: "display" as SettingTab,
      icon: Monitor,
      label: "显示设置",
      description: "自定义应用的基本显示",
    },
    {
      key: "notification" as SettingTab,
      icon: Send,
      label: "推送周报",
      description: "配置周总结的推送方式",
    },
  ];

  const notificationTabItems: TabsProps["items"] = [
    {
      key: "email",
      label: (
        <span className="flex items-center gap-2">
          <Mail size={16} />
          邮件推送
        </span>
      ),
      children: (
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Mail size={16} className="text-gray-600" />
                  <h4 className="text-sm font-semibold text-gray-800">
                    启用邮件推送
                  </h4>
                </div>
                <p className="text-xs text-gray-500">
                  每周一自动发送上周的周总结到指定邮箱
                </p>
              </div>
              <Switch
                checked={settings.weekly_summary_email_enabled}
                onChange={(checked) =>
                  setSettings({
                    ...settings,
                    weekly_summary_email_enabled: checked,
                  })
                }
                disabled={isSaving}
              />
            </div>
          </div>

          {settings.weekly_summary_email_enabled && (
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                接收邮箱
              </label>
              <Input
                type="email"
                placeholder="留空则使用注册邮箱"
                value={settings.weekly_summary_email || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    weekly_summary_email: e.target.value || null,
                  })
                }
                disabled={isSaving}
                size="large"
              />
              <p className="text-xs text-gray-500 mt-2">
                💡 留空则使用您注册时的邮箱地址
              </p>
            </div>
          )}
        </div>
      ),
    },
    {
      key: "feishu",
      label: (
        <span className="flex items-center gap-2">
          <MessageSquare size={16} />
          飞书推送
        </span>
      ),
      children: (
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare size={16} className="text-blue-600" />
                  <h4 className="text-sm font-semibold text-gray-800">
                    启用飞书推送
                  </h4>
                </div>
                <p className="text-xs text-gray-500">
                  每周一自动发送上周的周总结到飞书群聊
                </p>
              </div>
              <Switch
                checked={settings.weekly_summary_feishu_enabled}
                onChange={(checked) =>
                  setSettings({
                    ...settings,
                    weekly_summary_feishu_enabled: checked,
                  })
                }
                disabled={isSaving}
              />
            </div>
          </div>

          {settings.weekly_summary_feishu_enabled && (
            <div className="space-y-3">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  App ID <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="例如: cli_xxxxxxxxxxxxx"
                  value={settings.feishu_app_id || ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      feishu_app_id: e.target.value || null,
                    })
                  }
                  disabled={isSaving}
                  size="large"
                />
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  App Secret <span className="text-red-500">*</span>
                </label>
                <Input.Password
                  placeholder="飞书应用密钥"
                  value={settings.feishu_app_secret || ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      feishu_app_secret: e.target.value || null,
                    })
                  }
                  disabled={isSaving}
                  size="large"
                />
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  群 Chat ID <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="例如: oc_xxxxxxxxxxxxxxxx"
                  value={settings.feishu_chat_id || ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      feishu_chat_id: e.target.value || null,
                    })
                  }
                  disabled={isSaving}
                  size="large"
                />
                <p className="text-xs text-gray-500 mt-2">
                  💡 需要先在飞书开放平台创建应用并将机器人添加到群聊中
                </p>
              </div>

              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-sm text-blue-700">
                  📖 配置帮助：请参考飞书开放平台文档，创建企业自建应用并获取相关凭证
                </p>
              </div>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
              <Settings className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">系统设置</h1>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save size={16} />
                保存设置
              </>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex gap-6">
        {/* Left Sidebar */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 p-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all mb-1 ${
                    isActive
                      ? "bg-indigo-50 text-indigo-600"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <Icon size={18} />
                  <div className="text-left flex-1">
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-xs opacity-70 mt-0.5">
                      {item.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Content */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12">
              <div className="flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              {/* Display Settings */}
              {activeTab === "display" && (
                <div className="space-y-4">
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">
                      显示设置
                    </h2>
                    <p className="text-sm text-gray-500">
                      自定义应用的基本显示和行为
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-gray-800 mb-1">
                        在日计划卡片中显示每日总结
                      </h3>
                      <p className="text-xs text-gray-500">
                        开启后，每日总结会显示在每个日计划卡片的最下方
                      </p>
                    </div>
                    <Switch
                      checked={settings.show_daily_summary}
                      onChange={(checked) =>
                        setSettings({
                          ...settings,
                          show_daily_summary: checked,
                        })
                      }
                      disabled={isSaving}
                      className="ml-4"
                    />
                  </div>
                </div>
              )}

              {/* Notification Settings */}
              {activeTab === "notification" && (
                <div className="space-y-4">
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">
                      推送周报
                    </h2>
                    <p className="text-sm text-gray-500">
                      每周一自动发送上周的周总结到指定渠道
                    </p>
                  </div>

                  <Tabs
                    activeKey={notificationTab}
                    onChange={(key) => setNotificationTab(key as NotificationTab)}
                    items={notificationTabItems}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
