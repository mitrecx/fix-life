import { useState, useEffect, useCallback, useMemo } from "react";
import { Trash2, Calendar as CalendarIcon, SquarePen, Plus, CheckSquare, X } from "lucide-react";
import { Calendar, Modal, message, Select } from "antd";
import type { CalendarProps } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useSearchParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { backlogTaskService } from "@/services/backlogTaskService";
import { TodosFilterBar } from "@/components/TodosFilterBar";
import { TaskFormPanel, taskFormStatusLabel } from "@/components/TaskFormPanel";
import type {
  BacklogTask,
  BacklogTaskDetail,
  BacklogOccurrence,
  BacklogListFilters,
  BacklogContextFilter,
  BacklogPriorityFilter,
  TaskFormStatus,
  KanbanColumnId,
} from "@/types/backlogTask";
import {
  applyStatusChange,
  progressToFormStatus,
  kanbanColumnForTask,
  progressForDrag,
  formatLinkedDates,
} from "@/types/backlogTask";
import type { TaskContext } from "@/types/taskContext";
import {
  DEFAULT_TASK_CONTEXT,
  getTaskContextConfig,
} from "@/types/taskContext";
import {
  TASK_PRIORITY,
  DEFAULT_TASK_PRIORITY,
  getTaskPriorityConfig,
  compareTaskPriority,
} from "@/types/taskPriority";
import type { TaskPriority } from "@/types/taskPriority";

const COLUMNS: { id: KanbanColumnId; title: string; accent: string }[] = [
  { id: "pending", title: "待办", accent: "border-t-blue-500" },
  { id: "in_progress", title: "处理中", accent: "border-t-amber-500" },
  { id: "done", title: "已完成", accent: "border-t-emerald-500" },
];

const DEFAULT_FILTERS: BacklogListFilters = {
  q: "",
  context: "all",
  priority: "all",
  timeField: "created",
};

function sortColumnTasks(tasks: BacklogTask[], column: KanbanColumnId): BacklogTask[] {
  const sorted = [...tasks];
  sorted.sort((a, b) => {
    if (column === "done") {
      const byCompleted =
        dayjs(b.completed_at ?? b.updated_at).valueOf() -
        dayjs(a.completed_at ?? a.updated_at).valueOf();
      if (byCompleted !== 0) return byCompleted;
      return dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf();
    }
    const byPriority = compareTaskPriority(a.priority, b.priority);
    if (byPriority !== 0) return byPriority;
    if (column === "in_progress") {
      return (b.progress ?? 0) - (a.progress ?? 0);
    }
    if (a.is_scheduled && b.is_scheduled && a.last_plan_date && b.last_plan_date) {
      return dayjs(a.last_plan_date).valueOf() - dayjs(b.last_plan_date).valueOf();
    }
    return dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf();
  });
  return sorted;
}

function parseFilters(params: URLSearchParams): BacklogListFilters {
  const rawContext = params.get("context");
  const context: BacklogContextFilter =
    rawContext === "work" || rawContext === "learning" || rawContext === "life"
      ? rawContext
      : "all";

  const rawPriority = params.get("priority");
  const priority: BacklogPriorityFilter =
    rawPriority === "high" || rawPriority === "medium" || rawPriority === "low"
      ? rawPriority
      : "all";

  return {
    q: params.get("q") ?? "",
    context,
    priority,
    timeField: backlogTaskService.parseTimeField(params.get("time_field")),
    dateFrom: params.get("date_from") ?? undefined,
    dateTo: params.get("date_to") ?? undefined,
  };
}

function filtersToSearchParams(filters: BacklogListFilters): URLSearchParams {
  const params = new URLSearchParams();
  const q = filters.q?.trim();
  if (q) params.set("q", q);
  if (filters.context && filters.context !== "all") params.set("context", filters.context);
  if (filters.priority && filters.priority !== "all") params.set("priority", filters.priority);
  if (backlogTaskService.hasTimeRangeFilter(filters)) {
    params.set("time_field", filters.timeField ?? "created");
    if (filters.dateFrom) params.set("date_from", filters.dateFrom);
    if (filters.dateTo) params.set("date_to", filters.dateTo);
  }
  return params;
}

function taskDateForField(task: BacklogTask, field: NonNullable<BacklogListFilters["timeField"]>): string | undefined {
  if (field === "scheduled") return task.scheduled_date ?? task.last_plan_date;
  if (field === "completed") return task.completed_at;
  return task.created_at;
}

