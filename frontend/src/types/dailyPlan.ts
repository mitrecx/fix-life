export type DailyTaskPriority = "low" | "medium" | "high";

export type DailyTaskStatus = "todo" | "in-progress" | "done" | "cancelled";

export interface DailyTask {
  id: string;
  daily_plan_id: string;
  title: string;
  description?: string;
  priority: DailyTaskPriority;
  status: DailyTaskStatus;
  estimated_minutes?: number;
  actual_minutes: number;
  time_slot?: string;
  created_at: string;
  updated_at: string;
}

export interface DailyTaskCreate {
  title: string;
  description?: string;
  priority?: DailyTaskPriority;
  status?: DailyTaskStatus;
  estimated_minutes?: number;
  time_slot?: string;
}

export interface DailyTaskUpdate {
  title?: string;
  description?: string;
  priority?: DailyTaskPriority;
  status?: DailyTaskStatus;
  estimated_minutes?: number;
  actual_minutes?: number;
  time_slot?: string;
}

/** Lightweight row from GET /daily-plans/by-date/{date} (no tasks). */
export interface DailyPlanHead {
  id: string;
  user_id: string;
  monthly_plan_id?: string;
  plan_date: string;
  title?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DailyPlan {
  id: string;
  user_id: string;
  monthly_plan_id?: string;
  plan_date: string;
  title?: string;
  notes?: string;
  total_tasks: number;
  completed_tasks: number;
  completion_rate: number;
  daily_tasks: DailyTask[];
  daily_summary?: DailySummaryInPlan;
  created_at: string;
  updated_at: string;
}

export interface DailySummaryInPlan {
  id: string;
  daily_plan_id: string;
  user_id: string;
  summary_type: "daily" | "small" | "large";
  content: string;
  created_at: string;
  updated_at: string;
}

export interface DailyPlanCreate {
  plan_date: string;
  title?: string;
  notes?: string;
  monthly_plan_id?: string;
}

export interface DailyPlanUpdate {
  title?: string;
  notes?: string;
}

export const DAILY_TASK_PRIORITY: { value: DailyTaskPriority; label: string; color: string }[] = [
  { value: "low", label: "低", color: "#10B981" },
  { value: "medium", label: "中", color: "#F59E0B" },
  { value: "high", label: "高", color: "#EF4444" },
];

export const DAILY_TASK_STATUS: { value: DailyTaskStatus; label: string; color: string }[] = [
  { value: "todo", label: "待办", color: "#9CA3AF" },
  { value: "in-progress", label: "进行中", color: "#3B82F6" },
  { value: "done", label: "已完成", color: "#10B981" },
  { value: "cancelled", label: "已取消", color: "#EF4444" },
];

export const TIME_SLOTS: { value: string; label: string }[] = [
  { value: "morning", label: "早上" },
  { value: "forenoon", label: "上午" },
  { value: "noon", label: "中午" },
  { value: "afternoon", label: "下午" },
  { value: "evening", label: "晚上" },
  { value: "night", label: "深夜" },
];
