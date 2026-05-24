import { Switch } from "antd";
import { useSettingsContext } from "@/contexts/SettingsContext";

export default function SettingsDisplayPage() {
  const { settings, setSettings, isSaving } = useSettingsContext();

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">显示设置</h2>
        <p className="text-sm text-gray-500">自定义应用的基本显示和行为</p>
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
  );
}
