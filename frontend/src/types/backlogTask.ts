import type { TaskContext } from "./taskContext";
import type { TaskPriority } from "./taskPriority";

export type BacklogTaskStatus =
  | "pending"
  | "in_progress"
  | "scheduled"
  | "done"
  | "cancelled";

/** Status selectable in create/edit forms (maps to kanban columns via progress). */
export type TaskFormStatus = "pending" | "in_progress" | "done";

/** @deprecated Use TaskFormStatus */
export type TodoFormStatus = TaskFormStatus;

export type KanbanColumnId = "pending" | "in_progress" | "done";

export const PROGRESS_PRESETS = [0, 25, 50, 75, 100] as const;

export type ProgressPreset = (typeof PROGRESS_PRESETS)[number];

export interface BacklogTask {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  context: TaskContext;
  priority: TaskPriority;
  status: BacklogTaskStatus;
  progress: number;
  origin?: string;
  scheduled_date?: string;
  daily_task_id?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  occurrence_count?: number;
  is_scheduled?: boolean;
  last_plan_date?: string;
  linked_dates?: string[];
  possible_duplicate_count?: number;
}

export interface BacklogOccurrence {
  daily_task_id: string;
  daily_progress_day_id?: string;
  plan_date: string;
  daily_status?: "todo" | "in-progress" | "done" | "cancelled";
  daily_title?: string;
  progress_after?: number;
  progress_delta?: number;
  created_at: string;
}

export interface BacklogTaskDetail extends BacklogTask {
  occurrences: BacklogOccurrence[];
}

export interface BacklogTaskCreate {
  title: string;
  description?: string;
  context?: TaskContext;
  priority?: TaskPriority;
  progress?: number;
}

export interface BacklogTaskUpdate {
  title?: string;
  description?: string;
  context?: TaskContext;
  priority?: TaskPriority;
  progress?: number;
  status?: BacklogTaskStatus;
  /** When progress changes, record snapshot on this plan date's daily link */
  progress_plan_date?: string;
}

export type BacklogTab = "pending" | "in_progress" | "done" | "active";

export type BacklogContextFilter = TaskContext | "all";

export type BacklogPriorityFilter = TaskPriority | "all";

export type BacklogTimeField = "created" | "scheduled" | "completed";

export interface BacklogListFilters {
  q?: string;
  context?: BacklogContextFilter;
  priority?: BacklogPriorityFilter;
  timeField?: BacklogTimeField;
  dateFrom?: string;
  dateTo?: string;
}

export function formStatusToProgress(status: TaskFormStatus, progress = 50): number {
  if (status === "pending") return 0;
  if (status === "done") return 100;
  if (progress > 0 && progress < 100) return progress;
  return 50;
}

export function progressToFormStatus(
  progress: number,
  status?: BacklogTask["status"]
): TaskFormStatus {
  if (status === "done" || progress === 100) return "done";
  if (status === "in_progress") return "in_progress";
  if (progress === 0) return "pending";
  return "in_progress";
}

export function applyStatusChange(status: TaskFormStatus, currentProgress = 0): number {
  if (status === "pending") return 0;
  if (status === "done") return 100;
  if (currentProgress > 0 && currentProgress < 100) return currentProgress;
  return 50;
}

export function progressForDrag(
  from: KanbanColumnId,
  to: KanbanColumnId,
  currentProgress: number
): number {
  if (to === "pending") return 0;
  if (to === "done") return 100;
  if (from === "done") return 50;
  if (from === "pending") return 0;
  if (currentProgress > 0 && currentProgress < 100) return currentProgress;
  return 0;
}

export function kanbanColumnForTask(task: BacklogTask): KanbanColumnId {
  return progressToFormStatus(task.progress ?? 0, task.status);
}

export function formStatusLabel(status: TaskFormStatus): string {
  if (status === "pending") return "待处理";
  if (status === "in_progress") return "处理中";
  return "已完成";
}

export function formatLinkedDates(task: BacklogTask): string | null {
  const count = task.occurrence_count ?? 0;
  if (count === 0) return null;
  const dates = task.linked_dates ?? [];
  if (dates.length === 0 && task.last_plan_date) {
    return dayjsFormatShort(task.last_plan_date);
  }
  const formatted = dates.map(dayjsFormatShort).join(" · ");
  if (count > dates.length) {
    return `${formatted}（${count} 天）`;
  }
  return `${formatted}（${count} 天）`;
}

function dayjsFormatShort(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export type DailyProgressChoice = "keep" | number;
