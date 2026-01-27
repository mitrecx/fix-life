import { useState, useEffect } from "react";
import { Settings, Loader2 } from "lucide-react";
import { Switch, message } from "antd";
import { systemSettingsService } from "@/services/systemSettingsService";
import type { SystemSettings } from "@/types/systemSettings";

interface SystemSettingsModalProps {
  onClose: () => void;
}

export function SystemSettingsModal({ onClose }: SystemSettingsModalProps) {
  const [settings, setSettings] = useState<SystemSettings>({
    show_daily_summary: false,
  });
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
      message.success("设置已保存");
      onClose();
    } catch (error) {
      console.error("Failed to save system settings:", error);
      message.error("保存设置失败");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-indigo-50 to-purple-50 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
              <Settings className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">系统设置</h2>
              <p className="text-sm text-gray-500 mt-0.5">自定义您的使用体验</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
          ) : (
            <>
              {/* 显示每日总结 */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-gray-800 mb-1">在日计划卡片中显示每日总结</h3>
                  <p className="text-xs text-gray-500">
                    开启后，每日总结会显示在每个日计划卡片的最下方
                  </p>
                </div>
                <Switch
                  checked={settings.show_daily_summary}
                  onChange={(checked) =>
                    setSettings({ ...settings, show_daily_summary: checked })
                  }
                  disabled={isSaving}
                  className="ml-4"
                />
              </div>

              {/* 提示信息 */}
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-sm text-blue-700">
                  💡 提示：系统设置会自动保存到您的账户，在任何设备上登录都会保持一致。
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-6 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                保存中...
              </>
            ) : (
              "保存设置"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
