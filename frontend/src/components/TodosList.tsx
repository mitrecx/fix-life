import { useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import { Trash2, Calendar, Undo2, SquarePen, Plus } from "lucide-react";
import { DatePicker, Modal, message } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useSearchParams } from "react-router-dom";
import { backlogTaskService } from "@/services/backlogTaskService";
import { TodosFilterBar } from "@/components/TodosFilterBar";
import type {
  BacklogTask,
  BacklogListFilters,
  BacklogContextFilter,
  BacklogPriorityFilter,
  TodoFormStatus,
} from "@/types/backlogTask";
import type { TaskContext } from "@/types/taskContext";
import {
  TASK_CONTEXT,
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

type KanbanColumnId = "active" | "done";

const COLUMNS: { id: KanbanColumnId; title: string; accent: string }[] = [
  { id: "active", title: "待办", accent: "border-t-blue-500" },
  { id: "done", title: "已完成", accent: "border-t-emerald-500" },
];

const DEFAULT_FILTERS: BacklogListFilters = {
  q: "",
  context: "all",
  priority: "all",
  timeField: "created",
};

function sortActiveTasks(tasks: BacklogTask[]): BacklogTask[] {
  const pending = tasks.filter((t) => t.status === "pending");
  const scheduled = tasks.filter((t) => t.status === "scheduled");
  pending.sort((a, b) => {
    const byPriority = compareTaskPriority(a.priority, b.priority);
    if (byPriority !== 0) return byPriority;
    return dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf();
  });
  scheduled.sort((a, b) => {
    const byPriority = compareTaskPriority(a.priority, b.priority);
    if (byPriority !== 0) return byPriority;
    return dayjs(a.scheduled_date).valueOf() - dayjs(b.scheduled_date).valueOf();
  });
  return [...pending, ...scheduled];
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
  if (field === "scheduled") return task.scheduled_date;
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
  return dayjs(dateStr).format("M/D HH:mm");
}

function formatFullDateTime(dateStr: string) {
  return dayjs(dateStr).format("YYYY-MM-DD HH:mm");
}

const STATUS_LABELS: Record<BacklogTask["status"], string> = {
  pending: "待处理",
  scheduled: "已安排",
  done: "已完成",
  cancelled: "已取消",
};

const FORM_STATUS_OPTIONS: { value: TodoFormStatus; label: string }[] = [
  { value: "pending", label: "待处理" },
  { value: "done", label: "已完成" },
];

function taskToFormStatus(task: BacklogTask): TodoFormStatus {
  return task.status === "done" ? "done" : "pending";
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <dt className="text-sm text-gray-500 w-20 shrink-0">{label}</dt>
      <dd className="text-sm text-gray-900 flex-1 break-words min-w-0">{children}</dd>
    </div>
  );
}

function ReadOnlyField({
  children,
  multiline = false,
}: {
  children: ReactNode;
  multiline?: boolean;
}) {
  const hasContent =
    children !== null &&
    children !== undefined &&
    children !== false &&
    !(typeof children === "string" && children.trim() === "");
  return (
    <div
      className={`w-full px-2 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-md border border-gray-100 break-words ${
        multiline ? "min-h-[4.5rem] whitespace-pre-wrap" : "min-h-[2.25rem] flex items-center"
      }`}
    >
      {hasContent ? children : null}
    </div>
  );
}

const fieldInputClass =
  "w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-gray-400";

type TodoPanelMode = "view" | "edit" | "create";

interface TodoPanelProps {
  mode: TodoPanelMode;
  task?: BacklogTask;
  title: string;
  description: string;
  context: TaskContext;
  priority: TaskPriority;
  status: TodoFormStatus;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onContextChange: (value: TaskContext) => void;
  onPriorityChange: (value: TaskPriority) => void;
  onStatusChange: (value: TodoFormStatus) => void;
  onSubmit: () => void;
}

