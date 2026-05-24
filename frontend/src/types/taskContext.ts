export type TaskContext = "work" | "learning" | "life";

export const TASK_CONTEXT: { value: TaskContext; label: string; color: string }[] = [
  { value: "work", label: "工作", color: "#DC2626" },
  { value: "learning", label: "学习", color: "#8B5CF6" },
  { value: "life", label: "生活", color: "#EC4899" },
];

export const DEFAULT_TASK_CONTEXT: TaskContext = "learning";

export function getTaskContextConfig(context: TaskContext) {
  return TASK_CONTEXT.find((c) => c.value === context);
}
