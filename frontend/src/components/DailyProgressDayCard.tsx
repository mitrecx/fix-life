import { useState, useEffect, useRef } from "react";
import { Trash2, CheckCircle, Circle, Clock, BookOpen } from "lucide-react";
import { Modal, message } from "antd";
import type {
  DailyProgressDay,
  DailyProgressEntry,
  DailyProgressEntryStatus,
} from "@/types/dailyProgress";
import { DAILY_PROGRESS_ENTRY_PRIORITY } from "@/types/dailyProgress";
import { DEFAULT_TASK_CONTEXT, getTaskContextConfig } from "@/types/taskContext";
import { dailyProgressService } from "@/services/dailyProgressService";
import { backlogTaskService } from "@/services/backlogTaskService";
import { TaskCardFillProgress } from "@/components/TaskCardFillProgress";
import { DailySummaryModal } from "@/components/DailySummaryModal";
import { systemSettingsService } from "@/services/systemSettingsService";

interface DailyProgressDayCardProps {
  day: DailyProgressDay;
  onUpdate: () => void;
  onEntryUpdate: (entry: DailyProgressEntry) => void;
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

const sortEntries = (entries: DailyProgressEntry[]) => {
  const priorityOrder = { high: 3, medium: 2, low: 1 };
  return [...entries].sort((a, b) => {
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

const formatProgressDateLabel = (progressDate: string) => {
  const relativeDate = formatDate(progressDate);
  const isRelative = relativeDate === "今天" || relativeDate === "昨天" || relativeDate === "明天";
  return isRelative
    ? `${relativeDate} ${new Date(progressDate).getMonth() + 1}月${new Date(progressDate).getDate()}日`
    : relativeDate;
};

const getEntryProgressSegments = (entry: DailyProgressEntry) => {
  const total = entry.progress_after ?? 0;
  const today = entry.progress_delta ?? 0;
  const past = Math.max(0, total - today);
  return { total, today, past };
};

const isEntryComplete = (entry: DailyProgressEntry) =>
  entry.status === "done" || (entry.progress_after ?? 0) >= 100;

function DailyEntryProgressSlider({
  entry,
  onCommit,
}: {
  entry: DailyProgressEntry;
  onCommit: (entry: DailyProgressEntry, progress: number) => Promise<void>;
}) {
  const { total, past } = getEntryProgressSegments(entry);
  const [value, setValue] = useState(total);
  const [updating, setUpdating] = useState(false);
  const draggingRef = useRef(false);
  const floorRef = useRef(past);

  useEffect(() => {
    const segments = getEntryProgressSegments(entry);
    if (!draggingRef.current) {
      setValue(segments.total);
      floorRef.current = segments.past;
    }
  }, [entry.id, entry.progress_after, entry.progress_delta]);

  const minProgress = floorRef.current;
  const isLocked = minProgress >= 100;
  const todayDelta = Math.max(0, value - minProgress);

  const clampValue = (raw: number) => Math.min(100, Math.max(minProgress, Math.round(raw)));

  const commit = async (next: number) => {
    const clamped = clampValue(next);
    setValue(clamped);
    if (clamped === (entry.progress_after ?? 0)) return;

    setUpdating(true);
    try {
      await onCommit(entry, clamped);
    } catch {
      setValue(entry.progress_after ?? 0);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <TaskCardFillProgress
      value={value}
      min={minProgress}
      pastValue={minProgress}
      todayDelta={todayDelta}
      disabled={isLocked || updating}
      ariaLabel={`${entry.title} 进度`}
      sliderDataAttr="data-daily-progress-slider"
      title={
        isLocked
          ? "进度已满（过往进度 100%）"
          : `过往 ${minProgress}% · 今日 ${Math.max(0, value - minProgress)}% · 拖动不低于 ${minProgress}%`
      }
      onValueChange={(next) => setValue(clampValue(next))}
      onCommit={(next) => {
        void commit(next);
      }}
      onInteractStart={() => {
        draggingRef.current = true;
      }}
      onInteractEnd={() => {
        draggingRef.current = false;
      }}
    />
  );
}

export function DailyProgressDayCard({ day, onUpdate, onEntryUpdate }: DailyProgressDayCardProps) {
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

  const weekdayConfig = getWeekdayConfig(day.progress_date);

  const updateDailyStatus = async (entry: DailyProgressEntry, newStatus: DailyProgressEntryStatus) => {
    await dailyProgressService.updateEntryStatus(entry.id, newStatus);
    onUpdate();
  };

  const handleToggleEntryStatus = async (entry: DailyProgressEntry) => {
    const newStatus: DailyProgressEntryStatus = entry.status === "done" ? "todo" : "done";

    try {
      await updateDailyStatus(entry, newStatus);
    } catch (error) {
      console.error("Failed to update entry status:", error);
      message.error("更新失败");
    }
  };

  const handleLinkedProgressCommit = async (entry: DailyProgressEntry, progress: number) => {
    if (!entry.backlog_task_id) return;

    const past = Math.max(0, (entry.progress_after ?? 0) - (entry.progress_delta ?? 0));
    const progressDelta = Math.max(0, progress - past);
    const nextStatus: DailyProgressEntryStatus = progress >= 100 ? "done" : "todo";

    try {
      await backlogTaskService.update(entry.backlog_task_id, {
        progress,
        progress_plan_date: day.progress_date,
      });

      onEntryUpdate({
        ...entry,
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

  const handleDeleteEntry = async (entryId: string) => {
    Modal.confirm({
      title: "确认删除",
      content: "确定要删除这个任务吗？待办本身会保留。",
      okText: "删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        try {
          await dailyProgressService.deleteEntry(entryId);
          message.success("任务已删除");
          onUpdate();
        } catch (error) {
          console.error("Failed to delete entry:", error);
          message.error("删除失败，请稍后重试");
        }
      },
    });
  };

  const entries = day.daily_progress_entries;

  return (
    <div className={`rounded-xl shadow-md border-2 overflow-hidden mb-3 hover:shadow-lg transition-all duration-300 bg-gradient-to-br ${weekdayConfig.color} ${weekdayConfig.borderColor}`}>
      <div className="px-4 py-3 bg-white/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className={`px-2 py-0.5 text-xs font-medium rounded-lg border flex-shrink-0 ${weekdayConfig.textColor} ${weekdayConfig.tagBg} ${weekdayConfig.borderColor}`}>
              {formatProgressDateLabel(day.progress_date)}
            </span>
            <span className={`px-2 py-0.5 text-xs font-bold rounded-lg flex-shrink-0 ${weekdayConfig.textColor} ${weekdayConfig.tagBg} ${weekdayConfig.borderColor}`}>
              {weekdayConfig.label}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSummaryModal(true)}
              className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
              title="总结"
            >
              <BookOpen size={16} />
            </button>
          </div>
        </div>
      </div>

      <div
        className="px-4 py-3"
        style={{ background: "linear-gradient(to bottom, rgb(249 250 251), rgb(255 255 255))" }}
      >
          <div className="space-y-3">
            {sortEntries(entries).map((entry) => {
              const StatusIcon = STATUS_ICONS[entry.status];
              const priorityConfig = DAILY_PROGRESS_ENTRY_PRIORITY.find((p) => p.value === entry.priority);
              const contextConfig = getTaskContextConfig(entry.context ?? DEFAULT_TASK_CONTEXT);

              return (
                <div
                  key={entry.id}
                  className="flex flex-col bg-white rounded-lg border border-gray-100 group hover:border-indigo-200 transition-all duration-200 overflow-hidden"
                >
                  <div className="flex items-start gap-2 p-2">
                    {!entry.backlog_task_id && (
                      <button
                        onClick={() => handleToggleEntryStatus(entry)}
                        className={`flex-shrink-0 p-0.5 rounded transition-all mt-0.5 ${
                          entry.status === "done"
                            ? "text-emerald-500 bg-emerald-50"
                            : "text-gray-300 hover:text-emerald-400 hover:bg-emerald-50"
                        }`}
                      >
                        <StatusIcon size={16} strokeWidth={2.5} />
                      </button>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 flex-wrap">
                        <span className="flex-1 min-w-0 text-sm font-semibold break-words text-gray-700">
                          {entry.title}
                        </span>
                        {entry.time_slot && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 shrink-0">
                            {entry.time_slot}
                          </span>
                        )}
                      </div>
                      {(contextConfig || priorityConfig) && (
                        <div className="flex items-center gap-2 flex-wrap mt-1.5">
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
                      )}
                    </div>
                    {isEntryComplete(entry) && entry.backlog_task_id && (
                      <span
                        className="shrink-0 inline-flex items-center justify-center rounded-full bg-emerald-50 p-0.5 text-emerald-500 mt-0.5"
                        title="已完成"
                        aria-label="已完成"
                      >
                        <CheckCircle size={14} strokeWidth={2.5} />
                      </span>
                    )}
                    <button
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all shrink-0"
                      title="删除任务"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  {entry.backlog_task_id && (
                    <DailyEntryProgressSlider entry={entry} onCommit={handleLinkedProgressCommit} />
                  )}
                </div>
              );
            })}

            {entries.length === 0 && (
              <div className="text-center py-4 px-3 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <p className="text-xs text-gray-500">暂无任务</p>
              </div>
            )}
          </div>

          {showDailySummary && day.daily_summary && (
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
                    {day.daily_summary.content}
                  </p>
                  {!expandedSummary && day.daily_summary.content && day.daily_summary.content.length > 150 && (
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

      {showSummaryModal && (
        <DailySummaryModal
          dayId={day.id}
          progressDate={formatProgressDateLabel(day.progress_date)}
          onClose={() => setShowSummaryModal(false)}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
}
