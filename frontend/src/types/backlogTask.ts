import type { TaskContext } from "./taskContext";

export type BacklogTaskStatus = "pending" | "scheduled" | "done" | "cancelled";

export interface BacklogTask {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  context: TaskContext;
  status: BacklogTaskStatus;
  scheduled_date?: string;
  daily_task_id?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface BacklogTaskCreate {
  title: string;
  description?: string;
  context?: TaskContext;
}

export interface BacklogTaskUpdate {
  title?: string;
  description?: string;
  context?: TaskContext;
}

export type BacklogTab = "active" | "done";

export type BacklogContextFilter = TaskContext | "all";
