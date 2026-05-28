import { useState } from "react";
import { Alert } from "antd";

const STORAGE_KEY = "fix-life-naming-migration-notice-dismissed";

export function NamingMigrationNotice() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  if (dismissed) {
    return null;
  }

  return (
    <Alert
      type="info"
      showIcon
      closable
      className="mb-4"
      message="命名已统一"
      description={
        <p className="text-sm mb-0">
          产品、REST、MCP 均已使用 <strong>每日进度</strong> 命名（<code>/daily-progress</code>、
          <code>daily_progress</code>、<code>daily_progress_day_id</code> / <code>daily_progress_entries</code>
          ）。旧字段与兼容层已移除。
        </p>
      }
      onClose={() => {
        setDismissed(true);
        try {
          localStorage.setItem(STORAGE_KEY, "1");
        } catch {
          // ignore
        }
      }}
    />
  );
}
