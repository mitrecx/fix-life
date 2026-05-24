import type { TaskContext } from "./taskContext";
import type { TaskPriority } from "./taskPriority";

export type BacklogTaskStatus = "pending" | "scheduled" | "done" | "cancelled";

export interface BacklogTask {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  context: TaskContext;
  priority: TaskPriority;
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
  priority?: TaskPriority;
}

export interface BacklogTaskUpdate {
  title?: string;
  description?: string;
  context?: TaskContext;
  priority?: TaskPriority;
}

export type BacklogTab = "active" | "done";

export type BacklogContextFilter = TaskContext | "all";

export type BacklogTimeField = "created" | "scheduled" | "completed";

export interface BacklogListFilters {
  q?: string;
  context?: BacklogContextFilter;
  timeField?: BacklogTimeField;
  dateFrom?: string;
  dateTo?: string;
}
