import { useMemo } from "react";
import { Button, Modal, Tabs, message } from "antd";
import { Copy } from "lucide-react";
import { MCP_API_KEY_PLACEHOLDER } from "@/constants/mcpApiKey";

type McpImportGuideModalProps = {
  open: boolean;
  onClose: () => void;
  mcpUrl: string;
  apiKey: string;
  hasFullApiKey: boolean;
  keyHint?: string;
  loading?: boolean;
};

type PlatformGuide = {
  key: string;
  label: string;
  steps: string[];
  snippet: string;
  snippetLabel: string;
};

function buildGuides(mcpUrl: string, apiKey: string): PlatformGuide[] {
  const keyToken = apiKey;

  const cursorConfig = JSON.stringify(
    {
      mcpServers: {
        fixlife: {
          url: mcpUrl,
          headers: {
            Authorization: `Bearer ${keyToken}`,
          },
        },
      },
    },
    null,
    2,
  );

  const claudeJsonConfig = JSON.stringify(
    {
      mcpServers: {
        fixlife: {
          type: "http",
          url: mcpUrl,
          headers: {
            Authorization: `Bearer ${keyToken}`,
          },
        },
      },
    },
    null,
    2,
  );

  const claudeCli = [
    "claude mcp add --transport http --scope user fixlife \\",
    `  ${mcpUrl} \\`,
    `  --header "Authorization: Bearer ${keyToken}"`,
  ].join("\n");

  const codexToml = [
    "[mcp_servers.fixlife]",
    `url = "${mcpUrl}"`,
    'bearer_token_env_var = "FIXLIFE_MCP_API_KEY"',
    "enabled = true",
    "",
    "# 在 shell 中设置：",
    `# export FIXLIFE_MCP_API_KEY="${keyToken}"`,
  ].join("\n");

  const codexCli = [
    "codex mcp add fixlife \\",
    `  --url ${mcpUrl} \\`,
    "  --bearer-token-env-var FIXLIFE_MCP_API_KEY",
    "",
    "# 在 shell 中设置：",
    `# export FIXLIFE_MCP_API_KEY="${keyToken}"`,
  ].join("\n");

  return [
    {
      key: "cursor",
      label: "Cursor",
      steps: [
        "打开 Cursor → Settings → MCP（或 Features → MCP）",
        "点击 Add new global MCP server，或编辑 ~/.cursor/mcp.json",
        "粘贴下方配置并保存，然后重启 Cursor",
      ],
      snippet: cursorConfig,
      snippetLabel: "Cursor MCP 配置",
    },
    {
      key: "claude-code",
      label: "Claude Code",
      steps: [
        "在终端执行下方命令，或在项目根目录创建 .mcp.json",
        "将配置中的 API Key 替换为你的 fl_live_ 密钥",
        "执行 claude mcp list 验证 fixlife 是否已连接",
      ],
      snippet: `${claudeCli}\n\n# 或使用 .mcp.json：\n${claudeJsonConfig}`,
      snippetLabel: "Claude Code 配置",
    },
    {
      key: "codex",
      label: "Codex",
      steps: [
        "编辑 ~/.codex/config.toml（或在 Codex 中选择 MCP settings → Open config.toml）",
        "添加下方 [mcp_servers.fixlife] 配置",
        "在终端 export FIXLIFE_MCP_API_KEY=你的 fl_live_ 密钥，然后重启 Codex",
      ],
      snippet: `${codexToml}\n\n# 或使用 CLI：\n${codexCli}`,
      snippetLabel: "Codex 配置",
    },
  ];
}

async function copyText(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    message.success(`${label}已复制`);
  } catch {
    message.error("复制失败");
  }
}

export function McpImportGuideModal({
  open,
  onClose,
  mcpUrl,
  apiKey,
  hasFullApiKey,
  keyHint,
  loading = false,
}: McpImportGuideModalProps) {
  const guides = useMemo(() => buildGuides(mcpUrl, apiKey), [mcpUrl, apiKey]);

  if (!open) {
    return null;
  }

  return (
    <Modal
      title="导入 Fix Life MCP"
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" type="primary" onClick={onClose}>
          关闭
        </Button>,
      ]}
      width={720}
    >
      {loading ? (
        <p className="text-sm text-gray-500 py-8 text-center">正在加载 API Key…</p>
      ) : (
        <>
      <p className="text-sm text-gray-600 mb-4">
        {hasFullApiKey ? (
          "以下配置已填入当前 API Key，可直接复制到对应客户端使用。"
        ) : (
          <>
            以下配置可直接复制使用。请将{" "}
            <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{MCP_API_KEY_PLACEHOLDER}</code>{" "}
            替换为你保存的 API Key
            {keyHint ? (
              <>
                （当前 Key：<span className="font-mono">{keyHint}</span>）
              </>
            ) : null}
            。
          </>
        )}
      </p>
      <Tabs
        items={guides.map((guide) => ({
          key: guide.key,
          label: guide.label,
          children: (
            <div className="space-y-4">
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                {guide.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-800">{guide.snippetLabel}</span>
                  <Button
                    size="small"
                    icon={<Copy size={14} />}
                    onClick={() => copyText(guide.snippet, guide.snippetLabel)}
                  >
                    复制
                  </Button>
                </div>
                <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-x-auto font-mono whitespace-pre-wrap">
                  {guide.snippet}
                </pre>
              </div>
            </div>
          ),
        }))}
      />
        </>
      )}
    </Modal>
  );
}

export function getMcpServerUrl(origin: string = window.location.origin) {
  return `${origin}/mcp/`;
}
