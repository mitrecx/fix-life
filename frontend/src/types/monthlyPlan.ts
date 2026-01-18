export type TaskPriority = "low" | "medium" | "high";

export type TaskStatus = "todo" | "in-progress" | "done" | "cancelled";

export interface MonthlyTask {
  id: string;
  monthly_plan_id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  due_date?: string;
  estimated_hours?: number;
  actual_hours: number;
  created_at: string;
  updated_at: string;
}

export interface MonthlyTaskCreate {
  title: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  due_date?: string;
  estimated_hours?: number;
}

export interface MonthlyTaskUpdate {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  due_date?: string;
  estimated_hours?: number;
  actual_hours?: number;
}

export interface MonthlyPlan {
  id: string;
  user_id: string;
  yearly_goal_id?: string;
  year: number;
  month: number;
  title?: string;
  focus_areas: string[];
  notes?: string;
  total_tasks: number;
  completed_tasks: number;
  completion_rate: number;
  monthly_tasks: MonthlyTask[];
  created_at: string;
  updated_at: string;
}

export interface MonthlyPlanCreate {
  year: number;
  month: number;
  title?: string;
  focus_areas?: string[];
  notes?: string;
  yearly_goal_id?: string;
}

export interface MonthlyPlanUpdate {
  title?: string;
  focus_areas?: string[];
  notes?: string;
}

export const TASK_PRIORITY: { value: TaskPriority; label: string; color: string }[] = [
  { value: "low", label: "低", color: "#10B981" },
  { value: "medium", label: "中", color: "#F59E0B" },
  { value: "high", label: "高", color: "#EF4444" },
];

export const TASK_STATUS: { value: TaskStatus; label: string; color: string }[] = [
  { value: "todo", label: "待办", color: "#9CA3AF" },
  { value: "in-progress", label: "进行中", color: "#3B82F6" },
  { value: "done", label: "已完成", color: "#10B981" },
  { value: "cancelled", label: "已取消", color: "#EF4444" },
];