function taskMatchesFilters(task: BacklogTask, filters: BacklogListFilters): boolean {
  const q = filters.q?.trim().toLowerCase();
  if (q && !task.title.toLowerCase().includes(q)) return false;

  if (filters.context && filters.context !== "all" && task.context !== filters.context) {
    return false;
  }

  if (filters.priority && filters.priority !== "all" && task.priority !== filters.priority) {
    return false;
  }

  if (!backlogTaskService.hasTimeRangeFilter(filters)) return true;

  const timeField = filters.timeField ?? "created";
  const raw = taskDateForField(task, timeField);
  if (!raw) return false;

  const d = dayjs(raw).format("YYYY-MM-DD");
  if (filters.dateFrom && d < filters.dateFrom) return false;
  if (filters.dateTo && d > filters.dateTo) return false;
  return true;
}

function formatRelativeTime(dateStr: string) {
  const date = dayjs(dateStr);
  const diffDays = dayjs().diff(date, "day");
  if (diffDays === 0) return "今天";
  if (diffDays === 1) return "昨天";
  if (diffDays < 7) return `${diffDays} 天前`;
  return date.format("M月D日");
}

function formatDateTime(dateStr: string) {
  return dayjs(dateStr).format("YYYY/M/D");
}

function progressForColumn(column: KanbanColumnId, from: KanbanColumnId, current: number): number {
  return progressForDrag(from, column, current);
}

const DAILY_STATUS_LABELS: Record<string, string> = {
  todo: "待办",
  "in-progress": "进行中",
  done: "已完成",
  cancelled: "已取消",
};