function TodoPanel({
  mode,
  task,
  title,
  description,
  context,
  priority,
  status,
  onTitleChange,
  onDescriptionChange,
  onContextChange,
  onPriorityChange,
  onStatusChange,
  onSubmit,
}: TodoPanelProps) {
  const editing = mode === "edit" || mode === "create";

  return (
    <dl className="py-1">
      <DetailRow label="标题">
        {editing ? (
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="待办标题"
            autoFocus={mode === "create" || mode === "edit"}
            onKeyDown={(e) => {
              if (e.key === "Enter" && title.trim()) onSubmit();
            }}
            className={fieldInputClass}
          />
        ) : (
          <ReadOnlyField>{task?.title}</ReadOnlyField>
        )}
      </DetailRow>
      <DetailRow label="描述">
        {editing ? (
          <textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="可选描述"
            rows={3}
            className={`${fieldInputClass} resize-y min-h-[4.5rem]`}
          />
        ) : (
          <ReadOnlyField multiline>{task?.description?.trim() || null}</ReadOnlyField>
        )}
      </DetailRow>
      <DetailRow label="状态">
        {editing ? (
          <StatusSelector value={status} onChange={onStatusChange} />
        ) : (
          <ReadOnlyField>{task ? STATUS_LABELS[task.status] : null}</ReadOnlyField>
        )}
      </DetailRow>
      <DetailRow label="优先级">
        {editing ? (
          <PrioritySelector value={priority} onChange={onPriorityChange} />
        ) : (
          <ReadOnlyField>{task && <PriorityBadge priority={task.priority} />}</ReadOnlyField>
        )}
      </DetailRow>
      <DetailRow label="分类">
        {editing ? (
          <ContextSelector value={context} onChange={onContextChange} />
        ) : (
          <ReadOnlyField>{task && <ContextBadge context={task.context} />}</ReadOnlyField>
        )}
      </DetailRow>
      <DetailRow label="创建时间">
        <ReadOnlyField>
          {task ? formatFullDateTime(task.created_at) : null}
        </ReadOnlyField>
      </DetailRow>
      <DetailRow label="安排日期">
        <ReadOnlyField>
          {task?.scheduled_date ? dayjs(task.scheduled_date).format("YYYY-MM-DD") : null}
        </ReadOnlyField>
      </DetailRow>
      <DetailRow label="完成时间">
        <ReadOnlyField>
          {task?.completed_at ? formatFullDateTime(task.completed_at) : null}
        </ReadOnlyField>
      </DetailRow>
      <DetailRow label="更新时间">
        <ReadOnlyField>
          {task ? formatFullDateTime(task.updated_at) : null}
        </ReadOnlyField>
      </DetailRow>
    </dl>
  );
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const config = getTaskPriorityConfig(priority);
  if (!config) return null;
  return (
    <span
      className="inline-block text-xs px-1.5 py-0.5 rounded font-medium"
      style={{
        backgroundColor: `${config.color}18`,
        color: config.color,
      }}
    >
      {config.label}
    </span>
  );
}

function ContextBadge({ context }: { context: TaskContext }) {
  const config = getTaskContextConfig(context);
  if (!config) return null;
  return (
    <span
      className="inline-block text-xs px-1.5 py-0.5 rounded font-medium"
      style={{
        backgroundColor: `${config.color}12`,
        color: config.color,
      }}
    >
      {config.label}
    </span>
  );
}

