import api from ".//api";
import type { SystemSettings } from "@/types/systemSettings";
import { DEFAULT_SYSTEM_SETTINGS } from "@/types/systemSettings";

class SystemSettingsService {
  private settingsCache: SystemSettings | null = null;

  async getSettings(): Promise<SystemSettings> {
    if (this.settingsCache) {
      return this.settingsCache;
    }

    try {
      const data = await api.get<any>("/system-settings/me");
      this.settingsCache = data as SystemSettings;
      return this.settingsCache;
    } catch (error) {
      console.error("Failed to fetch system settings:", error);
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
}

export const systemSettingsService = new SystemSettingsService();