function OccurrenceTimeline({
  occurrences,
  onNavigate,
}: {
  occurrences: BacklogOccurrence[];
  onNavigate: (occ: BacklogOccurrence) => void;
}) {
  if (occurrences.length === 0) {
    return <p className="text-xs text-gray-400 py-2">暂无每日进度记录</p>;
  }
  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <table className="w-full text-xs">
        <thead className="bg-gray-50 text-gray-500">
          <tr>
            <th className="text-left font-medium px-3 py-2">日期</th>
            <th className="text-left font-medium px-3 py-2">当天状态</th>
            <th className="text-right font-medium px-3 py-2">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {occurrences.map((occ) => (
            <tr key={occ.daily_task_id} className="hover:bg-gray-50">
              <td className="px-3 py-2 text-gray-800">{occ.plan_date}</td>
              <td className="px-3 py-2 text-gray-600">
                {DAILY_STATUS_LABELS[occ.daily_status ?? "todo"] ?? occ.daily_status}
              </td>
              <td className="px-3 py-2 text-right">
                <button
                  type="button"
                  onClick={() => onNavigate(occ)}
                  className="text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  跳转
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface KanbanCardProps {
  task: BacklogTask;
  column: KanbanColumnId;
  draggable: boolean;
  selectionMode: boolean;
  selected: boolean;
  onToggleSelect: (task: BacklogTask) => void;
  onDragStart: (task: BacklogTask, from: KanbanColumnId) => void;
  onSchedule: (task: BacklogTask) => void;
  onPriorityChange: (task: BacklogTask, priority: TaskPriority) => void;
  onView: (task: BacklogTask) => void;
  onEdit: (task: BacklogTask) => void;
  onDelete: (task: BacklogTask) => void;
}

function KanbanCard({
  task,
  column,
  draggable,
  selectionMode,
  selected,
  onToggleSelect,
  onDragStart,
  onSchedule,
  onPriorityChange,
  onView,
  onEdit,
  onDelete,
}: KanbanCardProps) {
  const contextConfig = getTaskContextConfig(task.context);
  const priorityConfig = getTaskPriorityConfig(task.priority);
  const isScheduled = task.is_scheduled ?? false;

  return (
    <div
      draggable={draggable && !selectionMode}
      onDragStart={(e) => {
        if (selectionMode) return;
        e.dataTransfer.effectAllowed = "move";
        onDragStart(task, column);
      }}
      className={`group bg-white rounded-md border p-2.5 hover:border-gray-300 transition-all ${
        selectionMode ? "cursor-pointer" : draggable ? "cursor-grab active:cursor-grabbing" : ""
      } ${selected ? "border-indigo-400 bg-indigo-50/40 ring-1 ring-indigo-200" : "border-gray-200"}`}
      onClick={() => {
        if (selectionMode) onToggleSelect(task);
      }}
    >
      <div className="flex items-start gap-1.5">
        {selectionMode && (
          <input
            type="checkbox"
            checked={selected}
            readOnly
            className="mt-0.5 shrink-0 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 pointer-events-none"
          />
        )}
        <div
          className={`flex-1 min-w-0 ${selectionMode ? "" : "cursor-pointer"}`}
          onClick={(e) => {
            if (!selectionMode) {
              e.stopPropagation();
              onView(task);
            }
          }}
        >
          <p
            className={`text-sm leading-snug break-words hover:text-gray-600 ${
              column === "done" ? "text-gray-500 hover:text-gray-400" : "text-gray-800"
            }`}
          >
            {task.title}
          </p>
          <div className="flex items-center flex-wrap gap-1 mt-1.5">
            {priorityConfig && column !== "done" && (
              <button
                type="button"
                title="点击切换优先级"
                onClick={(e) => {
                  e.stopPropagation();
                  const idx = TASK_PRIORITY.findIndex((p) => p.value === task.priority);
                  const next = TASK_PRIORITY[(idx + 1) % TASK_PRIORITY.length].value;
                  onPriorityChange(task, next);
                }}
                className="text-[10px] px-1 py-0.5 rounded font-medium hover:opacity-80"
                style={{
                  backgroundColor: `${priorityConfig.color}18`,
                  color: priorityConfig.color,
                }}
              >
                {priorityConfig.label}
              </button>
            )}
            {priorityConfig && column === "done" && (
              <span
                className="text-[10px] px-1 py-0.5 rounded font-medium opacity-60"
                style={{
                  backgroundColor: `${priorityConfig.color}12`,
                  color: priorityConfig.color,
                }}
              >
                {priorityConfig.label}
              </span>
            )}
            {contextConfig && (
              <span
                className="text-[10px] px-1 py-0.5 rounded font-medium"
                style={{
                  backgroundColor: `${contextConfig.color}12`,
                  color: contextConfig.color,
                }}
              >
                {contextConfig.label}
              </span>
            )}
            {isScheduled && task.last_plan_date && column !== "done" && (
              <span className="text-[10px] text-blue-600 font-medium">
                已安排 {dayjs(task.last_plan_date).format("M月D日")}
              </span>
            )}
            {(task.possible_duplicate_count ?? 0) > 0 && column !== "done" && (
              <span className="text-[10px] text-rose-600 font-medium">可能重复</span>
            )}
            {column === "in_progress" && (
              <>
                <div className="w-full mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
                <span className="text-[10px] text-amber-600 font-medium">{task.progress}%</span>
              </>
            )}
            {(column === "pending" || column === "in_progress") && formatLinkedDates(task) && (
              <span className="text-[10px] text-gray-400">📅 {formatLinkedDates(task)}</span>
            )}
            {column === "pending" && !isScheduled && (
              <span className="text-[10px] text-gray-400">{formatRelativeTime(task.created_at)}</span>
            )}
            {column === "done" && task.completed_at && (
              <span className="text-[10px] text-gray-400">{formatDateTime(task.completed_at)}</span>
            )}
          </div>
        </div>
      </div>

      <div
        className={`flex items-center gap-1 mt-1.5 pt-1 border-t border-gray-100 ${selectionMode ? "pointer-events-none opacity-50" : ""}`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(task);
          }}
          className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] text-indigo-600 hover:bg-indigo-50 rounded"
        >
          <SquarePen size={11} />
          编辑
        </button>
        {column !== "done" && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSchedule(task);
            }}
            className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] text-blue-600 hover:bg-blue-50 rounded"
          >
            <CalendarIcon size={11} />
            安排
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task);
          }}
          className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] text-red-500 hover:bg-red-50 rounded ml-auto"
        >
          <Trash2 size={11} />
          删除
        </button>
      </div>
    </div>
  );
}

function scheduleCalendarHeader({ value, onChange }: Parameters<NonNullable<CalendarProps<Dayjs>["headerRender"]>>[0]) {
  const year = value.year();
  const month = value.month();

  const yearOptions = Array.from({ length: 11 }, (_, i) => {
    const y = year - 5 + i;
    return { label: `${y}年`, value: y };
  });

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    label: `${i + 1}月`,
    value: i,
  }));

  return (
    <div className="flex items-center justify-center gap-2 py-2">
      <Select
        size="small"
        value={year}
        options={yearOptions}
        onChange={(newYear) => onChange(value.year(newYear))}
        style={{ width: 96 }}
      />
      <Select
        size="small"
        value={month}
        options={monthOptions}
        onChange={(newMonth) => onChange(value.month(newMonth))}
        style={{ width: 80 }}
      />
    </div>
  );
}

