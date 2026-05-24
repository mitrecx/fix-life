import { useState, useEffect } from "react";
import {
  Settings,
  Save,
  Monitor,
  Send,
  Mail,
  MessageSquare,
  Key,
  Copy,
  Trash2,
  Plus,
  BookOpen,
} from "lucide-react";
import { Switch, Input, message, Tabs, Modal, Button } from "antd";
import type { TabsProps } from "antd";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { McpImportGuideModal, getMcpServerUrl } from "@/components/McpImportGuideModal";
import { MCP_API_KEY_PLACEHOLDER } from "@/constants/mcpApiKey";
import { systemSettingsService } from "@/services/systemSettingsService";
import type { SystemSettings } from "@/types/systemSettings";
import type { McpApiKey, McpApiKeyCreateResponse } from "@/types/mcpApiKey";

type SettingTab = "display" | "notification" | "mcp";
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
  const [mcpKeys, setMcpKeys] = useState<McpApiKey[]>([]);
  const [isCreatingMcpKey, setIsCreatingMcpKey] = useState(false);
  const [createdMcpKey, setCreatedMcpKey] = useState<McpApiKeyCreateResponse | null>(null);
  const [importGuideOpen, setImportGuideOpen] = useState(false);
  const [importGuideApiKey, setImportGuideApiKey] = useState(MCP_API_KEY_PLACEHOLDER);
  const [importGuideHasFullApiKey, setImportGuideHasFullApiKey] = useState(false);
  const [importGuideKeyHint, setImportGuideKeyHint] = useState<string>();
  const [importGuideLoading, setImportGuideLoading] = useState(false);

  useEffect(() => {
    loadSettings();
    loadMcpKeys();
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

  const loadMcpKeys = async () => {
    try {
      const items = await systemSettingsService.listMcpKeys();
      setMcpKeys(items);
    } catch (error) {
      console.error("Failed to load MCP keys:", error);
    }
  };

  const handleCreateMcpKey = async () => {
    const name = new Date().toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    try {
      setIsCreatingMcpKey(true);
      const created = await systemSettingsService.createMcpKey(name);
      setCreatedMcpKey(created);
      await loadMcpKeys();
      message.success("API Key 已创建");
    } catch (error) {
      console.error("Failed to create MCP key:", error);
      message.error("创建 API Key 失败");
    } finally {
      setIsCreatingMcpKey(false);
    }
  };

  const handleRevokeMcpKey = async (keyId: string) => {
    try {
      await systemSettingsService.revokeMcpKey(keyId);
      await loadMcpKeys();
      message.success("API Key 已撤销");
    } catch (error) {
      console.error("Failed to revoke MCP key:", error);
      message.error("撤销 API Key 失败");
    }
  };

  const openImportGuide = async (keyId: string, apiKey?: string) => {
    const keyMeta = mcpKeys.find((key) => key.id === keyId);
    setImportGuideKeyHint(
      keyMeta ? `${keyMeta.key_prefix}...${keyMeta.key_suffix}` : undefined,
    );
    setImportGuideOpen(true);
    setImportGuideLoading(true);

    let resolved = apiKey ?? MCP_API_KEY_PLACEHOLDER;
    if (!apiKey) {
      try {
        resolved = await systemSettingsService.revealMcpKeySecret(keyId);
      } catch (error) {
        console.error("Failed to reveal MCP key:", error);
      }
    }

    setImportGuideApiKey(resolved);
    setImportGuideHasFullApiKey(resolved !== MCP_API_KEY_PLACEHOLDER);
    setImportGuideLoading(false);
  };

  const copyCursorConfig = async (apiKey: string) => {
    const config = JSON.stringify(
      {
        mcpServers: {
          fixlife: {
            url: getMcpServerUrl(),
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          },
        },
      },
      null,
      2,
    );
    await navigator.clipboard.writeText(config);
    message.success("Cursor 配置已复制");
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
    {
      key: "mcp" as SettingTab,
      icon: Key,
      label: "MCP 集成",
      description: "生成 API Key 供 Agent 连接",
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
                <LoadingSpinner size="small" inline />
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
              <LoadingSpinner size="large" block />
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

              {activeTab === "mcp" && (
                <div className="space-y-4">
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">
                      MCP 集成
                    </h2>
                    <p className="text-sm text-gray-500">
                      通过 Streamable HTTP 连接 Fix Life MCP Server。
                    </p>
                  </div>

                  <Button
                    type="primary"
                    icon={<Plus size={16} />}
                    loading={isCreatingMcpKey}
                    onClick={handleCreateMcpKey}
                  >
                    生成 API Key
                  </Button>

                  <div className="space-y-3">
                    {mcpKeys.length === 0 ? (
                      <div className="p-4 text-sm text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
                        还没有 MCP API Key。生成后可在 Cursor 等客户端中使用。
                      </div>
                    ) : (
                      mcpKeys.map((key) => (
                        <div
                          key={key.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200"
                        >
                          <div>
                            <div className="text-sm font-semibold text-gray-800">{key.name}</div>
                            <div className="text-xs text-gray-500 mt-1 font-mono">
                              {key.key_prefix}...{key.key_suffix}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              创建于 {new Date(key.created_at).toLocaleString()}
                              {key.last_used_at
                                ? ` · 最近使用 ${new Date(key.last_used_at).toLocaleString()}`
                                : ""}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openImportGuide(key.id)}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="导入说明"
                            >
                              <BookOpen size={16} />
                            </button>
                            <button
                              onClick={() => handleRevokeMcpKey(key.id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="撤销"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Modal
        title="API Key 已创建"
        open={!!createdMcpKey}
        onCancel={() => setCreatedMcpKey(null)}
        footer={[
          <Button
            key="import-guide"
            icon={<BookOpen size={14} />}
            onClick={() => createdMcpKey && openImportGuide(createdMcpKey.id, createdMcpKey.api_key)}
          >
            查看导入说明
          </Button>,
          <Button key="copy-config" icon={<Copy size={14} />} onClick={() => createdMcpKey && copyCursorConfig(createdMcpKey.api_key)}>
            复制 Cursor 配置
          </Button>,
          <Button key="close" type="primary" onClick={() => setCreatedMcpKey(null)}>
            我已保存
          </Button>,
        ]}
      >
        {createdMcpKey && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              请立即复制并妥善保存。之后仍可在导入说明中查看完整 Key。
            </p>
            <Input.TextArea
              value={createdMcpKey.api_key}
              readOnly
              autoSize={{ minRows: 2, maxRows: 4 }}
              className="font-mono"
            />
          </div>
        )}
      </Modal>

      <McpImportGuideModal
        open={importGuideOpen}
        onClose={() => setImportGuideOpen(false)}
        mcpUrl={getMcpServerUrl()}
        apiKey={importGuideApiKey}
        hasFullApiKey={importGuideHasFullApiKey}
        keyHint={importGuideKeyHint}
        loading={importGuideLoading}
      />
    </div>
  );
}
