import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Trash2, Calendar, GripVertical } from "lucide-react";
import { DatePicker, Modal, message } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { backlogTaskService } from "@/services/backlogTaskService";
import type { BacklogTask, BacklogContextFilter } from "@/types/backlogTask";
import type { TaskContext } from "@/types/taskContext";
import {
  TASK_CONTEXT,
  DEFAULT_TASK_CONTEXT,
  getTaskContextConfig,
} from "@/types/taskContext";

type KanbanColumnId = "inbox" | "scheduled" | "done";

const CONTEXT_FILTERS: { value: BacklogContextFilter; label: string }[] = [
  { value: "all", label: "全部" },
  ...TASK_CONTEXT.map((c) => ({ value: c.value, label: c.label })),
];

const COLUMNS: { id: KanbanColumnId; title: string; hint: string; accent: string }[] = [
  { id: "inbox", title: "收集箱", hint: "随时记录，无需定日期", accent: "border-t-gray-400" },
  { id: "scheduled", title: "已安排", hint: "已分配到具体日期", accent: "border-t-blue-500" },
  { id: "done", title: "已完成", hint: "完成记录与时间", accent: "border-t-emerald-500" },
];

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

interface KanbanCardProps {
  task: BacklogTask;
  column: KanbanColumnId;
  draggable: boolean;
  onDragStart: (task: BacklogTask, from: KanbanColumnId) => void;
  onSchedule: (task: BacklogTask) => void;
  onDelete: (task: BacklogTask) => void;
}

function KanbanCard({ task, column, draggable, onDragStart, onSchedule, onDelete }: KanbanCardProps) {
  const contextConfig = getTaskContextConfig(task.context);

  return (
    <div
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart(task, column);
      }}
      className={`group bg-white rounded-lg border border-gray-200 p-3 hover:border-gray-300 transition-all ${
        draggable ? "cursor-grab active:cursor-grabbing" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        {draggable && (
          <GripVertical
            size={14}
            className="text-gray-300 mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          />
        )}
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm text-gray-800 leading-snug break-words ${
              column === "done" ? "line-through text-gray-500" : ""
            }`}
          >
            {task.title}
          </p>
          <div className="flex items-center flex-wrap gap-1.5 mt-2">
            {contextConfig && (
              <span
                className="text-[11px] px-1.5 py-0.5 rounded font-medium"
                style={{
                  backgroundColor: `${contextConfig.color}12`,
                  color: contextConfig.color,
                }}
              >
                {contextConfig.label}
              </span>
            )}
            {column === "inbox" && (
              <span className="text-[11px] text-gray-400">{formatRelativeTime(task.created_at)}</span>
            )}
            {column === "scheduled" && task.scheduled_date && (
              <span className="text-[11px] text-blue-600 font-medium">
                → {dayjs(task.scheduled_date).format("M月D日")}
              </span>
            )}
            {column === "done" && task.completed_at && (
              <span className="text-[11px] text-gray-400">{formatDateTime(task.completed_at)}</span>
            )}
          </div>
          {column === "done" && task.scheduled_date && (
            <p className="text-[11px] text-gray-400 mt-1">
              曾安排: {dayjs(task.scheduled_date).format("M月D日")}
            </p>
          )}
        </div>
      </div>

      {column !== "done" && (
        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-50 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          {column === "inbox" && (
            <button
              type="button"
              onClick={() => onSchedule(task)}
              className="flex items-center gap-1 px-2 py-1 text-[11px] text-blue-600 hover:bg-blue-50 rounded"
            >
              <Calendar size={12} />
              安排
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(task)}
            className="flex items-center gap-1 px-2 py-1 text-[11px] text-gray-400 hover:text-red-500 hover:bg-red-50 rounded ml-auto"
          >
            <Trash2 size={12} />
            删除
          </button>
        </div>
      )}
    </div>
  );
}

