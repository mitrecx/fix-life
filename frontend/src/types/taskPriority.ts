export type TaskPriority = "high" | "medium" | "low";

export const TASK_PRIORITY: { value: TaskPriority; label: string; color: string }[] = [
  { value: "high", label: "高", color: "#EF4444" },
  { value: "medium", label: "中", color: "#F59E0B" },
  { value: "low", label: "低", color: "#9CA3AF" },
];

export const DEFAULT_TASK_PRIORITY: TaskPriority = "medium";

const PRIORITY_RANK: Record<TaskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export function getTaskPriorityConfig(priority: TaskPriority) {
  return TASK_PRIORITY.find((p) => p.value === priority);
}

export function compareTaskPriority(a: TaskPriority, b: TaskPriority): number {
  return PRIORITY_RANK[a] - PRIORITY_RANK[b];
}
