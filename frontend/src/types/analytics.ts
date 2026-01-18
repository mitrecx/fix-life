/** Dashboard statistics */
export interface DashboardStats {
  total_goals: number;
  active_goals: number;
  completed_goals: number;
  total_monthly_plans: number;
  total_daily_plans: number;
  total_tasks: number;
  completed_tasks: number;
  overall_completion_rate: number;
}

/** Goal category statistics */
export interface GoalCategoryStats {
  category: string;
  count: number;
  completed: number;
  completion_rate: number;
}

/** Monthly progress data point */
export interface MonthlyProgressData {
  month: number;
  total: number;
  completed: number;
}

/** Yearly statistics */
export interface YearlyStats {
  year: number;
  total_goals: number;
  goal_completion_rate: number;
  category_stats: GoalCategoryStats[];
  monthly_progress: MonthlyProgressData[];
  total_plans: number;
  total_tasks: number;
  completed_tasks: number;
  task_completion_rate: number;
}

/** Daily completion data point */
export interface DailyCompletionData {
  day: number;
  total: number;
  completed: number;
  rate: number;
}

/** Priority distribution data point */
export interface PriorityDistribution {
  priority: string;
  count: number;
}

/** Weekly comparison data point */
export interface WeeklyComparison {
  week: number;
  total: number;
  completed: number;
  rate: number;
}

/** Monthly statistics */
export interface MonthlyStats {
  year: number;
  month: number;
  total_plans: number;
  total_daily_plans: number;
  total_tasks: number;
  completed_tasks: number;
  task_completion_rate: number;
  daily_completion_data: DailyCompletionData[];
  priority_distribution: PriorityDistribution[];
  weekly_comparison: WeeklyComparison[];
}

/** Completion rate trend data point */
export interface CompletionRateDataPoint {
  date?: string;
  week?: number;
  month?: number;
  year?: number;
  start_date?: string;
  end_date?: string;
  rate: number;
}

/** Completion rate trend */
export interface CompletionRateTrend {
  period: string;
  start_date: string;
  end_date: string;
  data: CompletionRateDataPoint[];
  average_rate: number;
  trend: "up" | "down" | "stable";
}

/** Heatmap data point */
export interface HeatmapDataPoint {
  date: string;
  value: number;
  level: "none" | "low" | "medium" | "high";
  total: number;
  completed: number;
}

/** Heatmap data */
export interface HeatmapData {
  start_date: string;
  end_date: string;
  data: HeatmapDataPoint[];
}