function StatusSelector({
  value,
  onChange,
}: {
  value: TodoFormStatus;
  onChange: (value: TodoFormStatus) => void;
}) {
  return (
    <div className="flex items-center flex-wrap gap-1">
      {FORM_STATUS_OPTIONS.map((s) => (
        <button
          key={s.value}
          type="button"
          onClick={() => onChange(s.value)}
          className={`px-2.5 py-1 text-xs rounded-md border transition-all ${
            value === s.value
              ? s.value === "done"
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-indigo-600 bg-indigo-600 text-white"
              : "border-gray-200 text-gray-600 hover:border-gray-300"
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

function PrioritySelector({
  value,
  onChange,
}: {
  value: TaskPriority;
  onChange: (value: TaskPriority) => void;
}) {
  return (
    <div className="flex items-center flex-wrap gap-1">
      {TASK_PRIORITY.map((p) => (
        <button
          key={p.value}
          type="button"
          onClick={() => onChange(p.value)}
          className={`px-2.5 py-1 text-xs rounded-md border transition-all ${
            value === p.value
              ? "border-gray-800 text-white"
              : "border-gray-200 text-gray-600 hover:border-gray-300"
          }`}
          style={
            value === p.value ? { backgroundColor: p.color, borderColor: p.color } : undefined
          }
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

function ContextSelector({
  value,
  onChange,
}: {
  value: TaskContext;
  onChange: (value: TaskContext) => void;
}) {
  return (
    <div className="flex items-center flex-wrap gap-1">
      {TASK_CONTEXT.map((c) => (
        <button
          key={c.value}
          type="button"
          onClick={() => onChange(c.value)}
          className={`px-2.5 py-1 text-xs rounded-md border transition-all ${
            value === c.value
              ? "border-gray-800 bg-gray-800 text-white"
              : "border-gray-200 text-gray-600 hover:border-gray-300"
          }`}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

interface KanbanCardProps {
  task: BacklogTask;
  column: KanbanColumnId;
  draggable: boolean;
  onDragStart: (task: BacklogTask, from: KanbanColumnId) => void;
  onSchedule: (task: BacklogTask) => void;
  onUnschedule: (task: BacklogTask) => void;
  onPriorityChange: (task: BacklogTask, priority: TaskPriority) => void;
  onView: (task: BacklogTask) => void;
  onEdit: (task: BacklogTask) => void;
  onDelete: (task: BacklogTask) => void;
}

function KanbanCard({
  task,
  column,
  draggable,
  onDragStart,
  onSchedule,
  onUnschedule,
  onPriorityChange,
  onView,
  onEdit,
  onDelete,
}: KanbanCardProps) {
  const contextConfig = getTaskContextConfig(task.context);
  const priorityConfig = getTaskPriorityConfig(task.priority);
  const isScheduled = task.status === "scheduled";

  return (
    <div
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart(task, column);
      }}
      className={`group bg-white rounded-md border border-gray-200 p-2.5 hover:border-gray-300 transition-all ${
        draggable ? "cursor-grab active:cursor-grabbing" : ""
      }`}
    >
      <div className="flex items-start gap-1.5">
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => onView(task)}
        >
          <p
            className={`text-sm leading-snug break-words hover:text-gray-600 ${
              column === "done" ? "text-gray-500 hover:text-gray-400" : "text-gray-800"
            }`}
          >
            {task.title}
          </p>
          <div className="flex items-center flex-wrap gap-1 mt-1.5">
            {priorityConfig && column === "active" && (
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
            {column === "active" && isScheduled && task.scheduled_date && (
              <span className="text-[10px] text-blue-600 font-medium">
                {dayjs(task.scheduled_date).format("M月D日")}
              </span>
            )}
            {column === "active" && !isScheduled && (
              <span className="text-[10px] text-gray-400">{formatRelativeTime(task.created_at)}</span>
            )}
            {column === "done" && task.completed_at && (
              <span className="text-[10px] text-gray-400">{formatDateTime(task.completed_at)}</span>
            )}
          </div>
        </div>
      </div>

      {column === "active" && (
        <div className="flex items-center gap-1 mt-1.5 pt-1 border-t border-gray-100">
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
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSchedule(task);
            }}
            className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] text-blue-600 hover:bg-blue-50 rounded"
          >
            <Calendar size={11} />
            {isScheduled ? "改期" : "安排"}
          </button>
          {isScheduled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUnschedule(task);
              }}
              className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] text-amber-600 hover:bg-amber-50 rounded"
            >
              <Undo2 size={11} />
              取消安排
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
      )}

      {column === "done" && (
        <div className="flex items-center gap-1 mt-1.5 pt-1 border-t border-gray-100">
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
      )}
    </div>
  );
}

export function TodosList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const [debouncedQ, setDebouncedQ] = useState(filters.q ?? "");

  const [activeTasks, setActiveTasks] = useState<BacklogTask[]>([]);
  const [doneTasks, setDoneTasks] = useState<BacklogTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formContext, setFormContext] = useState<TaskContext>(DEFAULT_TASK_CONTEXT);
  const [formPriority, setFormPriority] = useState<TaskPriority>(DEFAULT_TASK_PRIORITY);
  const [formStatus, setFormStatus] = useState<TodoFormStatus>("pending");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [schedulingTask, setSchedulingTask] = useState<BacklogTask | null>(null);
  const [viewingTask, setViewingTask] = useState<BacklogTask | null>(null);
  const [detailEditing, setDetailEditing] = useState(false);
  const [detailTitle, setDetailTitle] = useState("");
  const [detailContext, setDetailContext] = useState<TaskContext>(DEFAULT_TASK_CONTEXT);
  const [detailPriority, setDetailPriority] = useState<TaskPriority>(DEFAULT_TASK_PRIORITY);
  const [detailDescription, setDetailDescription] = useState("");
  const [detailStatus, setDetailStatus] = useState<TodoFormStatus>("pending");
  const [scheduleDate, setScheduleDate] = useState<Dayjs>(dayjs());
  const [dragging, setDragging] = useState<{ task: BacklogTask; from: KanbanColumnId } | null>(null);
  const [dropTarget, setDropTarget] = useState<KanbanColumnId | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQ(filters.q ?? ""), 300);
    return () => window.clearTimeout(timer);
  }, [filters.q]);

  const apiFilters = useMemo(
    () => ({ ...filters, q: debouncedQ }),
    [filters, debouncedQ]
  );

  const columnTasks = useMemo(
    () => ({ active: activeTasks, done: doneTasks }),
    [activeTasks, doneTasks]
  );

  const matchCount = activeTasks.length + doneTasks.length;

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

  const applyTaskToColumns = useCallback((task: BacklogTask) => {
    setActiveTasks((prev) => {
      const rest = prev.filter((t) => t.id !== task.id);
      if (task.status === "pending" || task.status === "scheduled") {
        return sortActiveTasks([task, ...rest]);
      }
      return rest;
    });
    setDoneTasks((prev) => {
      const rest = prev.filter((t) => t.id !== task.id);
      return task.status === "done" ? [task, ...rest] : rest;
    });
  }, []);

  const removeTaskFromColumns = useCallback((taskId: string) => {
    setActiveTasks((prev) => prev.filter((t) => t.id !== taskId));
    setDoneTasks((prev) => prev.filter((t) => t.id !== taskId));
  }, []);

  const loadTasks = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent) setLoading(true);
    try {
      const [active, done] = await Promise.all([
        backlogTaskService.list("active", apiFilters),
        backlogTaskService.list("done", apiFilters),
      ]);
      setActiveTasks(sortActiveTasks(active));
      setDoneTasks(done);
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
  }, []);

  const resetDetailDraft = useCallback(() => {
    setDetailEditing(false);
    setDetailTitle("");
    setDetailContext(DEFAULT_TASK_CONTEXT);
    setDetailPriority(DEFAULT_TASK_PRIORITY);
    setDetailDescription("");
    setDetailStatus("pending");
  }, []);

  const populateDetailDraft = useCallback((task: BacklogTask) => {
    setDetailTitle(task.title);
    setDetailContext(task.context);
    setDetailPriority(task.priority);
    setDetailDescription(task.description ?? "");
    setDetailStatus(taskToFormStatus(task));
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
    },
    [populateDetailDraft]
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
    const latest = [...activeTasks, ...doneTasks].find((t) => t.id === viewingTask.id);
    if (latest) {
      setViewingTask(latest);
    } else {
      closeTaskDetail();
    }
  }, [activeTasks, doneTasks, viewingTask, detailEditing, closeTaskDetail]);

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
        status: formStatus,
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
    try {
      applyUpdatedTask({
        ...viewingTask,
        title: detailTitle.trim(),
        context: detailContext,
        priority: detailPriority,
        description: trimmedDescription || undefined,
        status: detailStatus,
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
        status: detailStatus,
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

  const handleComplete = async (task: BacklogTask) => {
    const snapshot = task;
    const optimistic = {
      ...task,
      status: "done" as const,
      completed_at: new Date().toISOString(),
    };
    if (taskMatchesFilters(optimistic, apiFilters)) {
      applyTaskToColumns(optimistic);
    } else {
      removeTaskFromColumns(task.id);
    }
    try {
      const updated = await backlogTaskService.complete(task.id);
      if (taskMatchesFilters(updated, apiFilters)) {
        applyTaskToColumns(updated);
      } else {
        removeTaskFromColumns(updated.id);
      }
    } catch (error) {
      applyTaskToColumns(snapshot);
      console.error("Failed to complete task:", error);
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

  const openSchedule = (task: BacklogTask) => {
    setSchedulingTask(task);
    setScheduleDate(task.scheduled_date ? dayjs(task.scheduled_date) : dayjs());
  };

  const handleSchedule = async () => {
    if (!schedulingTask) return;
    const snapshot = schedulingTask;
    try {
      const updated = await backlogTaskService.schedule(
        schedulingTask.id,
        scheduleDate.format("YYYY-MM-DD")
      );
      if (taskMatchesFilters(updated, apiFilters)) {
        applyTaskToColumns(updated);
      } else {
        removeTaskFromColumns(updated.id);
      }
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

  const handleRevertToInbox = async (task: BacklogTask) => {
    const snapshot = task;
    const optimistic = {
      ...task,
      status: "pending" as const,
      completed_at: undefined,
      scheduled_date: undefined,
      daily_task_id: undefined,
    };
    if (taskMatchesFilters(optimistic, apiFilters)) {
      applyTaskToColumns(optimistic);
    } else {
      removeTaskFromColumns(task.id);
    }
    try {
      const updated = await backlogTaskService.revertToInbox(task.id);
      if (taskMatchesFilters(updated, apiFilters)) {
        applyTaskToColumns(updated);
      } else {
        removeTaskFromColumns(updated.id);
      }
    } catch (error) {
      applyTaskToColumns(snapshot);
      console.error("Failed to revert task:", error);
      message.error("操作失败");
    }
  };

  const handleDrop = async (target: KanbanColumnId) => {
    if (!dragging) return;
    const { task, from } = dragging;
    setDragging(null);
    setDropTarget(null);

    if (target === from) return;

    if (target === "done" && from === "active") {
      await handleComplete(task);
      return;
    }

    if (target === "active" && from === "done") {
      await handleRevertToInbox(task);
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100dvh-5rem)] h-full">
      <TodosFilterBar
        filters={filters}
        matchCount={matchCount}
        onChange={updateFilters}
        onClear={clearFilters}
      />

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
                  {col.id === "active" && (
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
                    <div className="flex items-center justify-center py-8 text-[11px] text-gray-400">
                      {col.id === "active" ? "无匹配" : "无匹配"}
                    </div>
                  ) : (
                    tasks.map((task) => (
                      <KanbanCard
                        key={task.id}
                        task={task}
                        column={col.id}
                        draggable
                        onDragStart={(t, from) => setDragging({ task: t, from })}
                        onSchedule={openSchedule}
                        onUnschedule={handleRevertToInbox}
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
          <TodoPanel
            mode={detailEditing ? "edit" : "view"}
            task={viewingTask}
            title={detailTitle}
            description={detailDescription}
            context={detailContext}
            priority={detailPriority}
            status={detailStatus}
            onTitleChange={setDetailTitle}
            onDescriptionChange={setDetailDescription}
            onContextChange={setDetailContext}
            onPriorityChange={setDetailPriority}
            onStatusChange={setDetailStatus}
            onSubmit={handleDetailSave}
          />
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
        <TodoPanel
          mode="create"
          title={formTitle}
          description={formDescription}
          context={formContext}
          priority={formPriority}
          status={formStatus}
          onTitleChange={setFormTitle}
          onDescriptionChange={setFormDescription}
          onContextChange={setFormContext}
          onPriorityChange={setFormPriority}
          onStatusChange={setFormStatus}
          onSubmit={handleCreateSubmit}
        />
      </Modal>

      <Modal
        title="安排到某天"
        open={!!schedulingTask}
        onOk={handleSchedule}
        onCancel={() => setSchedulingTask(null)}
        okText="确认安排"
        cancelText="取消"
      >
        {schedulingTask && (
          <div className="py-2">
            <p className="text-sm text-gray-600 mb-3">
              将「{schedulingTask.title}」添加到日计划：
            </p>
            <DatePicker
              value={scheduleDate}
              onChange={(date) => date && setScheduleDate(date)}
              className="w-full"
              format="YYYY-MM-DD"
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
