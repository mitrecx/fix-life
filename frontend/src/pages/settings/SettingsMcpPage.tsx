import { Button } from "antd";
import { Plus, Trash2, BookOpen } from "lucide-react";
import { useSettingsContext } from "@/contexts/SettingsContext";

export default function SettingsMcpPage() {
  const {
    mcpKeys,
    isCreatingMcpKey,
    handleCreateMcpKey,
    handleRevokeMcpKey,
    openImportGuide,
  } = useSettingsContext();

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">MCP 集成</h2>
        <p className="text-sm text-gray-500 mb-3">
          通过 Streamable HTTP 连接 Fix Life MCP Server。每日进度请使用{" "}
          <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">daily_progress</code>（
          <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">daily_progress_day_id</code> /{" "}
          <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">entry_id</code> /{" "}
          <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">progress_date</code>）；日总结请使用{" "}
          <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">reflect</code> 的{" "}
          <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">get_daily_summary</code> 等 action。
        </p>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-600 space-y-1">
          <p className="font-semibold text-gray-700">常用 Tools</p>
          <p>
            <span className="font-medium text-gray-800">todo</span> — 待办 ·{" "}
            <span className="font-medium text-gray-800">daily_progress</span> — 每日进度 ·{" "}
            <span className="font-medium text-gray-800">reflect</span> — 日/周总结 ·{" "}
            <span className="font-medium text-gray-800">plan</span> — 年/月计划
          </p>
        </div>
      </div>

      <Button
        type="primary"
        icon={<Plus size={16} />}
        loading={isCreatingMcpKey}
        onClick={() => void handleCreateMcpKey()}
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
                  onClick={() => void openImportGuide(key.id)}
                  className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="导入说明"
                >
                  <BookOpen size={16} />
                </button>
                <button
                  onClick={() => void handleRevokeMcpKey(key.id)}
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
  );
}
