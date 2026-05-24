import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Trash2, Plus, CheckSquare, X } from "lucide-react";
import { Modal, message } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useSearchParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { backlogTaskService } from "@/services/backlogTaskService";
import { dailyPlanService } from "@/services/dailyPlanService";
import { TodosFilterBar } from "@/components/TodosFilterBar";
import { TaskFormPanel } from "@/components/TaskFormPanel";
import { TaskDetailDrawer } from "@/components/TaskDetailDrawer";
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

const COLUMN_PAGE_SIZE = 20;

const EMPTY_COLUMN_TOTALS: Record<KanbanColumnId, number> = {
  pending: 0,
  in_progress: 0,
  done: 0,
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

function filterSearchParamKey(params: URLSearchParams): string {
  return [
    params.get("q") ?? "",
    params.get("context") ?? "",
    params.get("priority") ?? "",
    params.get("time_field") ?? "",
    params.get("date_from") ?? "",
    params.get("date_to") ?? "",
  ].join("\0");
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

function filtersToSearchParams(filters: BacklogListFilters, taskId?: string | null): URLSearchParams {
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
  if (taskId) params.set("task", taskId);
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

function KanbanCardProgressSlider({
  task,
  onCommit,
  onInteractStart,
  onInteractEnd,
}: {
  task: BacklogTask;
  onCommit: (task: BacklogTask, progress: number) => void;
  onInteractStart: () => void;
  onInteractEnd: () => void;
}) {
  const [value, setValue] = useState(task.progress ?? 0);
  const draggingRef = useRef(false);

  useEffect(() => {
    setValue(task.progress ?? 0);
  }, [task.id, task.progress]);

  const commit = (next: number) => {
    const clamped = Math.min(100, Math.max(0, Math.round(next)));
    setValue(clamped);
    if (clamped !== (task.progress ?? 0)) {
      onCommit(task, clamped);
    }
  };

  const beginInteraction = (event: React.SyntheticEvent) => {
    event.stopPropagation();
    if (!draggingRef.current) {
      draggingRef.current = true;
      onInteractStart();
    }
  };

  const endInteraction = (event: React.SyntheticEvent, nextValue?: number) => {
    event.stopPropagation();
    if (draggingRef.current) {
      draggingRef.current = false;
      onInteractEnd();
    }
    if (nextValue != null) {
      commit(nextValue);
    }
  };

  const trackStyle = {
    background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${value}%, #e5e7eb ${value}%, #e5e7eb 100%)`,
  };

  return (
    <div
      data-kanban-progress-slider
      className="w-full mt-1.5 flex items-center gap-2 touch-none"
      onMouseDown={beginInteraction}
      onPointerDown={beginInteraction}
      onTouchStart={beginInteraction}
      onClick={(e) => e.stopPropagation()}
      onDragStart={(e) => e.preventDefault()}
    >
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        draggable={false}
        style={trackStyle}
        onDragStart={(e) => e.preventDefault()}
        onChange={(e) => setValue(Number(e.target.value))}
        onMouseUp={(e) => endInteraction(e, Number(e.currentTarget.value))}
        onTouchEnd={(e) => endInteraction(e, Number(e.currentTarget.value))}
        onPointerUp={(e) => endInteraction(e, Number(e.currentTarget.value))}
        onPointerCancel={(e) => endInteraction(e)}
        onBlur={(e) => endInteraction(e, Number(e.currentTarget.value))}
        onKeyUp={(e) => endInteraction(e, Number(e.currentTarget.value))}
        className="kanban-progress-range flex-1 h-1.5 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:appearance-none
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white
          [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:-mt-[3px]
          [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent
          [&::-moz-range-progress]:h-1.5 [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-amber-500
          [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-amber-500"
        aria-label={`${task.title} 进度`}
      />
      <span className="text-sm text-amber-600 font-medium tabular-nums shrink-0 w-10 text-right">
        {value}%
      </span>
    </div>
  );
}

interface KanbanCardProps {
  task: BacklogTask;
  column: KanbanColumnId;
  draggable: boolean;
  selectionMode: boolean;
  selected: boolean;
  highlighted: boolean;
  onToggleSelect: (task: BacklogTask) => void;
  onDragStart: (task: BacklogTask, from: KanbanColumnId) => void;
  onPriorityChange: (task: BacklogTask, priority: TaskPriority) => void;
  onOpenDetail: (task: BacklogTask) => void;
  onProgressCommit?: (task: BacklogTask, progress: number) => void;
}

function KanbanCard({
  task,
  column,
  draggable,
  selectionMode,
  selected,
  highlighted,
  onToggleSelect,
  onDragStart,
  onPriorityChange,
  onOpenDetail,
  onProgressCommit,
}: KanbanCardProps) {
  const contextConfig = getTaskContextConfig(task.context);
  const priorityConfig = getTaskPriorityConfig(task.priority);
  const isScheduled = task.is_scheduled ?? false;
  const [progressDragLocked, setProgressDragLocked] = useState(false);
  const cardDraggable = draggable && !selectionMode && !progressDragLocked;

  return (
    <div
      draggable={cardDraggable}
      onDragStart={(e) => {
        if (selectionMode || progressDragLocked) {
          e.preventDefault();
          return;
        }
        const target = e.target as HTMLElement;
        if (target.closest("[data-kanban-progress-slider]")) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.effectAllowed = "move";
        onDragStart(task, column);
      }}
      className={`group bg-white rounded-md border p-2 hover:border-gray-300 transition-all ${
        selectionMode ? "cursor-pointer" : cardDraggable ? "cursor-grab active:cursor-grabbing" : ""
      } ${selected ? "border-indigo-400 bg-indigo-50/40 ring-1 ring-indigo-200" : highlighted ? "border-indigo-300 ring-1 ring-indigo-100" : "border-gray-200"}`}
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
        <div className="flex-1 min-w-0">
          <p
            className={`text-base leading-snug break-words ${
              selectionMode ? "" : "cursor-pointer hover:text-indigo-700"
            } ${column === "done" ? "text-gray-500" : "text-gray-800"}`}
            onClick={(e) => {
              e.stopPropagation();
              if (!selectionMode) onOpenDetail(task);
            }}
          >
            {task.title}
          </p>
          <div className="flex items-center flex-wrap gap-1.5 mt-3">
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
                className="text-sm px-1.5 py-0.5 rounded font-medium hover:opacity-80"
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
                className="text-sm px-1.5 py-0.5 rounded font-medium opacity-60"
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
                className="text-sm px-1.5 py-0.5 rounded font-medium"
                style={{
                  backgroundColor: `${contextConfig.color}12`,
                  color: contextConfig.color,
                }}
              >
                {contextConfig.label}
              </span>
            )}
            {isScheduled && task.last_plan_date && column !== "done" && (
              <span className="text-sm text-blue-600 font-medium">
                已安排 {dayjs(task.last_plan_date).format("M月D日")}
              </span>
            )}
            {(task.possible_duplicate_count ?? 0) > 0 && column !== "done" && (
              <span className="text-sm text-rose-600 font-medium">可能重复</span>
            )}
            {column === "in_progress" && onProgressCommit && (
              <KanbanCardProgressSlider
                task={task}
                onCommit={onProgressCommit}
                onInteractStart={() => setProgressDragLocked(true)}
                onInteractEnd={() => setProgressDragLocked(false)}
              />
            )}
            {(column === "pending" || column === "in_progress") && formatLinkedDates(task) && (
              <span className="text-sm text-gray-400">📅 {formatLinkedDates(task)}</span>
            )}
            {column === "pending" && !isScheduled && (
              <span className="text-sm text-gray-400">{formatRelativeTime(task.created_at)}</span>
            )}
            {column === "done" && task.completed_at && (
              <span className="text-sm text-gray-400">{formatDateTime(task.completed_at)}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TodosList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const filterParamKey = filterSearchParamKey(searchParams);
  const filters = useMemo(() => parseFilters(searchParams), [filterParamKey, searchParams]);
  const [draftFilters, setDraftFilters] = useState<BacklogListFilters>(() => parseFilters(searchParams));
  const hasLoadedOnceRef = useRef(false);

  const [pendingTasks, setPendingTasks] = useState<BacklogTask[]>([]);
  const [inProgressTasks, setInProgressTasks] = useState<BacklogTask[]>([]);
  const [doneTasks, setDoneTasks] = useState<BacklogTask[]>([]);
  const [columnTotals, setColumnTotals] = useState<Record<KanbanColumnId, number>>(EMPTY_COLUMN_TOTALS);
  const [loadingMoreColumn, setLoadingMoreColumn] = useState<KanbanColumnId | null>(null);
  const loadingMoreRef = useRef<Set<KanbanColumnId>>(new Set());
  const columnScrollRefs = useRef<Record<KanbanColumnId, HTMLDivElement | null>>({
    pending: null,
    in_progress: null,
    done: null,
  });
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [createAsCompleted, setCreateAsCompleted] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formContext, setFormContext] = useState<TaskContext>(DEFAULT_TASK_CONTEXT);
  const [formPriority, setFormPriority] = useState<TaskPriority>(DEFAULT_TASK_PRIORITY);
  const [formStatus, setFormStatus] = useState<TaskFormStatus>("pending");
  const [formProgress, setFormProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detailTitle, setDetailTitle] = useState("");
  const [detailContext, setDetailContext] = useState<TaskContext>(DEFAULT_TASK_CONTEXT);
  const [detailPriority, setDetailPriority] = useState<TaskPriority>(DEFAULT_TASK_PRIORITY);
  const [detailDescription, setDetailDescription] = useState("");
  const [detailStatus, setDetailStatus] = useState<TaskFormStatus>("pending");
  const [detailProgress, setDetailProgress] = useState(0);
  const [taskDetail, setTaskDetail] = useState<BacklogTaskDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<Dayjs>(dayjs());
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [drawerTaskSnapshot, setDrawerTaskSnapshot] = useState<BacklogTask | null>(null);
  const [dragging, setDragging] = useState<{ task: BacklogTask; from: KanbanColumnId } | null>(null);
  const [dropTarget, setDropTarget] = useState<KanbanColumnId | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [isDeletingOccurrences, setIsDeletingOccurrences] = useState(false);
  const populatedTaskIdRef = useRef<string | null>(null);

  const taskId = searchParams.get("task");
  const drawerOpen = !!taskId;

  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    const prevOverflow = main.style.overflow;
    main.style.overflow = "hidden";
    return () => {
      main.style.overflow = prevOverflow;
    };
  }, []);

  const allColumnTasks = useMemo(
    () => [...pendingTasks, ...inProgressTasks, ...doneTasks],
    [pendingTasks, inProgressTasks, doneTasks]
  );

  const activeTask = useMemo(() => {
    if (!taskId) return null;
    return allColumnTasks.find((t) => t.id === taskId) ?? drawerTaskSnapshot;
  }, [taskId, allColumnTasks, drawerTaskSnapshot]);

  useEffect(() => {
    setDraftFilters(parseFilters(searchParams));
  }, [filterParamKey, searchParams]);

  const apiFilters = filters;

  const columnTasks = useMemo(
    () => ({
      pending: pendingTasks,
      in_progress: inProgressTasks,
      done: doneTasks,
    }),
    [pendingTasks, inProgressTasks, doneTasks]
  );

  const matchCount = columnTotals.pending + columnTotals.in_progress + columnTotals.done;
  const showInitialLoading = loading && matchCount === 0 && pendingTasks.length === 0;

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

  const updateDraftFilters = useCallback((patch: Partial<BacklogListFilters>) => {
    setDraftFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const filterApplyTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const applySearch = useCallback(() => {
    if (filterApplyTimerRef.current) {
      clearTimeout(filterApplyTimerRef.current);
      filterApplyTimerRef.current = undefined;
    }
    setSearchParams(filtersToSearchParams(draftFilters, searchParams.get("task")), { replace: true });
  }, [draftFilters, searchParams, setSearchParams]);

  useEffect(() => {
    const appliedKey = filterSearchParamKey(searchParams);
    const draftKey = filterSearchParamKey(filtersToSearchParams(draftFilters));
    if (draftKey === appliedKey) return;

    const appliedFilters = parseFilters(searchParams);
    const onlyKeywordDirty =
      (draftFilters.q ?? "") !== (appliedFilters.q ?? "") &&
      draftFilters.context === appliedFilters.context &&
      draftFilters.priority === appliedFilters.priority &&
      draftFilters.timeField === appliedFilters.timeField &&
      draftFilters.dateFrom === appliedFilters.dateFrom &&
      draftFilters.dateTo === appliedFilters.dateTo;
    const delay = onlyKeywordDirty ? 350 : 0;

    filterApplyTimerRef.current = setTimeout(() => {
      filterApplyTimerRef.current = undefined;
      setSearchParams(filtersToSearchParams(draftFilters, searchParams.get("task")), { replace: true });
    }, delay);

    return () => {
      if (filterApplyTimerRef.current) {
        clearTimeout(filterApplyTimerRef.current);
        filterApplyTimerRef.current = undefined;
      }
    };
  }, [draftFilters, searchParams, setSearchParams]);

  const resetFilters = useCallback(() => {
    if (filterApplyTimerRef.current) {
      clearTimeout(filterApplyTimerRef.current);
      filterApplyTimerRef.current = undefined;
    }
    setDraftFilters(DEFAULT_FILTERS);
    setSearchParams(filtersToSearchParams(DEFAULT_FILTERS, searchParams.get("task")), { replace: true });
  }, [searchParams, setSearchParams]);

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
        const existedInColumn = prev.some((t) => t.id === task.id);
        const rest = prev.filter((t) => t.id !== task.id);
        if (col === target) {
          if (!existedInColumn) {
            setColumnTotals((totals) => ({
              ...totals,
              [col]: totals[col] + 1,
            }));
          }
          return sortColumnTasks([task, ...rest], col);
        }
        if (existedInColumn) {
          setColumnTotals((totals) => ({
            ...totals,
            [col]: Math.max(0, totals[col] - 1),
          }));
        }
        return rest;
      });
    });
  }, [setColumnState]);

  const removeTaskFromColumns = useCallback((taskId: string) => {
    (["pending", "in_progress", "done"] as KanbanColumnId[]).forEach((col) => {
      setColumnState(col, (prev) => {
        if (!prev.some((t) => t.id === taskId)) return prev;
        setColumnTotals((totals) => ({
          ...totals,
          [col]: Math.max(0, totals[col] - 1),
        }));
        return prev.filter((t) => t.id !== taskId);
      });
    });
  }, [setColumnState]);

  const removeTasksFromColumns = useCallback((taskIds: string[]) => {
    const idSet = new Set(taskIds);
    (["pending", "in_progress", "done"] as KanbanColumnId[]).forEach((col) => {
      setColumnState(col, (prev) => {
        const removedCount = prev.filter((t) => idSet.has(t.id)).length;
        if (removedCount > 0) {
          setColumnTotals((totals) => ({
            ...totals,
            [col]: Math.max(0, totals[col] - removedCount),
          }));
        }
        return prev.filter((t) => !idSet.has(t.id));
      });
    });
  }, [setColumnState]);

  const loadTasks = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? hasLoadedOnceRef.current;
    if (!silent) setLoading(true);
    try {
      const [pendingRes, inProgressRes, doneRes] = await Promise.all([
        backlogTaskService.list("pending", apiFilters, { limit: COLUMN_PAGE_SIZE, offset: 0 }),
        backlogTaskService.list("in_progress", apiFilters, { limit: COLUMN_PAGE_SIZE, offset: 0 }),
        backlogTaskService.list("done", apiFilters, { limit: COLUMN_PAGE_SIZE, offset: 0 }),
      ]);
      setPendingTasks(pendingRes.tasks);
      setInProgressTasks(inProgressRes.tasks);
      setDoneTasks(doneRes.tasks);
      setColumnTotals({
        pending: pendingRes.total,
        in_progress: inProgressRes.total,
        done: doneRes.total,
      });
    } catch (error) {
      console.error("Failed to load backlog tasks:", error);
      if (!silent) message.error("加载待办失败");
    } finally {
      hasLoadedOnceRef.current = true;
      if (!silent) setLoading(false);
    }
  }, [apiFilters]);

  const loadMoreColumn = useCallback(
    async (column: KanbanColumnId) => {
      const loadedCount = columnTasks[column].length;
      const total = columnTotals[column];
      if (loadedCount >= total || loadingMoreRef.current.has(column)) return;

      loadingMoreRef.current.add(column);
      setLoadingMoreColumn(column);
      try {
        const result = await backlogTaskService.list(column, apiFilters, {
          limit: COLUMN_PAGE_SIZE,
          offset: loadedCount,
        });
        setColumnState(column, (prev) => {
          const existingIds = new Set(prev.map((t) => t.id));
          const merged = [...prev];
          for (const task of result.tasks) {
            if (!existingIds.has(task.id)) merged.push(task);
          }
          return merged;
        });
        setColumnTotals((prev) => ({ ...prev, [column]: result.total }));
      } catch (error) {
        console.error(`Failed to load more ${column} tasks:`, error);
        message.error("加载更多失败");
      } finally {
        loadingMoreRef.current.delete(column);
        setLoadingMoreColumn(null);
      }
    },
    [apiFilters, columnTasks, columnTotals, setColumnState]
  );

  const handleColumnScroll = useCallback(
    (column: KanbanColumnId, event: React.UIEvent<HTMLDivElement>) => {
      const el = event.currentTarget;
      const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (remaining > 80) return;
      if (columnTasks[column].length >= columnTotals[column]) return;
      void loadMoreColumn(column);
    },
    [columnTasks, columnTotals, loadMoreColumn]
  );

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (loading || showInitialLoading) return;
    (["pending", "in_progress", "done"] as KanbanColumnId[]).forEach((col) => {
      const el = columnScrollRefs.current[col];
      if (!el) return;
      if (columnTasks[col].length >= columnTotals[col]) return;
      if (el.scrollHeight <= el.clientHeight + 1) {
        void loadMoreColumn(col);
      }
    });
  }, [
    pendingTasks,
    inProgressTasks,
    doneTasks,
    columnTotals,
    loading,
    showInitialLoading,
    loadMoreColumn,
    columnTasks,
  ]);

  const resetCreateForm = useCallback((asCompleted = false) => {
    setFormTitle("");
    setFormDescription("");
    setFormContext(DEFAULT_TASK_CONTEXT);
    setFormPriority(DEFAULT_TASK_PRIORITY);
    setFormStatus(asCompleted ? "done" : "pending");
    setFormProgress(asCompleted ? 100 : 0);
  }, []);

  const resetDetailDraft = useCallback(() => {
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
    setDetailStatus(progressToFormStatus(task.progress ?? 0, task.status));
    setDetailProgress(task.progress ?? 0);
  }, []);

  const loadTaskDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const detail = await backlogTaskService.get(id);
      setTaskDetail(detail);
      setDrawerTaskSnapshot((prev) => prev ?? detail);
      return detail;
    } catch (error) {
      console.error("Failed to load task detail:", error);
      setSearchParams((prev) => filtersToSearchParams(parseFilters(prev)), { replace: true });
      return null;
    } finally {
      setDetailLoading(false);
    }
  }, [setSearchParams]);

  const openCreateForm = useCallback(() => {
    setCreateAsCompleted(false);
    resetCreateForm(false);
    setFormOpen(true);
  }, [resetCreateForm]);

  const openCreateCompletedForm = useCallback(() => {
    setCreateAsCompleted(true);
    resetCreateForm(true);
    setFormOpen(true);
  }, [resetCreateForm]);

  const closeTaskDetail = useCallback(() => {
    populatedTaskIdRef.current = null;
    setDrawerTaskSnapshot(null);
    setScheduleOpen(false);
    resetDetailDraft();
    setSearchParams((prev) => filtersToSearchParams(parseFilters(prev)), { replace: true });
  }, [resetDetailDraft, setSearchParams]);

  const handleDetailCancel = useCallback(() => {
    if (activeTask) {
      populateDetailDraft(activeTask);
    }
    closeTaskDetail();
  }, [activeTask, populateDetailDraft, closeTaskDetail]);

  const openTaskDetail = useCallback(
    (task: BacklogTask) => {
      if (selectionMode) return;
      populatedTaskIdRef.current = null;
      setDrawerTaskSnapshot(task);
      setScheduleOpen(false);
      setSearchParams((prev) => filtersToSearchParams(parseFilters(prev), task.id), { replace: false });
    },
    [selectionMode, setSearchParams]
  );

  const closeCreateForm = useCallback(() => {
    setFormOpen(false);
    setCreateAsCompleted(false);
    resetCreateForm(false);
  }, [resetCreateForm]);

  useEffect(() => {
    if (!taskId) {
      populatedTaskIdRef.current = null;
      return;
    }
    if (populatedTaskIdRef.current === taskId) return;
    const fromColumns = allColumnTasks.find((t) => t.id === taskId);
    const fromSnapshot = drawerTaskSnapshot?.id === taskId ? drawerTaskSnapshot : null;
    const task = fromColumns ?? fromSnapshot;
    if (!task) return;
    populateDetailDraft(task);
    setScheduleDate(task.last_plan_date ? dayjs(task.last_plan_date) : dayjs());
    populatedTaskIdRef.current = taskId;
  }, [taskId, allColumnTasks, drawerTaskSnapshot, populateDetailDraft]);

  useEffect(() => {
    if (!taskId) return;
    if (taskDetail?.id === taskId) return;
    void loadTaskDetail(taskId);
  }, [taskId, loadTaskDetail, taskDetail?.id]);

  useEffect(() => {
    if (!taskId || !activeTask) return;
    setDrawerTaskSnapshot(activeTask);
  }, [taskId, activeTask?.id, activeTask?.updated_at, activeTask?.progress, activeTask?.title]);

  useEffect(() => {
    if (selectionMode && drawerOpen) {
      closeTaskDetail();
    }
  }, [selectionMode, drawerOpen, closeTaskDetail]);

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

  const refreshTaskAfterOccurrenceChange = useCallback(async () => {
    if (!activeTask) return;
    const detail = await loadTaskDetail(activeTask.id);
    if (detail) {
      setDrawerTaskSnapshot(detail);
      applyUpdatedTask(detail);
    }
  }, [activeTask, loadTaskDetail, applyUpdatedTask]);

  const handleDeleteOccurrences = useCallback(
    (occurrences: BacklogOccurrence[]) => {
      if (occurrences.length === 0 || isDeletingOccurrences) return;

      const count = occurrences.length;
      const content =
        count === 1
          ? `确定删除 ${occurrences[0].plan_date} 的每日进度记录吗？对应的每日任务也会被删除。`
          : `确定删除选中的 ${count} 条每日进度记录吗？对应的每日任务也会被删除。`;

      Modal.confirm({
        title: count === 1 ? "删除每日进度记录" : "批量删除每日进度记录",
        content,
        okText: "删除",
        okType: "danger",
        cancelText: "取消",
        onOk: async () => {
          setIsDeletingOccurrences(true);
          try {
            const results = await Promise.allSettled(
              occurrences.map((occ) => dailyPlanService.deleteTask(occ.daily_task_id))
            );
            const failed = results.filter((result) => result.status === "rejected").length;
            if (failed === 0) {
              message.success(count === 1 ? "已删除每日进度记录" : `已删除 ${count} 条记录`);
            } else {
              message.warning(`删除完成：成功 ${count - failed} 条，失败 ${failed} 条`);
            }
            await refreshTaskAfterOccurrenceChange();
          } catch (error) {
            console.error("Failed to delete daily occurrences:", error);
            message.error("删除失败");
            await refreshTaskAfterOccurrenceChange();
          } finally {
            setIsDeletingOccurrences(false);
          }
        },
      });
    },
    [isDeletingOccurrences, refreshTaskAfterOccurrenceChange]
  );

  const handleCreateSubmit = async () => {
    if (!formTitle.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const trimmedDescription = formDescription.trim();
    const progress = createAsCompleted ? 100 : formProgress;
    try {
      const created = await backlogTaskService.create({
        title: formTitle.trim(),
        context: formContext,
        priority: formPriority,
        description: trimmedDescription || undefined,
        progress,
      });
      const wasCompleted = createAsCompleted;
      closeCreateForm();
      applyUpdatedTask(created);
      if (wasCompleted) {
        message.success("已添加到今日进度并完成");
      }
    } catch (error) {
      console.error("Failed to save backlog task:", error);
      message.error("添加失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDetailSave = async () => {
    if (!activeTask || !detailTitle.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const snapshot = activeTask;
    const trimmedDescription = detailDescription.trim();
    const progress = detailProgress;
    try {
      applyUpdatedTask({
        ...activeTask,
        title: detailTitle.trim(),
        context: detailContext,
        priority: detailPriority,
        description: trimmedDescription || undefined,
        progress,
        status: detailStatus === "done" ? "done" : detailStatus === "in_progress" ? "in_progress" : "pending",
        completed_at:
          detailStatus === "done"
            ? activeTask.completed_at ?? new Date().toISOString()
            : undefined,
      });
      const updated = await backlogTaskService.update(activeTask.id, {
        title: detailTitle.trim(),
        context: detailContext,
        priority: detailPriority,
        description: trimmedDescription || undefined,
        progress,
        status:
          detailStatus === "done"
            ? "done"
            : detailStatus === "in_progress"
              ? "in_progress"
              : "pending",
      });
      applyUpdatedTask(updated);
      setDrawerTaskSnapshot(updated);
      void loadTaskDetail(activeTask.id);
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
        updated = await backlogTaskService.update(task.id, {
          progress,
          status: "in_progress",
        });
      }
      applyUpdatedTask(updated);
    } catch (error) {
      applyTaskToColumns(snapshot);
      console.error("Failed to update task progress:", error);
      message.error("操作失败");
    }
  };

  const handleCardProgressCommit = async (task: BacklogTask, progress: number) => {
    if (progress >= 100) {
      await handleProgressChange(task, "done", "in_progress");
      return;
    }

    const snapshot = task;
    const optimistic = {
      ...task,
      progress,
      status: "in_progress" as BacklogTask["status"],
    };
    if (taskMatchesFilters(optimistic, apiFilters)) {
      applyTaskToColumns(optimistic);
    } else {
      removeTaskFromColumns(task.id);
    }
    try {
      const updated = await backlogTaskService.update(task.id, {
        progress,
        status: "in_progress",
      });
      applyUpdatedTask(updated);
    } catch (error) {
      applyTaskToColumns(snapshot);
      console.error("Failed to update task progress:", error);
      message.error("更新进度失败");
    }
  };

  const handleDrawerDelete = () => {
    if (!activeTask) return;
    Modal.confirm({
      title: "确认删除",
      content: "确定要删除这条待办吗？",
      okText: "删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        const id = activeTask.id;
        removeTaskFromColumns(id);
        setSelectedIds((prev) => {
          if (!prev.has(id)) return prev;
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        closeTaskDetail();
        try {
          await backlogTaskService.delete(id);
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

  const handleConfirmSchedule = async () => {
    if (!activeTask || isScheduling) return;
    setIsScheduling(true);
    const snapshot = activeTask;
    try {
      const updated = await backlogTaskService.schedule(
        activeTask.id,
        scheduleDate.format("YYYY-MM-DD")
      );
      applyUpdatedTask(updated);
      setDrawerTaskSnapshot(updated);
      setScheduleOpen(false);
      void loadTaskDetail(activeTask.id);
      message.success("已安排到每日进度");
    } catch (error) {
      applyTaskToColumns(snapshot);
      console.error("Failed to schedule task:", error);
      message.error("安排失败");
    } finally {
      setIsScheduling(false);
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
    <div className="relative flex flex-col h-full min-h-0 overflow-hidden px-3 py-3 sm:px-4 sm:py-4">
      <TodosFilterBar
        filters={draftFilters}
        matchCount={matchCount}
        onChange={updateDraftFilters}
        onSearch={applySearch}
        onReset={resetFilters}
        selectionMode={selectionMode}
        onToggleSelectionMode={() => {
          if (selectionMode) exitSelectionMode();
          else {
            if (drawerOpen) closeTaskDetail();
            setSelectionMode(true);
          }
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

      {showInitialLoading ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">加载中...</div>
      ) : (
        <div className="flex-1 flex gap-2.5 min-h-0 mt-4 overflow-hidden">
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
                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-200/80 bg-white/80 shrink-0">
                  <h2 className="text-sm font-semibold text-gray-700">{col.title}</h2>
                  {selectionMode && tasks.length > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleColumnSelection(col.id)}
                      className="px-2 py-0.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100 transition-all"
                    >
                      {tasks.every((t) => selectedIds.has(t.id)) ? "取消" : "全选"}
                    </button>
                  )}
                  {col.id === "pending" && (
                    <button
                      type="button"
                      onClick={openCreateForm}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-md hover:bg-emerald-100 transition-all"
                    >
                      <Plus size={16} />
                      新增待办
                    </button>
                  )}
                  {col.id === "done" && (
                    <button
                      type="button"
                      onClick={openCreateCompletedForm}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-md hover:bg-emerald-100 transition-all"
                    >
                      <Plus size={16} />
                      新增完成
                    </button>
                  )}
                  <span className="flex-1" />
                  <span className="text-sm font-medium text-gray-500 tabular-nums">
                    {columnTotals[col.id]}
                  </span>
                </div>

                <div
                  ref={(el) => {
                    columnScrollRefs.current[col.id] = el;
                  }}
                  className={`flex-1 min-h-0 overflow-y-auto overscroll-contain p-2 space-y-2 transition-colors ${
                    isDropHighlight ? "bg-blue-50/60 ring-2 ring-inset ring-blue-200" : ""
                  }`}
                  onScroll={(event) => handleColumnScroll(col.id, event)}
                >
                  {tasks.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-[11px] text-gray-400">无匹配</div>
                  ) : (
                    <>
                      {tasks.map((task) => (
                        <KanbanCard
                          key={task.id}
                          task={task}
                          column={col.id}
                          draggable={!selectionMode}
                          selectionMode={selectionMode}
                          selected={selectedIds.has(task.id)}
                          highlighted={taskId === task.id}
                          onToggleSelect={toggleTaskSelection}
                          onDragStart={(t, from) => setDragging({ task: t, from })}
                          onPriorityChange={handlePriorityChange}
                          onOpenDetail={openTaskDetail}
                          onProgressCommit={
                            col.id === "in_progress" && !selectionMode
                              ? handleCardProgressCommit
                              : undefined
                          }
                        />
                      ))}
                      {loadingMoreColumn === col.id && (
                        <div className="py-2 text-center text-[11px] text-gray-400">加载中…</div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TaskDetailDrawer
        open={drawerOpen && !!activeTask}
        taskProgress={activeTask?.progress ?? 0}
        detailTitle={detailTitle}
        detailDescription={detailDescription}
        detailContext={detailContext}
        detailPriority={detailPriority}
        detailStatus={detailStatus}
        detailProgress={detailProgress}
        detailLoading={detailLoading}
        taskDetail={taskDetail}
        isSubmitting={isSubmitting}
        isDone={activeTask ? kanbanColumnForTask(activeTask) === "done" : false}
        scheduleDate={scheduleDate}
        scheduleOpen={scheduleOpen}
        isScheduling={isScheduling}
        timestamps={{
          createdAt: activeTask?.created_at,
          scheduledDate: activeTask?.last_plan_date ?? activeTask?.scheduled_date,
          completedAt: activeTask?.completed_at,
          updatedAt: activeTask?.updated_at,
        }}
        onCancel={handleDetailCancel}
        onTitleChange={setDetailTitle}
        onDescriptionChange={setDetailDescription}
        onContextChange={setDetailContext}
        onPriorityChange={setDetailPriority}
        onStatusChange={setDetailStatus}
        onProgressChange={setDetailProgress}
        onConfirm={handleDetailSave}
        onDelete={handleDrawerDelete}
        onToggleSchedule={() => setScheduleOpen((v) => !v)}
        onScheduleDateChange={setScheduleDate}
        onConfirmSchedule={handleConfirmSchedule}
        onNavigateOccurrence={(occ) => navigate(`/daily-plans?focus=${occ.plan_date}`)}
        onDeleteOccurrences={handleDeleteOccurrences}
        isDeletingOccurrences={isDeletingOccurrences}
      />

      <Modal
        title={createAsCompleted ? "新增完成" : "新增待办"}
        open={formOpen}
        onOk={handleCreateSubmit}
        onCancel={closeCreateForm}
        okText="添加"
        cancelText="取消"
        confirmLoading={isSubmitting}
        okButtonProps={{ disabled: !formTitle.trim() }}
      >
        {createAsCompleted && (
          <p className="text-sm text-gray-500 mb-3">将直接记为已完成，并添加到今日进度。</p>
        )}
        <TaskFormPanel
          mode="create"
          title={formTitle}
          description={formDescription}
          context={formContext}
          priority={formPriority}
          status={formStatus}
          progress={formProgress}
          hideStatusFields={createAsCompleted}
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
    </div>
  );
}