export function TodosList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const [debouncedQ, setDebouncedQ] = useState(filters.q ?? "");

  const [pendingTasks, setPendingTasks] = useState<BacklogTask[]>([]);
  const [inProgressTasks, setInProgressTasks] = useState<BacklogTask[]>([]);
  const [doneTasks, setDoneTasks] = useState<BacklogTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formContext, setFormContext] = useState<TaskContext>(DEFAULT_TASK_CONTEXT);
  const [formPriority, setFormPriority] = useState<TaskPriority>(DEFAULT_TASK_PRIORITY);
  const [formStatus, setFormStatus] = useState<TaskFormStatus>("pending");
  const [formProgress, setFormProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [schedulingTask, setSchedulingTask] = useState<BacklogTask | null>(null);
  const [viewingTask, setViewingTask] = useState<BacklogTask | null>(null);
  const [detailEditing, setDetailEditing] = useState(false);
  const [detailTitle, setDetailTitle] = useState("");
  const [detailContext, setDetailContext] = useState<TaskContext>(DEFAULT_TASK_CONTEXT);
  const [detailPriority, setDetailPriority] = useState<TaskPriority>(DEFAULT_TASK_PRIORITY);
  const [detailDescription, setDetailDescription] = useState("");
  const [detailStatus, setDetailStatus] = useState<TaskFormStatus>("pending");
  const [detailProgress, setDetailProgress] = useState(0);
  const [taskDetail, setTaskDetail] = useState<BacklogTaskDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<Dayjs>(dayjs());
  const [dragging, setDragging] = useState<{ task: BacklogTask; from: KanbanColumnId } | null>(null);
  const [dropTarget, setDropTarget] = useState<KanbanColumnId | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQ(filters.q ?? ""), 300);
    return () => window.clearTimeout(timer);
  }, [filters.q]);

  const apiFilters = useMemo(
    () => ({ ...filters, q: debouncedQ }),
    [filters, debouncedQ]
  );

  const columnTasks = useMemo(
    () => ({
      pending: pendingTasks,
      in_progress: inProgressTasks,
      done: doneTasks,
    }),
    [pendingTasks, inProgressTasks, doneTasks]
  );

  const matchCount = pendingTasks.length + inProgressTasks.length + doneTasks.length;

  const visibleTaskIds = useMemo(
    () => [...pendingTasks, ...inProgressTasks, ...doneTasks].map((t) => t.id),
    [pendingTasks, inProgressTasks, doneTasks]
  );

  const selectedCount = selectedIds.size;
  const allVisibleSelected =
    visibleTaskIds.length > 0 && visibleTaskIds.every((id) => selectedIds.has(id));

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const toggleTaskSelection = useCallback((task: BacklogTask) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(task.id)) next.delete(task.id);
      else next.add(task.id);
      return next;
    });
  }, []);

  const toggleSelectAllVisible = useCallback(() => {
    setSelectedIds(() => (allVisibleSelected ? new Set() : new Set(visibleTaskIds)));
  }, [allVisibleSelected, visibleTaskIds]);

  const toggleColumnSelection = useCallback((column: KanbanColumnId) => {
    const columnIds = columnTasks[column].map((t) => t.id);
    setSelectedIds((prev) => {
      const allSelected = columnIds.length > 0 && columnIds.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSelected) {
        columnIds.forEach((id) => next.delete(id));
      } else {
        columnIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, [columnTasks]);

  const updateFilters = useCallback(
    (patch: Partial<BacklogListFilters>) => {
      const next = { ...filters, ...patch };
      setSearchParams(filtersToSearchParams(next), { replace: true });
    },
    [filters, setSearchParams]
  );

  const clearFilters = useCallback(() => {
    setSearchParams(filtersToSearchParams(DEFAULT_FILTERS), { replace: true });
  }, [setSearchParams]);

  const setColumnState = useCallback(
    (column: KanbanColumnId, updater: (prev: BacklogTask[]) => BacklogTask[]) => {
      if (column === "pending") setPendingTasks(updater);
      else if (column === "in_progress") setInProgressTasks(updater);
      else setDoneTasks(updater);
    },
    []
  );

  const applyTaskToColumns = useCallback((task: BacklogTask) => {
    const target = kanbanColumnForTask(task);
    (["pending", "in_progress", "done"] as KanbanColumnId[]).forEach((col) => {
      setColumnState(col, (prev) => {
        const rest = prev.filter((t) => t.id !== task.id);
        if (col === target) {
          return sortColumnTasks([task, ...rest], col);
        }
        return rest;
      });
    });
  }, [setColumnState]);

  const removeTaskFromColumns = useCallback((taskId: string) => {
    (["pending", "in_progress", "done"] as KanbanColumnId[]).forEach((col) => {
      setColumnState(col, (prev) => prev.filter((t) => t.id !== taskId));
    });
  }, [setColumnState]);

  const removeTasksFromColumns = useCallback((taskIds: string[]) => {
    const idSet = new Set(taskIds);
    (["pending", "in_progress", "done"] as KanbanColumnId[]).forEach((col) => {
      setColumnState(col, (prev) => prev.filter((t) => !idSet.has(t.id)));
    });
  }, [setColumnState]);

  const loadTasks = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent) setLoading(true);
    try {
      const [pending, inProgress, done] = await Promise.all([
        backlogTaskService.list("pending", apiFilters),
        backlogTaskService.list("in_progress", apiFilters),
        backlogTaskService.list("done", apiFilters),
      ]);
      setPendingTasks(sortColumnTasks(pending, "pending"));
      setInProgressTasks(sortColumnTasks(inProgress, "in_progress"));
      setDoneTasks(sortColumnTasks(done, "done"));
    } catch (error) {
      console.error("Failed to load backlog tasks:", error);
      if (!silent) message.error("加载待办失败");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [apiFilters]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const resetCreateForm = useCallback(() => {
    setFormTitle("");
    setFormDescription("");
    setFormContext(DEFAULT_TASK_CONTEXT);
    setFormPriority(DEFAULT_TASK_PRIORITY);
    setFormStatus("pending");
    setFormProgress(0);
  }, []);

  const resetDetailDraft = useCallback(() => {
    setDetailEditing(false);
    setDetailTitle("");
    setDetailContext(DEFAULT_TASK_CONTEXT);
    setDetailPriority(DEFAULT_TASK_PRIORITY);
    setDetailDescription("");
    setDetailStatus("pending");
    setDetailProgress(0);
    setTaskDetail(null);
  }, []);

  const populateDetailDraft = useCallback((task: BacklogTask) => {
    setDetailTitle(task.title);
    setDetailContext(task.context);
    setDetailPriority(task.priority);
    setDetailDescription(task.description ?? "");
    setDetailStatus(progressToFormStatus(task.progress ?? 0));
    setDetailProgress(task.progress ?? 0);
  }, []);

  const loadTaskDetail = useCallback(async (taskId: string) => {
    setDetailLoading(true);
    try {
      const detail = await backlogTaskService.get(taskId);
      setTaskDetail(detail);
    } catch (error) {
      console.error("Failed to load task detail:", error);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const openCreateForm = useCallback(() => {
    resetCreateForm();
    setFormOpen(true);
  }, [resetCreateForm]);

  const openTaskDetail = useCallback(
    (task: BacklogTask, editing = false) => {
      setViewingTask(task);
      populateDetailDraft(task);
      setDetailEditing(editing);
      void loadTaskDetail(task.id);
    },
    [populateDetailDraft, loadTaskDetail]
  );

  const closeTaskDetail = useCallback(() => {
    setViewingTask(null);
    resetDetailDraft();
  }, [resetDetailDraft]);

  const startDetailEdit = useCallback(() => {
    if (!viewingTask) return;
    populateDetailDraft(viewingTask);
    setDetailEditing(true);
  }, [populateDetailDraft, viewingTask]);

  const closeCreateForm = useCallback(() => {
    setFormOpen(false);
    resetCreateForm();
  }, [resetCreateForm]);

  useEffect(() => {
    if (!viewingTask || detailEditing) return;
    const latest = [...pendingTasks, ...inProgressTasks, ...doneTasks].find(
      (t) => t.id === viewingTask.id
    );
    if (latest) {
      setViewingTask(latest);
    } else {
      closeTaskDetail();
    }
  }, [pendingTasks, inProgressTasks, doneTasks, viewingTask, detailEditing, closeTaskDetail]);

  const applyUpdatedTask = useCallback(
    (updated: BacklogTask) => {
      if (taskMatchesFilters(updated, apiFilters)) {
        applyTaskToColumns(updated);
      } else {
        removeTaskFromColumns(updated.id);
      }
    },
    [apiFilters, applyTaskToColumns, removeTaskFromColumns]
  );

  const handleCreateSubmit = async () => {
    if (!formTitle.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const trimmedDescription = formDescription.trim();
    try {
      const created = await backlogTaskService.create({
        title: formTitle.trim(),
        context: formContext,
        priority: formPriority,
        description: trimmedDescription || undefined,
        progress: formProgress,
      });
      closeCreateForm();
      applyUpdatedTask(created);
    } catch (error) {
      console.error("Failed to save backlog task:", error);
      message.error("添加失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDetailSave = async () => {
    if (!viewingTask || !detailTitle.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const snapshot = viewingTask;
    const trimmedDescription = detailDescription.trim();
    const progress = detailProgress;
    try {
      applyUpdatedTask({
        ...viewingTask,
        title: detailTitle.trim(),
        context: detailContext,
        priority: detailPriority,
        description: trimmedDescription || undefined,
        progress,
        status: detailStatus === "done" ? "done" : detailStatus === "in_progress" ? "in_progress" : "pending",
        completed_at:
          detailStatus === "done"
            ? viewingTask.completed_at ?? new Date().toISOString()
            : undefined,
      });
      const updated = await backlogTaskService.update(viewingTask.id, {
        title: detailTitle.trim(),
        context: detailContext,
        priority: detailPriority,
        description: trimmedDescription || undefined,
        progress,
      });
      applyUpdatedTask(updated);
      closeTaskDetail();
    } catch (error) {
      applyTaskToColumns(snapshot);
      console.error("Failed to save backlog task:", error);
      message.error("保存失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProgressChange = async (
    task: BacklogTask,
    targetColumn: KanbanColumnId,
    fromColumn: KanbanColumnId
  ) => {
    const snapshot = task;
    const progress = progressForColumn(targetColumn, fromColumn, task.progress ?? 0);
    const optimistic = {
      ...task,
      progress,
      status: (targetColumn === "done"
        ? "done"
        : targetColumn === "in_progress"
          ? "in_progress"
          : "pending") as BacklogTask["status"],
      completed_at: targetColumn === "done" ? new Date().toISOString() : undefined,
    };
    if (taskMatchesFilters(optimistic, apiFilters)) {
      applyTaskToColumns(optimistic);
    } else {
      removeTaskFromColumns(task.id);
    }
    try {
      let updated: BacklogTask;
      if (targetColumn === "done") {
        updated = await backlogTaskService.complete(task.id);
      } else if (targetColumn === "pending") {
        updated = await backlogTaskService.revertToInbox(task.id);
      } else {
        updated = await backlogTaskService.update(task.id, { progress });
      }
      applyUpdatedTask(updated);
    } catch (error) {
      applyTaskToColumns(snapshot);
      console.error("Failed to update task progress:", error);
      message.error("操作失败");
    }
  };

  const handleDelete = (task: BacklogTask) => {
    Modal.confirm({
      title: "确认删除",
      content: "确定要删除这条待办吗？",
      okText: "删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        removeTaskFromColumns(task.id);
        setSelectedIds((prev) => {
          if (!prev.has(task.id)) return prev;
          const next = new Set(prev);
          next.delete(task.id);
          return next;
        });
        try {
          await backlogTaskService.delete(task.id);
        } catch (error) {
          await loadTasks({ silent: true });
          console.error("Failed to delete task:", error);
          message.error("删除失败");
        }
      },
    });
  };

  const handleBatchDelete = () => {
    if (selectedCount === 0 || batchDeleting) return;
    const ids = [...selectedIds];
    Modal.confirm({
      title: "批量删除",
      content: `确定要删除选中的 ${ids.length} 条待办吗？此操作不可撤销。`,
      okText: "删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        setBatchDeleting(true);
        removeTasksFromColumns(ids);
        exitSelectionMode();
        try {
          const results = await Promise.allSettled(ids.map((id) => backlogTaskService.delete(id)));
          const failed = results.filter((r) => r.status === "rejected").length;
          if (failed === 0) {
            message.success(`已删除 ${ids.length} 条待办`);
          } else {
            await loadTasks({ silent: true });
            message.warning(`删除完成：成功 ${ids.length - failed} 条，失败 ${failed} 条`);
          }
        } catch (error) {
          await loadTasks({ silent: true });
          console.error("Failed to batch delete tasks:", error);
          message.error("批量删除失败");
        } finally {
          setBatchDeleting(false);
        }
      },
    });
  };

  const openSchedule = (task: BacklogTask) => {
    setSchedulingTask(task);
    setScheduleDate(task.last_plan_date ? dayjs(task.last_plan_date) : dayjs());
  };

  const handleSchedule = async () => {
    if (!schedulingTask) return;
    const snapshot = schedulingTask;
    try {
      const updated = await backlogTaskService.schedule(
        schedulingTask.id,
        scheduleDate.format("YYYY-MM-DD")
      );
      applyUpdatedTask(updated);
      setSchedulingTask(null);
    } catch (error) {
      applyTaskToColumns(snapshot);
      console.error("Failed to schedule task:", error);
      message.error("安排失败");
    }
  };

  const handlePriorityChange = async (task: BacklogTask, priority: TaskPriority) => {
    if (task.priority === priority) return;
    const snapshot = task;
    applyUpdatedTask({ ...task, priority });
    try {
      const updated = await backlogTaskService.update(task.id, { priority });
      applyUpdatedTask(updated);
    } catch (error) {
      applyTaskToColumns(snapshot);
      console.error("Failed to update priority:", error);
      message.error("更新优先级失败");
    }
  };

  const handleDrop = async (target: KanbanColumnId) => {
    if (!dragging) return;
    const { task, from } = dragging;
    setDragging(null);
    setDropTarget(null);

    if (target === from) return;
    await handleProgressChange(task, target, from);
  };

  return (
    <div className="flex flex-col min-h-[calc(100dvh-5rem)] h-full">
      <TodosFilterBar
        filters={filters}
        matchCount={matchCount}
        onChange={updateFilters}
        onClear={clearFilters}
        selectionMode={selectionMode}
        onToggleSelectionMode={() => {
          if (selectionMode) exitSelectionMode();
          else setSelectionMode(true);
        }}
      />

      {selectionMode && (
        <div className="mt-3 flex flex-wrap items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-lg shrink-0">
          <CheckSquare size={16} className="text-indigo-600 shrink-0" />
          <span className="text-sm text-indigo-900">
            已选 <span className="font-semibold tabular-nums">{selectedCount}</span> 项
          </span>
          <button
            type="button"
            onClick={toggleSelectAllVisible}
            className="px-2.5 py-1 text-xs font-medium text-indigo-700 bg-white border border-indigo-200 rounded-md hover:bg-indigo-100 transition-all"
          >
            {allVisibleSelected ? "取消全选" : "全选当前结果"}
          </button>
          <span className="flex-1" />
          <button
            type="button"
            disabled={selectedCount === 0 || batchDeleting}
            onClick={handleBatchDelete}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-red-500 rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Trash2 size={13} />
            {batchDeleting ? "删除中…" : "批量删除"}
          </button>
          <button
            type="button"
            onClick={exitSelectionMode}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-all"
          >
            <X size={13} />
            取消
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">加载中...</div>
      ) : (
        <div className="flex-1 flex gap-2.5 min-h-0 mt-4">
          {COLUMNS.map((col) => {
            const tasks = columnTasks[col.id];
            const isDropHighlight = dropTarget === col.id && dragging && dragging.from !== col.id;

            return (
              <div
                key={col.id}
                className={`flex-1 min-w-0 flex flex-col rounded-lg bg-gray-50 border border-gray-200 overflow-hidden border-t-2 ${col.accent}`}
                onDragOver={(e) => {
                  if (!dragging || dragging.from === col.id) return;
                  e.preventDefault();
                  setDropTarget(col.id);
                }}
                onDragLeave={() => setDropTarget(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop(col.id);
                }}
              >
                <div className="flex items-center gap-2 px-2.5 py-2 border-b border-gray-200/80 bg-white/80 shrink-0">
                  <h2 className="text-xs font-semibold text-gray-700">{col.title}</h2>
                  {selectionMode && tasks.length > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleColumnSelection(col.id)}
                      className="px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100 transition-all"
                    >
                      {tasks.every((t) => selectedIds.has(t.id)) ? "取消" : "全选"}
                    </button>
                  )}
                  {col.id === "pending" && (
                    <button
                      type="button"
                      onClick={openCreateForm}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 rounded-md hover:bg-emerald-100 transition-all"
                    >
                      <Plus size={14} />
                      新增待办
                    </button>
                  )}
                  <span className="flex-1" />
                  <span className="text-[10px] font-medium text-gray-500 tabular-nums">{tasks.length}</span>
                </div>

                <div
                  className={`flex-1 min-h-0 overflow-y-auto p-2 space-y-2 transition-colors ${
                    isDropHighlight ? "bg-blue-50/60 ring-2 ring-inset ring-blue-200" : ""
                  }`}
                >
                  {tasks.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-[11px] text-gray-400">无匹配</div>
                  ) : (
                    tasks.map((task) => (
                      <KanbanCard
                        key={task.id}
                        task={task}
                        column={col.id}
                        draggable={!selectionMode}
                        selectionMode={selectionMode}
                        selected={selectedIds.has(task.id)}
                        onToggleSelect={toggleTaskSelection}
                        onDragStart={(t, from) => setDragging({ task: t, from })}
                        onSchedule={openSchedule}
                        onPriorityChange={handlePriorityChange}
                        onView={(task) => openTaskDetail(task)}
                        onEdit={(task) => openTaskDetail(task, true)}
                        onDelete={handleDelete}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        title="待办详情"
        open={!!viewingTask}
        onCancel={closeTaskDetail}
        footer={
          viewingTask
            ? detailEditing
              ? [
                  <button
                    key="save"
                    type="button"
                    disabled={!detailTitle.trim() || isSubmitting}
                    onClick={handleDetailSave}
                    className="px-4 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "保存中…" : "保存"}
                  </button>,
                  <button
                    key="cancel"
                    type="button"
                    disabled={isSubmitting}
                    onClick={closeTaskDetail}
                    className="px-4 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 ml-2 disabled:opacity-50"
                  >
                    取消
                  </button>,
                ]
              : [
                  <button
                    key="edit"
                    type="button"
                    onClick={startDetailEdit}
                    className="px-4 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                  >
                    编辑
                  </button>,
                  <button
                    key="close"
                    type="button"
                    onClick={closeTaskDetail}
                    className="px-4 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 ml-2"
                  >
                    关闭
                  </button>,
                ]
            : null
        }
      >
        {viewingTask && (
          <>
            <TaskFormPanel
              mode={detailEditing ? "edit" : "view"}
              title={detailTitle}
              description={detailDescription}
              context={detailContext}
              priority={detailPriority}
              status={detailStatus}
              progress={detailProgress}
              onTitleChange={setDetailTitle}
              onDescriptionChange={setDetailDescription}
              onContextChange={setDetailContext}
              onPriorityChange={setDetailPriority}
              onStatusChange={(status) => {
                setDetailStatus(status);
                setDetailProgress(applyStatusChange(status, detailProgress));
              }}
              onProgressChange={(progress) => {
                setDetailProgress(progress);
                setDetailStatus(progressToFormStatus(progress));
              }}
              onSubmit={handleDetailSave}
              statusLabel={taskFormStatusLabel(progressToFormStatus(viewingTask.progress ?? 0))}
              timestamps={{
                createdAt: viewingTask.created_at,
                scheduledDate: viewingTask.last_plan_date ?? viewingTask.scheduled_date,
                completedAt: viewingTask.completed_at,
                updatedAt: viewingTask.updated_at,
              }}
            />
            {!detailEditing && (
              <div className="mt-4 pt-3 border-t border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">每日进度记录</h3>
                {detailLoading ? (
                  <p className="text-xs text-gray-400">加载中…</p>
                ) : (
                  <OccurrenceTimeline
                    occurrences={taskDetail?.occurrences ?? []}
                    onNavigate={(occ) => navigate(`/daily-plans?focus=${occ.plan_date}`)}
                  />
                )}
              </div>
            )}
          </>
        )}
      </Modal>

      <Modal
        title="新增待办"
        open={formOpen}
        onOk={handleCreateSubmit}
        onCancel={closeCreateForm}
        okText="添加"
        cancelText="取消"
        confirmLoading={isSubmitting}
        okButtonProps={{ disabled: !formTitle.trim() }}
      >
        <TaskFormPanel
          mode="create"
          title={formTitle}
          description={formDescription}
          context={formContext}
          priority={formPriority}
          status={formStatus}
          progress={formProgress}
          onTitleChange={setFormTitle}
          onDescriptionChange={setFormDescription}
          onContextChange={setFormContext}
          onPriorityChange={setFormPriority}
          onStatusChange={(status) => {
            setFormStatus(status);
            setFormProgress(applyStatusChange(status, formProgress));
          }}
          onProgressChange={(progress) => {
            setFormProgress(progress);
            setFormStatus(progressToFormStatus(progress));
          }}
          onSubmit={handleCreateSubmit}
        />
      </Modal>

      <Modal
        title="安排到每日进度"
        open={!!schedulingTask}
        onOk={handleSchedule}
        onCancel={() => setSchedulingTask(null)}
        okText="确认安排"
        cancelText="取消"
        width={360}
      >
        {schedulingTask && (
          <div className="py-2">
            <p className="text-sm text-gray-600 mb-3">
              将「{schedulingTask.title}」添加到每日进度：
            </p>
            <Calendar
              fullscreen={false}
              value={scheduleDate}
              onSelect={(date) => setScheduleDate(date)}
              headerRender={scheduleCalendarHeader}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
