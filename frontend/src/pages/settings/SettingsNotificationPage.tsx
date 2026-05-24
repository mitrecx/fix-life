import { useState } from "react";
import { Switch, Input, Tabs } from "antd";
import type { TabsProps } from "antd";
import { Mail, MessageSquare } from "lucide-react";
import { useSettingsContext } from "@/contexts/SettingsContext";

type NotificationTab = "email" | "feishu";

export default function SettingsNotificationPage() {
  const { settings, setSettings, isSaving } = useSettingsContext();
  const [notificationTab, setNotificationTab] = useState<NotificationTab>("email");

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
                  <h4 className="text-sm font-semibold text-gray-800">启用邮件推送</h4>
                </div>
                <p className="text-xs text-gray-500">每周一自动发送上周的周总结到指定邮箱</p>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">接收邮箱</label>
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
              <p className="text-xs text-gray-500 mt-2">💡 留空则使用您注册时的邮箱地址</p>
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
                  <h4 className="text-sm font-semibold text-gray-800">启用飞书推送</h4>
                </div>
                <p className="text-xs text-gray-500">每周一自动发送上周的周总结到飞书群聊</p>
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
    <div className="space-y-4">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">推送周报</h2>
        <p className="text-sm text-gray-500">每周一自动发送上周的周总结到指定渠道</p>
      </div>

      <Tabs
        activeKey={notificationTab}
        onChange={(key) => setNotificationTab(key as NotificationTab)}
        items={notificationTabItems}
      />
    </div>
  );
}
