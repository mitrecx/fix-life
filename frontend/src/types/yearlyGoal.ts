export type GoalCategory =
  | "health"
  | "career"
  | "learning"
  | "finance"
  | "relationship"
  | "entertainment";

export type GoalStatus = "pending" | "in-progress" | "completed" | "paused";

export interface MonthlyMilestone {
  id?: string;
  month: number;
  target_value: number;
  achieved_value: number;
  note?: string;
}

export interface YearlyGoal {
  id: string;
  user_id: string;
  year: number;
  title: string;
  description?: string;
  category: GoalCategory;
  color: string;
  target_value: number;
  current_value: number;
  unit?: string;
  status: GoalStatus;
  start_date?: string;
  end_date?: string;
  completion_rate: number;
  milestones: MonthlyMilestone[];
  created_at: string;
  updated_at: string;
}

export interface YearlyGoalCreate {
  year: number;
  title: string;
  description?: string;
  category: GoalCategory;
  color?: string;
  target_value: number;
  unit?: string;
  start_date?: string;
  end_date?: string;
  auto_generate_milestones?: boolean;
}

export interface YearlyGoalUpdate {
  title?: string;
  description?: string;
  color?: string;
  target_value?: number;
  status?: GoalStatus;
  end_date?: string;
}

export interface ProgressUpdate {
  progress: number;
  month?: number;
  note?: string;
}

export const GOAL_CATEGORIES: { value: GoalCategory; label: string; color: string }[] = [
  { value: "health", label: "健康", color: "#10B981" },
  { value: "career", label: "事业", color: "#3B82F6" },
  { value: "learning", label: "学习", color: "#8B5CF6" },
  { value: "finance", label: "财务", color: "#F59E0B" },
  { value: "relationship", label: "人际关系", color: "#EC4899" },
  { value: "entertainment", label: "娱乐", color: "#06B6D4" },
];

export const GOAL_STATUS: { value: GoalStatus; label: string; color: string }[] = [
  { value: "pending", label: "未开始", color: "#9CA3AF" },
  { value: "in-progress", label: "进行中", color: "#3B82F6" },
  { value: "completed", label: "已完成", color: "#10B981" },
  { value: "paused", label: "已暂停", color: "#F59E0B" },
];
