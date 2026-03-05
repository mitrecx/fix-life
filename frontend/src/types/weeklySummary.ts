export interface DailySummaryData {
  date: string;
  plan_id: string | null;
  title: string | null;
  total_tasks: number;
  completed_tasks: number;
  completion_rate: number;
  daily_summary: {
    summary_type: string;
    content: string;
  } | null;
}

export interface PriorityDistribution {
  total: number;
  completed: number;
}

export interface WeeklySummaryStats {
  daily_data: DailySummaryData[];
  priority_distribution: Record<string, PriorityDistribution>;
  task_trend: Array<{ date: string; completion_rate: number }>;
}

export interface WeeklySummary {
  id: string;
  user_id: string;
  year: number;
  week_number: number;
  start_date: string;
  end_date: string;
  stats: WeeklySummaryStats;
  summary_text: string | null;
  total_tasks: number;
  completed_tasks: number;
  completion_rate: number;
  created_at: string;
  updated_at: string;
  auto_generated: string | null;
}

export interface WeeklySummaryCreate {
  year: number;
  week_number: number;
  start_date: string;
  end_date: string;
  summary_text?: string;
}

export interface WeeklySummaryUpdate {
  summary_text?: string;
}

export interface WeeklySummaryListResponse {
  summaries: WeeklySummary[];
  total: number;
}

export interface WeeklySummaryGenerateRequest {
  year?: number;
  week_number?: number;
  force_regenerate?: boolean;
}
