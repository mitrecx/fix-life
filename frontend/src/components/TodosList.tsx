import { useState, useEffect, useCallback, useMemo } from "react";
import { Trash2, Calendar, GripVertical, Undo2, Plus, SquarePen } from "lucide-react";
import { DatePicker, Modal, message } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useSearchParams } from "react-router-dom";
import { backlogTaskService } from "@/services/backlogTaskService";
import { TodosFilterBar } from "@/components/TodosFilterBar";
import type { BacklogTask, BacklogListFilters, BacklogContextFilter } from "@/types/backlogTask";
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
  timeField: "created",
  datePreset: "all",
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

  return {
    q: params.get("q") ?? "",
    context,
    timeField: backlogTaskService.parseTimeField(params.get("time_field")),
    datePreset: backlogTaskService.parseDatePreset(params.get("date_preset")),
    dateFrom: params.get("date_from") ?? undefined,
    dateTo: params.get("date_to") ?? undefined,
  };
}

function filtersToSearchParams(filters: BacklogListFilters): URLSearchParams {
  const params = new URLSearchParams();
  const q = filters.q?.trim();
  if (q) params.set("q", q);
  if (filters.context && filters.context !== "all") params.set("context", filters.context);
  const preset = filters.datePreset ?? "all";
  if (preset !== "all") {
    params.set("date_preset", preset);
    params.set("time_field", filters.timeField ?? "created");
    if (preset === "custom") {
      if (filters.dateFrom) params.set("date_from", filters.dateFrom);
      if (filters.dateTo) params.set("date_to", filters.dateTo);
    }
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

  const preset = filters.datePreset ?? "all";
  if (preset === "all") return true;

  const timeField = filters.timeField ?? "created";
  const raw = taskDateForField(task, timeField);
  if (!raw) return false;

  const { dateFrom, dateTo } = backlogTaskService.resolveDateRange(filters);
  const d = dayjs(raw).format("YYYY-MM-DD");
  if (dateFrom && d < dateFrom) return false;
  if (dateTo && d > dateTo) return false;
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

type TaskFormMode = "create" | "edit";

interface TodoFormFieldsProps {
  title: string;
  context: TaskContext;
  priority: TaskPriority;
  onTitleChange: (value: string) => void;
  onContextChange: (value: TaskContext) => void;
  onPriorityChange: (value: TaskPriority) => void;
  onSubmit: () => void;
}

function TodoFormFields({
  title,
  context,
  priority,
  onTitleChange,
  onContextChange,
  onPriorityChange,
  onSubmit,
}: TodoFormFieldsProps) {
  return (
    <div className="space-y-4 py-1">
      <input
        type="text"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="待办标题"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter" && title.trim()) onSubmit();
        }}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
      />
      <div>
        <p className="text-xs text-gray-500 mb-1.5">优先级</p>
        <div className="flex items-center gap-1">
          {TASK_PRIORITY.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => onPriorityChange(p.value)}
              className={`px-2.5 py-1 text-xs rounded-md border transition-all ${
                priority === p.value
                  ? "border-gray-800 text-white"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
              style={
                priority === p.value ? { backgroundColor: p.color, borderColor: p.color } : undefined
              }
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-1.5">分类</p>
        <div className="flex items-center gap-1">
          {TASK_CONTEXT.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => onContextChange(c.value)}
              className={`px-2.5 py-1 text-xs rounded-md border transition-all ${
                context === c.value
                  ? "border-gray-800 bg-gray-800 text-white"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
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
        {draggable && (
          <GripVertical
            size={13}
            className="text-gray-300 mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          />
        )}
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm text-gray-800 leading-snug break-words cursor-pointer hover:text-gray-600 ${
              column === "done" ? "line-through text-gray-500 hover:text-gray-400" : ""
            }`}
            onClick={() => onEdit(task)}
            title="点击编辑"
          >
            {task.title}
          </p>
          <div className="flex items-center flex-wrap gap-1 mt-1.5">
            {priorityConfig && column === "active" && (
              <button
                type="button"
                title="点击切换优先级"
                onClick={() => {
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
        <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onEdit(task)}
            className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] text-gray-600 hover:bg-gray-100 rounded"
          >
            <SquarePen size={11} />
            编辑
          </button>
          <button
            type="button"
            onClick={() => onSchedule(task)}
            className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] text-blue-600 hover:bg-blue-50 rounded"
          >
            <Calendar size={11} />
            {isScheduled ? "改期" : "安排"}
          </button>
          {isScheduled && (
            <button
              type="button"
              onClick={() => onUnschedule(task)}
              className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] text-gray-500 hover:bg-gray-100 rounded"
            >
              <Undo2 size={11} />
              取消安排
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(task)}
            className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] text-gray-400 hover:text-red-500 hover:bg-red-50 rounded ml-auto"
          >
            <Trash2 size={11} />
            删除
          </button>
        </div>
      )}

      {column === "done" && (
        <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onEdit(task)}
            className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] text-gray-600 hover:bg-gray-100 rounded"
          >
            <SquarePen size={11} />
            编辑
          </button>
          <button
            type="button"
            onClick={() => onDelete(task)}
            className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] text-gray-400 hover:text-red-500 hover:bg-red-50 rounded ml-auto"
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
  const [formMode, setFormMode] = useState<TaskFormMode>("create");
  const [editingTask, setEditingTask] = useState<BacklogTask | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formContext, setFormContext] = useState<TaskContext>(DEFAULT_TASK_CONTEXT);
  const [formPriority, setFormPriority] = useState<TaskPriority>(DEFAULT_TASK_PRIORITY);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [schedulingTask, setSchedulingTask] = useState<BacklogTask | null>(null);
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

  const resetForm = useCallback(() => {
    setFormTitle("");
    setFormContext(DEFAULT_TASK_CONTEXT);
    setFormPriority(DEFAULT_TASK_PRIORITY);
    setEditingTask(null);
    setFormMode("create");
  }, []);

  const openCreateForm = useCallback(() => {
    resetForm();
    setFormOpen(true);
  }, [resetForm]);

  const openEditForm = useCallback((task: BacklogTask) => {
    setFormMode("edit");
    setEditingTask(task);
    setFormTitle(task.title);
    setFormContext(task.context);
    setFormPriority(task.priority);
    setFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setFormOpen(false);
    resetForm();
  }, [resetForm]);

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

  const handleFormSubmit = async () => {
    if (!formTitle.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const snapshot = editingTask;
    try {
      if (formMode === "create") {
        const created = await backlogTaskService.create({
          title: formTitle.trim(),
          context: formContext,
          priority: formPriority,
        });
        closeForm();
        applyUpdatedTask(created);
      } else if (editingTask) {
        applyUpdatedTask({
          ...editingTask,
          title: formTitle.trim(),
          context: formContext,
          priority: formPriority,
        });
        const updated = await backlogTaskService.update(editingTask.id, {
          title: formTitle.trim(),
          context: formContext,
          priority: formPriority,
        });
        closeForm();
        applyUpdatedTask(updated);
      }
    } catch (error) {
      if (formMode === "edit" && snapshot) {
        applyTaskToColumns(snapshot);
      }
      console.error("Failed to save backlog task:", error);
      message.error(formMode === "create" ? "添加失败" : "保存失败");
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

      <button
        type="button"
        onClick={() => openCreateForm()}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 mt-2 text-xs font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 shrink-0 self-start"
      >
        <Plus size={14} />
        新增待办
      </button>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">加载中...</div>
      ) : (
        <div className="flex-1 flex gap-2.5 min-h-0 mt-2.5">
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
                <div className="flex items-center justify-between px-2.5 py-2 border-b border-gray-200/80 bg-white/80 shrink-0">
                  <h2 className="text-xs font-semibold text-gray-700">{col.title}</h2>
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
                        onEdit={openEditForm}
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
        title={formMode === "create" ? "新增待办" : "编辑待办"}
        open={formOpen}
        onOk={handleFormSubmit}
        onCancel={closeForm}
        okText={formMode === "create" ? "添加" : "保存"}
        cancelText="取消"
        confirmLoading={isSubmitting}
        okButtonProps={{ disabled: !formTitle.trim() }}
      >
        <TodoFormFields
          title={formTitle}
          context={formContext}
          priority={formPriority}
          onTitleChange={setFormTitle}
          onContextChange={setFormContext}
          onPriorityChange={setFormPriority}
          onSubmit={handleFormSubmit}
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
