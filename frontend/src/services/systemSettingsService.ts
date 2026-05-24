import api from ".//api";
import type { SystemSettings } from "@/types/systemSettings";
import type { McpApiKey, McpApiKeyCreateResponse } from "@/types/mcpApiKey";
import { DEFAULT_SYSTEM_SETTINGS } from "@/types/systemSettings";

class SystemSettingsService {
  private settingsCache: SystemSettings | null = null;
  private loadPromise: Promise<SystemSettings> | null = null;

  async getSettings(): Promise<SystemSettings> {
    if (this.settingsCache) {
      return this.settingsCache;
    }
    if (this.loadPromise) {
      return this.loadPromise;
    }
    this.loadPromise = this.fetchSettingsOnce();
    try {
      return await this.loadPromise;
    } finally {
      this.loadPromise = null;
    }
  }

  private async fetchSettingsOnce(): Promise<SystemSettings> {
    try {
      const data = await api.get<any>("/system-settings/me");
      this.settingsCache = data as SystemSettings;
      return this.settingsCache;
    } catch (error) {
      console.error("Failed to fetch system settings:", error);
      if (this.settingsCache) {
        return this.settingsCache;
      }
      return DEFAULT_SYSTEM_SETTINGS;
    }
  }

  async updateSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    try {
      const data = await api.put<any>("/system-settings/me", settings);
      this.settingsCache = data as SystemSettings;
      return this.settingsCache;
    } catch (error) {
      console.error("Failed to update system settings:", error);
      throw error;
    }
  }

  clearCache() {
    this.settingsCache = null;
  }

  async shouldShowDailySummary(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.show_daily_summary;
  }

  async listMcpKeys(): Promise<McpApiKey[]> {
    const data = await api.get<{ items: McpApiKey[] }>("/system-settings/mcp-keys");
    return data.items;
  }

  async createMcpKey(name: string): Promise<McpApiKeyCreateResponse> {
    return api.post<McpApiKeyCreateResponse>("/system-settings/mcp-keys", { name });
  }

  async revokeMcpKey(keyId: string): Promise<void> {
    await api.delete(`/system-settings/mcp-keys/${keyId}`);
  }

  async revealMcpKeySecret(keyId: string): Promise<string> {
    const data = await api.get<{ api_key: string }>(`/system-settings/mcp-keys/${keyId}/secret`);
    return data.api_key;
  }
}

export const systemSettingsService = new SystemSettingsService();
