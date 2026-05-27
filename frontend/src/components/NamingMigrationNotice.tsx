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
      message="命名迁移说明"
      description={
        <ul className="list-disc pl-4 space-y-1 text-sm mb-0">
          <li>
            页面与 API 已统一为 <strong>每日进度</strong>（路径 <code>/daily-progress</code>）；旧路径{" "}
            <code>/daily-plans</code> 已移除。
          </li>
          <li>
            MCP 请使用 <code>daily_progress</code>；<code>daily</code> 已弃用，计划约 2026-08-22 移除。
          </li>
          <li>
            日总结请用 <code>reflect</code> 的 <code>get_daily_summary</code> 等 action（旧{" "}
            <code>get_daily</code> 等同样计划移除）。
          </li>
        </ul>
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
