const TASK_CONTEXT = [
  { value: "work", label: "工作", color: "#DC2626" },
  { value: "learning", label: "学习", color: "#8B5CF6" },
  { value: "life", label: "生活", color: "#EC4899" },
];

const TASK_PRIORITY = [
  { value: "low", label: "低", color: "#10B981" },
  { value: "medium", label: "中", color: "#F59E0B" },
  { value: "high", label: "高", color: "#EF4444" },
];

const BACKLOG_TABS = [
  { value: "pending", label: "待处理" },
  { value: "in_progress", label: "进行中" },
  { value: "done", label: "已完成" },
];

const ENTRY_STATUS = [
  { value: "todo", label: "待办" },
  { value: "in-progress", label: "进行中" },
  { value: "done", label: "完成" },
  { value: "cancelled", label: "取消" },
];

const GOAL_CATEGORIES = [
  { value: "health", label: "健康", color: "#10B981" },
  { value: "career", label: "事业", color: "#3B82F6" },
  { value: "learning", label: "学习", color: "#8B5CF6" },
  { value: "finance", label: "财务", color: "#F59E0B" },
  { value: "relationship", label: "人际关系", color: "#EC4899" },
  { value: "entertainment", label: "娱乐", color: "#06B6D4" },
];

const GOAL_STATUS = [
  { value: "pending", label: "未开始", color: "#9CA3AF" },
  { value: "in-progress", label: "进行中", color: "#3B82F6" },
  { value: "completed", label: "已完成", color: "#10B981" },
  { value: "paused", label: "已暂停", color: "#F59E0B" },
];

const PROGRESS_PRESETS = [0, 25, 50, 75, 100];

const PERM_QUICK_NOTES = "quick_notes:use";
const PERM_USERS_MANAGE = "users:manage";
const PERM_SYSTEM_STATUS = "system_status:read";

const CHECK_LABELS = {
  postgres: "PostgreSQL",
  redis_broker: "Redis（Broker）",
  redis_result_backend: "Redis（Result）",
  celery_worker: "Celery Worker",
  celery_beat: "Celery Beat",
};

module.exports = {
  TASK_CONTEXT,
  TASK_PRIORITY,
  BACKLOG_TABS,
  ENTRY_STATUS,
  GOAL_CATEGORIES,
  GOAL_STATUS,
  PROGRESS_PRESETS,
  PERM_QUICK_NOTES,
  PERM_USERS_MANAGE,
  PERM_SYSTEM_STATUS,
  CHECK_LABELS,
  DEFAULT_CONTEXT: "learning",
  DEFAULT_PRIORITY: "medium",
};
