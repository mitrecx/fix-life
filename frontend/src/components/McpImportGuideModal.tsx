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

type ConfigMethod = {
  title: string;
  steps: string[];
  snippet: string;
  snippetLabel: string;
};

type PlatformGuide = {
  key: string;
  label: string;
  verifyStep: string;
  methods: ConfigMethod[];
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
      verifyStep: "重启 Cursor 后，在 Settings → MCP 中确认 fixlife 已连接。",
      methods: [
        {
          title: "编辑 MCP 配置文件",
          steps: [
            "打开 Cursor → Settings → MCP（或 Features → MCP）",
            "点击 Add new global MCP server，或编辑 ~/.cursor/mcp.json",
            "粘贴下方配置并保存",
          ],
          snippet: cursorConfig,
          snippetLabel: "Cursor mcp.json",
        },
      ],
    },
    {
      key: "claude-code",
      label: "Claude Code",
      verifyStep: "执行 claude mcp list，确认 fixlife 出现在列表中。",
      methods: [
        {
          title: "方式一：CLI 命令",
          steps: ["复制下方命令，在终端执行"],
          snippet: claudeCli,
          snippetLabel: "Claude Code CLI",
        },
        {
          title: "方式二：.mcp.json 配置文件",
          steps: [
            "在项目根目录（全局配置则放在用户目录）创建或编辑 .mcp.json",
            "粘贴下方 JSON 并保存",
          ],
          snippet: claudeJsonConfig,
          snippetLabel: "Claude Code .mcp.json",
        },
      ],
    },
    {
      key: "codex",
      label: "Codex",
      verifyStep: "设置环境变量后重启 Codex，确认 fixlife MCP 已启用。",
      methods: [
        {
          title: "方式一：config.toml",
          steps: [
            "编辑 ~/.codex/config.toml（或在 Codex 中选择 MCP settings → Open config.toml）",
            "添加下方 [mcp_servers.fixlife] 配置并保存",
            "在终端执行下方 export 命令设置 API Key 环境变量",
          ],
          snippet: codexToml,
          snippetLabel: "Codex config.toml",
        },
        {
          title: "方式二：CLI 命令",
          steps: [
            "复制下方命令，在终端执行",
            "执行下方 export 命令设置 API Key 环境变量",
          ],
          snippet: codexCli,
          snippetLabel: "Codex CLI",
        },
      ],
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

function ConfigMethodBlock({ method }: { method: ConfigMethod }) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-800">{method.title}</h4>
      <ol className="list-decimal list-inside space-y-1.5 text-sm text-gray-700">
        {method.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-600">{method.snippetLabel}</span>
          <Button
            size="small"
            icon={<Copy size={14} />}
            onClick={() => copyText(method.snippet, method.snippetLabel)}
          >
            复制
          </Button>
        </div>
        <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-x-auto font-mono whitespace-pre-wrap">
          {method.snippet}
        </pre>
      </div>
    </div>
  );
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
          <div className="mb-4 rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-xs text-indigo-900">
            连接成功后可用 Tools：<strong>todo</strong>、<strong>daily_progress</strong>（每日进度，替代已弃用的 daily）、
            <strong>reflect</strong>（日总结用 get_daily_summary）、<strong>plan</strong>、<strong>account</strong>。
          </div>
          <Tabs
            items={guides.map((guide) => ({
              key: guide.key,
              label: guide.label,
              children: (
                <div className="space-y-6">
                  {guide.methods.map((method, index) => (
                    <div
                      key={method.title}
                      className={index > 0 ? "pt-6 border-t border-gray-100" : undefined}
                    >
                      <ConfigMethodBlock method={method} />
                    </div>
                  ))}
                  <p className="text-sm text-gray-600 pt-2 border-t border-gray-100">
                    <span className="font-medium text-gray-700">验证：</span>
                    {guide.verifyStep}
                  </p>
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
