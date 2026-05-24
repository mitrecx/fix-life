import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { message } from "antd";
import { MCP_API_KEY_PLACEHOLDER } from "@/constants/mcpApiKey";
import { getMcpServerUrl } from "@/components/McpImportGuideModal";
import { systemSettingsService } from "@/services/systemSettingsService";
import type { SystemSettings } from "@/types/systemSettings";
import type { McpApiKey, McpApiKeyCreateResponse } from "@/types/mcpApiKey";

type SettingsContextValue = {
  settings: SystemSettings;
  setSettings: React.Dispatch<React.SetStateAction<SystemSettings>>;
  isLoading: boolean;
  isSaving: boolean;
  handleSave: () => Promise<void>;
  mcpKeys: McpApiKey[];
  loadMcpKeys: () => Promise<void>;
  isCreatingMcpKey: boolean;
  handleCreateMcpKey: () => Promise<void>;
  handleRevokeMcpKey: (keyId: string) => Promise<void>;
  createdMcpKey: McpApiKeyCreateResponse | null;
  setCreatedMcpKey: React.Dispatch<React.SetStateAction<McpApiKeyCreateResponse | null>>;
  importGuideOpen: boolean;
  setImportGuideOpen: React.Dispatch<React.SetStateAction<boolean>>;
  importGuideApiKey: string;
  importGuideHasFullApiKey: boolean;
  importGuideKeyHint?: string;
  importGuideLoading: boolean;
  openImportGuide: (keyId: string, apiKey?: string) => Promise<void>;
  copyCursorConfig: (apiKey: string) => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

const defaultSettings: SystemSettings = {
  show_daily_summary: false,
  weekly_summary_email_enabled: false,
  weekly_summary_email: null,
  weekly_summary_feishu_enabled: false,
  feishu_app_id: null,
  feishu_app_secret: null,
  feishu_chat_id: null,
};

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
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

  const loadSettings = useCallback(async () => {
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
  }, []);

  const loadMcpKeys = useCallback(async () => {
    try {
      const items = await systemSettingsService.listMcpKeys();
      setMcpKeys(items);
    } catch (error) {
      console.error("Failed to load MCP keys:", error);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
    void loadMcpKeys();
  }, [loadSettings, loadMcpKeys]);

  const handleSave = useCallback(async () => {
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
  }, [settings]);

  const handleCreateMcpKey = useCallback(async () => {
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
  }, [loadMcpKeys]);

  const handleRevokeMcpKey = useCallback(
    async (keyId: string) => {
      try {
        await systemSettingsService.revokeMcpKey(keyId);
        await loadMcpKeys();
        message.success("API Key 已撤销");
      } catch (error) {
        console.error("Failed to revoke MCP key:", error);
        message.error("撤销 API Key 失败");
      }
    },
    [loadMcpKeys],
  );

  const openImportGuide = useCallback(
    async (keyId: string, apiKey?: string) => {
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
          try {
            const rotated = await systemSettingsService.rotateMcpKey(keyId);
            resolved = rotated.api_key;
            setImportGuideKeyHint(`${rotated.key_prefix}...${rotated.key_suffix}`);
            await loadMcpKeys();
            message.warning("此 Key 无法读取完整内容，已自动重新生成。请更新 MCP 客户端中的配置。");
          } catch (rotateError) {
            console.error("Failed to rotate MCP key:", rotateError);
            message.error("无法获取 API Key");
          }
        }
      }

      setImportGuideApiKey(resolved);
      setImportGuideHasFullApiKey(resolved !== MCP_API_KEY_PLACEHOLDER);
      setImportGuideLoading(false);
    },
    [loadMcpKeys, mcpKeys],
  );

  const copyCursorConfig = useCallback(async (apiKey: string) => {
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
  }, []);

  const value = useMemo(
    () => ({
      settings,
      setSettings,
      isLoading,
      isSaving,
      handleSave,
      mcpKeys,
      loadMcpKeys,
      isCreatingMcpKey,
      handleCreateMcpKey,
      handleRevokeMcpKey,
      createdMcpKey,
      setCreatedMcpKey,
      importGuideOpen,
      setImportGuideOpen,
      importGuideApiKey,
      importGuideHasFullApiKey,
      importGuideKeyHint,
      importGuideLoading,
      openImportGuide,
      copyCursorConfig,
    }),
    [
      settings,
      isLoading,
      isSaving,
      handleSave,
      mcpKeys,
      loadMcpKeys,
      isCreatingMcpKey,
      handleCreateMcpKey,
      handleRevokeMcpKey,
      createdMcpKey,
      importGuideOpen,
      importGuideApiKey,
      importGuideHasFullApiKey,
      importGuideKeyHint,
      importGuideLoading,
      openImportGuide,
      copyCursorConfig,
    ],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettingsContext() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettingsContext must be used within SettingsProvider");
  }
  return ctx;
}
