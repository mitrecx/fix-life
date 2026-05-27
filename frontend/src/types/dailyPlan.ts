/** @deprecated Import from `@/types/dailyProgress` instead. */
export type {
  DailyProgressDay as DailyPlan,
  DailyProgressDayHead as DailyPlanHead,
  DailyProgressDayCreate as DailyPlanCreate,
  DailyProgressDayUpdate as DailyPlanUpdate,
  DailyProgressEntryAdd as DailyPlanTaskAdd,
  DailyProgressEntry as DailyTask,
  DailyProgressEntryUpdate as DailyTaskUpdate,
} from "./dailyProgress";

export {
  DAILY_TASK_PRIORITY,
  DAILY_TASK_STATUS,
  TIME_SLOTS,
  type DailyTaskCreate,
  type DailyTaskPriority,
  type DailyTaskStatus,
  type DailySummaryInPlan,
  type TaskContext,
} from "./dailyProgress";
