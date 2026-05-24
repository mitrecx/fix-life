import { useState, useEffect, useMemo, useRef } from "react";
import { Edit, Trash2, Plus, CheckCircle, Circle, Clock, ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import { Modal, message } from "antd";
import type { DailyPlan, DailyTask, DailyTaskStatus } from "@/types/dailyPlan";
import { DAILY_TASK_PRIORITY } from "@/types/dailyPlan";
import { DEFAULT_TASK_CONTEXT, getTaskContextConfig } from "@/types/taskContext";
import { dailyPlanService } from "@/services/dailyPlanService";
import { backlogTaskService } from "@/services/backlogTaskService";
import { DailySummaryModal } from "@/components/DailySummaryModal";
import { AddToTodayModal } from "@/components/AddToTodayModal";
import { systemSettingsService } from "@/services/systemSettingsService";

interface DailyPlanCardProps {
  plan: DailyPlan;
  onUpdate: () => void;
  onTaskUpdate: (task: DailyTask) => void;
  onEdit: () => void;
  onDelete: () => void;
}

const STATUS_ICONS = {
  todo: Circle,
  "in-progress": Clock,
  done: CheckCircle,
  cancelled: Circle,
};

const WEEKDAY_CONFIG = [
  { day: 1, label: "周一", color: "from-blue-50 to-blue-100", borderColor: "border-blue-200", textColor: "text-blue-700", tagBg: "bg-blue-100" },
  { day: 2, label: "周二", color: "from-purple-50 to-purple-100", borderColor: "border-purple-200", textColor: "text-purple-700", tagBg: "bg-purple-100" },
  { day: 3, label: "周三", color: "from-pink-50 to-pink-100", borderColor: "border-pink-200", textColor: "text-pink-700", tagBg: "bg-pink-100" },
  { day: 4, label: "周四", color: "from-orange-50 to-orange-100", borderColor: "border-orange-200", textColor: "text-orange-700", tagBg: "bg-orange-100" },
  { day: 5, label: "周五", color: "from-emerald-50 to-emerald-100", borderColor: "border-emerald-200", textColor: "text-emerald-700", tagBg: "bg-emerald-100" },
  { day: 6, label: "周六", color: "from-cyan-50 to-cyan-100", borderColor: "border-cyan-200", textColor: "text-cyan-700", tagBg: "bg-cyan-100" },
  { day: 0, label: "周日", color: "from-rose-50 to-rose-100", borderColor: "border-rose-200", textColor: "text-rose-700", tagBg: "bg-rose-100" },
];

const getWeekdayConfig = (dateStr: string) => {
  const date = new Date(dateStr);
  const day = date.getDay();
  return WEEKDAY_CONFIG.find((w) => w.day === day) || WEEKDAY_CONFIG[6];
};

const getProgressColor = (rate: number) => {
  if (rate === 100) return "linear-gradient(to right, rgb(52 211 153), rgb(34 197 94))";
  if (rate >= 50) return "linear-gradient(to right, rgb(96 165 250), rgb(99 102 241))";
  if (rate >= 25) return "linear-gradient(to right, rgb(251 191 36), rgb(249 115 22))";
  return "linear-gradient(to right, rgb(156 163 175), rgb(100 116 139))";
};

const sortTasks = (tasks: DailyTask[]) => {
  const priorityOrder = { high: 3, medium: 2, low: 1 };
  return [...tasks].sort((a, b) => {
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return "今天";
  if (date.toDateString() === yesterday.toDateString()) return "昨天";
  if (date.toDateString() === tomorrow.toDateString()) return "明天";
  return `${date.getMonth() + 1}月${date.getDate()}日`;
};

const formatProgress = (value: number | null | undefined) => `${value ?? 0}%`;

const formatProgressDelta = (delta: number | null | undefined) => {
  const value = delta ?? 0;
  if (value > 0) return `+${value}%`;
  return "0%";
};

const getTaskProgressSegments = (task: DailyTask) => {
  const total = task.progress_after ?? 0;
  const today = task.progress_delta ?? 0;
  const past = Math.max(0, total - today);
  return { total, today, past };
};

const buildThreeSegmentTrackStyle = (past: number, current: number) => ({
  background: `linear-gradient(to right,
    rgb(148 163 184) 0%, rgb(148 163 184) ${past}%,
    rgb(245 158 11) ${past}%, rgb(245 158 11) ${current}%,
    rgb(229 231 235) ${current}%, rgb(229 231 235) 100%)`,
});

function DailyTaskProgressSlider({
  task,
  onCommit,
}: {
  task: DailyTask;
  onCommit: (task: DailyTask, progress: number) => Promise<void>;
}) {
  const { total, past } = getTaskProgressSegments(task);
  const [value, setValue] = useState(total);
  const [updating, setUpdating] = useState(false);
  const draggingRef = useRef(false);
  const floorRef = useRef(past);

  useEffect(() => {
    const segments = getTaskProgressSegments(task);
    if (!draggingRef.current) {
      setValue(segments.total);
      floorRef.current = segments.past;
    }
  }, [task.id, task.progress_after, task.progress_delta]);

  const minProgress = floorRef.current;
  const isLocked = minProgress >= 100;

  const clampValue = (raw: number) => Math.min(100, Math.max(minProgress, Math.round(raw)));

  const commit = async (next: number) => {
    const clamped = clampValue(next);
    setValue(clamped);
    if (clamped === (task.progress_after ?? 0)) return;

    setUpdating(true);
    try {
      await onCommit(task, clamped);
    } catch {
      setValue(task.progress_after ?? 0);
    } finally {
      setUpdating(false);
    }
  };

  const beginInteraction = (event: React.SyntheticEvent) => {
    event.stopPropagation();
    draggingRef.current = true;
  };

  const endInteraction = (event: React.SyntheticEvent, nextValue?: number) => {
    event.stopPropagation();
    draggingRef.current = false;
    if (nextValue != null) {
      void commit(nextValue);
    }
  };

  const trackStyle = buildThreeSegmentTrackStyle(minProgress, value);

  return (
    <div
      data-daily-progress-slider
      className="w-full mt-1.5 flex items-center gap-2 touch-none"
      onPointerDown={beginInteraction}
      onTouchStart={beginInteraction}
      onClick={(e) => e.stopPropagation()}
      onDragStart={(e) => e.preventDefault()}
      title={
        isLocked
          ? "进度已满（过往进度 100%）"
          : `过往 ${minProgress}% · 今日 ${Math.max(0, value - minProgress)}% · 拖动不低于 ${minProgress}%`
      }
    >
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        disabled={isLocked || updating}
        draggable={false}
        style={trackStyle}
        onDragStart={(e) => e.preventDefault()}
        onChange={(e) => setValue(clampValue(Number(e.target.value)))}
        onPointerUp={(e) => endInteraction(e, clampValue(Number(e.currentTarget.value)))}
        onMouseUp={(e) => endInteraction(e, clampValue(Number(e.currentTarget.value)))}
        onTouchEnd={(e) => endInteraction(e, clampValue(Number(e.currentTarget.value)))}
        onPointerCancel={(e) => endInteraction(e)}
        onBlur={(e) => endInteraction(e, clampValue(Number(e.currentTarget.value)))}
        onKeyUp={(e) => endInteraction(e, clampValue(Number(e.currentTarget.value)))}
        className="kanban-progress-range flex-1 h-1.5 rounded-full appearance-none cursor-pointer disabled:cursor-default disabled:opacity-60
          [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:appearance-none
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white
          [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:-mt-[3px]
          [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent
          [&::-moz-range-progress]:h-1.5 [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-amber-500
          [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-amber-500"
        aria-label={`${task.title} 进度`}
      />
      <span className="text-xs text-amber-600 font-medium tabular-nums shrink-0 w-8 text-right">
        {value}%
      </span>
    </div>
  );
}

export function DailyPlanCard({ plan, onUpdate, onTaskUpdate, onEdit, onDelete }: DailyPlanCardProps) {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [isTaskSectionCollapsed, setIsTaskSectionCollapsed] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showDailySummary, setShowDailySummary] = useState(false);
  const [expandedSummary, setExpandedSummary] = useState(false);
  useEffect(() => {
    const loadSettings = async () => {
      const settings = await systemSettingsService.getSettings();
      setShowDailySummary(settings.show_daily_summary);
    };
    loadSettings();
  }, []);

  const weekdayConfig = getWeekdayConfig(plan.plan_date);
  const progressColor = getProgressColor(plan.completion_rate);

  const existingBacklogIds = useMemo(() => {
    const ids = new Set<string>();
    for (const task of plan.daily_tasks) {
      if (task.backlog_task_id) ids.add(task.backlog_task_id);
    }
    return ids;
  }, [plan.daily_tasks]);

  const updateDailyStatus = async (task: DailyTask, newStatus: DailyTaskStatus) => {
    await dailyPlanService.updateTaskStatus(task.id, newStatus);
    onUpdate();
  };

  const handleToggleTaskStatus = async (task: DailyTask) => {
    const newStatus: DailyTaskStatus = task.status === "done" ? "todo" : "done";

    try {
      await updateDailyStatus(task, newStatus);
    } catch (error) {
      console.error("Failed to update task status:", error);
      message.error("更新失败");
    }
  };

  const handleLinkedProgressCommit = async (task: DailyTask, progress: number) => {
    if (!task.backlog_task_id) return;

    const past = Math.max(0, (task.progress_after ?? 0) - (task.progress_delta ?? 0));
    const progressDelta = Math.max(0, progress - past);
    const nextStatus: DailyTaskStatus = progress >= 100 ? "done" : "todo";

    try {
      await backlogTaskService.update(task.backlog_task_id, {
        progress,
        progress_plan_date: plan.plan_date,
      });

      onTaskUpdate({
        ...task,
        status: nextStatus,
        progress_after: progress,
        progress_delta: progressDelta,
      });
    } catch (error) {
      console.error("Failed to update task progress:", error);
      message.error("更新进度失败");
      throw error;
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    Modal.confirm({
      title: "确认删除",
      content: "确定要删除这个任务吗？待办本身会保留。",
      okText: "删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        try {
          await dailyPlanService.deleteTask(taskId);
          message.success("任务已删除");
          onUpdate();
        } catch (error) {
          console.error("Failed to delete task:", error);
          message.error("删除失败，请稍后重试");
        }
      },
    });
  };

  return (
    <div className={`rounded-xl shadow-md border-2 overflow-hidden mb-3 hover:shadow-lg transition-all duration-300 bg-gradient-to-br ${weekdayConfig.color} ${weekdayConfig.borderColor}`}>
      <div className="px-4 py-3 bg-white/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className={`px-2 py-0.5 text-xs font-medium rounded-lg border flex-shrink-0 ${weekdayConfig.textColor} ${weekdayConfig.tagBg} ${weekdayConfig.borderColor}`}>
              {(() => {
                const relativeDate = formatDate(plan.plan_date);
                const isRelative = relativeDate === "今天" || relativeDate === "昨天" || relativeDate === "明天";
                return isRelative
                  ? `${relativeDate} ${new Date(plan.plan_date).getMonth() + 1}月${new Date(plan.plan_date).getDate()}日`
                  : relativeDate;
              })()}
            </span>
            <span className={`px-2 py-0.5 text-xs font-bold rounded-lg flex-shrink-0 ${weekdayConfig.textColor} ${weekdayConfig.tagBg} ${weekdayConfig.borderColor}`}>
              {weekdayConfig.label}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {plan.total_tasks > 0 && (
              <button
                onClick={() => setIsTaskSectionCollapsed(!isTaskSectionCollapsed)}
                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                title={isTaskSectionCollapsed ? "展开任务" : "收起任务"}
              >
                {isTaskSectionCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              </button>
            )}
            <button
              onClick={onEdit}
              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
              title="编辑"
            >
              <Edit size={16} />
            </button>
            <button
              onClick={() => setShowSummaryModal(true)}
              className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
              title="总结"
            >
              <BookOpen size={16} />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              title="删除"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>

      {plan.total_tasks > 0 && !isTaskSectionCollapsed && (
        <div className="px-4 py-2 bg-white">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-gray-600">
              {plan.completed_tasks}/{plan.total_tasks}
            </span>
            <span className={`font-semibold ${plan.completion_rate === 100 ? "text-emerald-600" : "text-indigo-600"}`}>
              {plan.completion_rate.toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${plan.completion_rate}%`, background: progressColor }}
            />
          </div>
        </div>
      )}

      {!isTaskSectionCollapsed && (
        <div
          className="px-4 py-3"
          style={{ background: "linear-gradient(to bottom, rgb(249 250 251), rgb(255 255 255))" }}
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-gray-700">任务清单</h4>
            <button
              onClick={() => setAddModalOpen(true)}
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
            >
              <Plus size={14} />
              添到今日
            </button>
          </div>

          <div className="space-y-1.5">
            {sortTasks(plan.daily_tasks).map((task) => {
              const StatusIcon = STATUS_ICONS[task.status];
              const priorityConfig = DAILY_TASK_PRIORITY.find((p) => p.value === task.priority);
              const contextConfig = getTaskContextConfig(task.context ?? DEFAULT_TASK_CONTEXT);

              return (
                <div
                  key={task.id}
                  className="flex items-start gap-2 p-2 bg-white rounded-lg border border-gray-100 group hover:border-indigo-200 transition-all duration-200"
                >
                  {!task.backlog_task_id && (
                    <button
                      onClick={() => handleToggleTaskStatus(task)}
                      className={`flex-shrink-0 p-0.5 rounded transition-all mt-0.5 ${
                        task.status === "done"
                          ? "text-emerald-500 bg-emerald-50"
                          : "text-gray-300 hover:text-emerald-400 hover:bg-emerald-50"
                      }`}
                    >
                      <StatusIcon size={16} strokeWidth={2.5} />
                    </button>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`flex-1 min-w-0 text-sm break-words ${
                          task.status === "done" ? "text-gray-400" : "text-gray-700"
                        }`}
                      >
                        {task.title}
                      </span>
                      {task.time_slot && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                          {task.time_slot}
                        </span>
                      )}
                      {contextConfig && (
                        <span
                          className="text-xs px-2 py-0.5 rounded font-medium"
                          style={{
                            backgroundColor: `${contextConfig.color}15`,
                            color: contextConfig.color,
                            border: `1px solid ${contextConfig.color}30`,
                          }}
                        >
                          {contextConfig.label}
                        </span>
                      )}
                      {priorityConfig && (
                        <span
                          className="text-xs px-2 py-0.5 rounded font-medium"
                          style={{
                            backgroundColor: `${priorityConfig.color}15`,
                            color: priorityConfig.color,
                            border: `1px solid ${priorityConfig.color}30`,
                          }}
                        >
                          {priorityConfig.label}
                        </span>
                      )}
                    </div>
                    {task.backlog_task_id && (
                      <DailyTaskProgressSlider task={task} onCommit={handleLinkedProgressCommit} />
                    )}
                    {task.backlog_task_id && (
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-500 tabular-nums">
                          总进度 {formatProgress(task.progress_after)}
                        </span>
                        <span className="text-xs text-amber-600 font-medium tabular-nums">
                          当日 {formatProgressDelta(task.progress_delta)}
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all shrink-0"
                    title="删除任务"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}

            {plan.daily_tasks.length === 0 && (
              <div className="text-center py-4 px-3 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <p className="text-xs text-gray-500">暂无任务</p>
              </div>
            )}
          </div>

          {showDailySummary && plan.daily_summary && (
            <div className="mt-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                    <BookOpen size={14} className="text-amber-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="text-xs font-semibold text-amber-800 mb-1">每日总结</h5>
                  <p className={`text-sm text-amber-900 whitespace-pre-wrap ${expandedSummary ? "" : "line-clamp-6"}`}>
                    {plan.daily_summary.content}
                  </p>
                  {!expandedSummary && plan.daily_summary.content && plan.daily_summary.content.length > 150 && (
                    <button
                      onClick={() => setExpandedSummary(true)}
                      className="mt-1.5 text-xs font-medium text-amber-700 hover:text-amber-800 transition-colors"
                    >
                      显示更多 ▼
                    </button>
                  )}
                  {expandedSummary && (
                    <button
                      onClick={() => setExpandedSummary(false)}
                      className="mt-1.5 text-xs font-medium text-amber-700 hover:text-amber-800 transition-colors"
                    >
                      收起 ▲
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <AddToTodayModal
        open={addModalOpen}
        planId={plan.id}
        planDate={plan.plan_date}
        existingBacklogIds={existingBacklogIds}
        onClose={() => setAddModalOpen(false)}
        onSuccess={onUpdate}
      />

      {showSummaryModal && (
        <DailySummaryModal
          planId={plan.id}
          planDate={(() => {
            const relativeDate = formatDate(plan.plan_date);
            const isRelative = relativeDate === "今天" || relativeDate === "昨天" || relativeDate === "明天";
            return isRelative
              ? `${relativeDate} ${new Date(plan.plan_date).getMonth() + 1}月${new Date(plan.plan_date).getDate()}日`
              : relativeDate;
          })()}
          onClose={() => setShowSummaryModal(false)}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
}
