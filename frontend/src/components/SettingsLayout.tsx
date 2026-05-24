import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Settings, Save, Monitor, Send, Key, Activity, ShieldBan } from "lucide-react";
import { Button, Input, Modal } from "antd";
import { Copy, BookOpen } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { McpImportGuideModal, getMcpServerUrl } from "@/components/McpImportGuideModal";
import { SettingsProvider, useSettingsContext } from "@/contexts/SettingsContext";
import { useAuthStore } from "@/store/authStore";

const SYSTEM_STATUS_READ = "system_status:read";

const USER_SUB_NAV = [
  {
    path: "/settings/display",
    key: "display",
    icon: Monitor,
    label: "显示设置",
    description: "自定义应用的基本显示",
  },
  {
    path: "/settings/notification",
    key: "notification",
    icon: Send,
    label: "推送周报",
    description: "配置周总结的推送方式",
  },
  {
    path: "/settings/mcp",
    key: "mcp",
    icon: Key,
    label: "MCP 集成",
    description: "生成 API Key 供 Agent 连接",
  },
] as const;

const ADMIN_SUB_NAV = [
  {
    path: "/settings/status",
    key: "status",
    icon: Activity,
    label: "系统状态",
    description: "查看服务与组件健康状态",
  },
  {
    path: "/settings/ip-bans",
    key: "ip-bans",
    icon: ShieldBan,
    label: "IP 封禁",
    description: "管理登录限流封禁的 IP",
  },
] as const;

const SETTINGS_CONTENT_PATHS = new Set([
  "/settings/display",
  "/settings/notification",
  "/settings/mcp",
]);

function SettingsLayoutContent() {
  const location = useLocation();
  const { user } = useAuthStore();
  const canManageSystem = user?.permissions?.includes(SYSTEM_STATUS_READ);
  const subNav = canManageSystem ? [...USER_SUB_NAV, ...ADMIN_SUB_NAV] : [...USER_SUB_NAV];
  const isSettingsContent = SETTINGS_CONTENT_PATHS.has(location.pathname);
  const {
    isLoading,
    isSaving,
    handleSave,
    createdMcpKey,
    setCreatedMcpKey,
    openImportGuide,
    copyCursorConfig,
    importGuideOpen,
    setImportGuideOpen,
    importGuideApiKey,
    importGuideHasFullApiKey,
    importGuideKeyHint,
    importGuideLoading,
  } = useSettingsContext();

  return (
    <div className="max-w-6xl mx-auto">
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
            onClick={() => void handleSave()}
            disabled={isSaving || isLoading}
            className={`px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
              isSettingsContent ? "" : "invisible pointer-events-none"
            }`}
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

      <div className="flex gap-6">
        <div className="w-64 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 p-2">
            {subNav.map((item, index) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              const showDivider =
                canManageSystem && index === USER_SUB_NAV.length;
              return (
                <div key={item.path}>
                  {showDivider ? (
                    <div className="my-2 border-t border-gray-200" aria-hidden />
                  ) : null}
                  <NavLink
                    to={item.path}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all mb-1 ${
                      isActive
                        ? "bg-indigo-50 text-indigo-600"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <Icon size={18} />
                    <div className="text-left flex-1">
                      <div className="text-sm font-medium">{item.label}</div>
                      <div className="text-xs opacity-70 mt-0.5">{item.description}</div>
                    </div>
                  </NavLink>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {isSettingsContent && isLoading ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12">
              <LoadingSpinner size="large" block />
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <Outlet />
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
            onClick={() =>
              createdMcpKey && void openImportGuide(createdMcpKey.id, createdMcpKey.api_key)
            }
          >
            查看导入说明
          </Button>,
          <Button
            key="copy-config"
            icon={<Copy size={14} />}
            onClick={() => createdMcpKey && void copyCursorConfig(createdMcpKey.api_key)}
          >
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

export default function SettingsLayout() {
  return (
    <SettingsProvider>
      <SettingsLayoutContent />
    </SettingsProvider>
  );
}