export function TodosList() {
  const [contextFilter, setContextFilter] = useState<BacklogContextFilter>("all");
  const [inboxTasks, setInboxTasks] = useState<BacklogTask[]>([]);
  const [scheduledTasks, setScheduledTasks] = useState<BacklogTask[]>([]);
  const [doneTasks, setDoneTasks] = useState<BacklogTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newContext, setNewContext] = useState<TaskContext>(DEFAULT_TASK_CONTEXT);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [schedulingTask, setSchedulingTask] = useState<BacklogTask | null>(null);
  const [scheduleDate, setScheduleDate] = useState<Dayjs>(dayjs());
  const [dragging, setDragging] = useState<{ task: BacklogTask; from: KanbanColumnId } | null>(null);
  const [dropTarget, setDropTarget] = useState<KanbanColumnId | null>(null);

  const columnTasks = useMemo(
    () => ({ inbox: inboxTasks, scheduled: scheduledTasks, done: doneTasks }),
    [inboxTasks, scheduledTasks, doneTasks]
  );

  const applyTaskToColumns = useCallback((task: BacklogTask) => {
    setInboxTasks((prev) => {
      const rest = prev.filter((t) => t.id !== task.id);
      return task.status === "pending" ? [task, ...rest] : rest;
    });
    setScheduledTasks((prev) => {
      const rest = prev.filter((t) => t.id !== task.id);
      return task.status === "scheduled" ? [task, ...rest] : rest;
    });
    setDoneTasks((prev) => {
      const rest = prev.filter((t) => t.id !== task.id);
      return task.status === "done" ? [task, ...rest] : rest;
    });
  }, []);

  const removeTaskFromColumns = useCallback((taskId: string) => {
    setInboxTasks((prev) => prev.filter((t) => t.id !== taskId));
    setScheduledTasks((prev) => prev.filter((t) => t.id !== taskId));
    setDoneTasks((prev) => prev.filter((t) => t.id !== taskId));
  }, []);

  const loadTasks = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent) setLoading(true);
    try {
      const context = backlogTaskService.contextFilterToParam(contextFilter);
      const [active, done] = await Promise.all([
        backlogTaskService.list("active", context),
        backlogTaskService.list("done", context),
      ]);
      setInboxTasks(active.filter((t) => t.status === "pending"));
      setScheduledTasks(active.filter((t) => t.status === "scheduled"));
      setDoneTasks(done);
    } catch (error) {
      console.error("Failed to load backlog tasks:", error);
      if (!silent) message.error("加载待办失败");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [contextFilter]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const created = await backlogTaskService.create({ title: newTitle.trim(), context: newContext });
      setNewTitle("");
      setNewContext(DEFAULT_TASK_CONTEXT);
      applyTaskToColumns(created);
    } catch (error) {
      console.error("Failed to create backlog task:", error);
      message.error("添加失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = async (task: BacklogTask) => {
    const snapshot = task;
    applyTaskToColumns({
      ...task,
      status: "done",
      completed_at: new Date().toISOString(),
    });
    try {
      const updated = await backlogTaskService.complete(task.id);
      applyTaskToColumns(updated);
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
      applyTaskToColumns(updated);
      setSchedulingTask(null);
    } catch (error) {
      applyTaskToColumns(snapshot);
      console.error("Failed to schedule task:", error);
      message.error("安排失败");
    }
  };

  const handleRevertToInbox = async (task: BacklogTask) => {
    const snapshot = task;
    applyTaskToColumns({
      ...task,
      status: "pending",
      completed_at: undefined,
      scheduled_date: undefined,
      daily_task_id: undefined,
    });
    try {
      const updated = await backlogTaskService.revertToInbox(task.id);
      applyTaskToColumns(updated);
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

    if (target === "scheduled" && from === "inbox") {
      openSchedule(task);
      return;
    }

    if (target === "done" && (from === "inbox" || from === "scheduled")) {
      await handleComplete(task);
      return;
    }

    if (target === "inbox" && (from === "done" || from === "scheduled")) {
      await handleRevertToInbox(task);
      return;
    }
  };

  const totalActive = inboxTasks.length + scheduledTasks.length;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">待办看板</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {totalActive} 项进行中 · {doneTasks.length} 项已完成
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {CONTEXT_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setContextFilter(f.value)}
              className={`px-2.5 py-1 text-xs rounded-md border transition-all ${
                contextFilter === f.value
                  ? "bg-gray-900 border-gray-900 text-white"
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quick add */}
      <form
        onSubmit={handleCreate}
        className="mb-5 flex flex-col sm:flex-row gap-2 p-3 bg-white rounded-lg border border-gray-200"
      >
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="添加待办，或拖入某一列..."
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        />
        <div className="flex items-center gap-2">
          {TASK_CONTEXT.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setNewContext(c.value)}
              className={`px-2 py-1.5 text-xs rounded-md border transition-all ${
                newContext === c.value
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {c.label}
            </button>
          ))}
          <button
            type="submit"
            disabled={isSubmitting || !newTitle.trim()}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 disabled:opacity-50"
          >
            <Plus size={14} />
            添加
          </button>
        </div>
      </form>

      {/* Kanban board */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">加载中...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {COLUMNS.map((col) => {
            const tasks = columnTasks[col.id];
            const isDropHighlight = dropTarget === col.id && dragging && dragging.from !== col.id;

            return (
              <div
                key={col.id}
                className={`rounded-lg bg-gray-100/80 border border-gray-200 overflow-hidden border-t-[3px] ${col.accent}`}
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
                <div className="px-3 py-2.5 border-b border-gray-200/80 bg-gray-50/50">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-800">{col.title}</h2>
                    <span className="text-xs font-medium text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200">
                      {tasks.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">{col.hint}</p>
                </div>

                <div
                  className={`p-2 min-h-[280px] max-h-[calc(100vh-280px)] overflow-y-auto space-y-2 transition-colors ${
                    isDropHighlight ? "bg-blue-50/60 ring-2 ring-inset ring-blue-200" : ""
                  }`}
                >
                  {tasks.length === 0 ? (
                    <div className="flex items-center justify-center h-24 text-xs text-gray-400 border border-dashed border-gray-300 rounded-lg">
                      {col.id === "inbox" ? "拖入或上方添加" : "暂无"}
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

      <p className="text-xs text-gray-400 mt-4 text-center hidden sm:block">
        拖拽：收集箱 ↔ 已安排（选日期）· 拖入已完成 · 已完成/已安排可拖回收集箱
      </p>

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
