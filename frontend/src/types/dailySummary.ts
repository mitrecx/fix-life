export type SummaryType = "daily" | "small" | "large";

export interface DailySummary {
  id: string;
  daily_plan_id: string;
  user_id: string;
  summary_type: SummaryType;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface DailySummaryCreate {
  summary_type: SummaryType;
  content: string;
}

export interface DailySummaryUpdate {
  summary_type?: SummaryType;
  content?: string;
}

export const SUMMARY_TYPE_OPTIONS: Array<{
  value: SummaryType;
  label: string;
  description: string;
}> = [
  {
    value: "daily",
    label: "日常总结",
    description: "记录当天的主要收获和感想",
  },
  {
    value: "small",
    label: "小总结",
    description: "阶段性回顾和总结",
  },
  {
    value: "large",
    label: "大总结",
    description: "深度反思和长期规划",
  },
];
