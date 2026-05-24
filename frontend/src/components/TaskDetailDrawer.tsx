import { useEffect } from "react";
import { Trash2, Calendar as CalendarIcon, X } from "lucide-react";
import { Calendar, Select } from "antd";
import type { CalendarProps } from "antd";
import type { Dayjs } from "dayjs";
import { TaskFormPanel, taskFormStatusLabel } from "@/components/TaskFormPanel";
import type { BacklogTaskDetail, BacklogOccurrence, TaskFormStatus } from "@/types/backlogTask";
import { applyStatusChange, progressToFormStatus } from "@/types/backlogTask";
import type { TaskContext } from "@/types/taskContext";
import type { TaskPriority } from "@/types/taskPriority";

function scheduleCalendarHeader({
  value,
  onChange,
}: Parameters<NonNullable<CalendarProps<Dayjs>["headerRender"]>>[0]) {
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

export interface TaskDetailDrawerProps {
  open: boolean;
  taskProgress: number;
  detailTitle: string;
  detailDescription: string;
  detailContext: TaskContext;
  detailPriority: TaskPriority;
  detailStatus: TaskFormStatus;
  detailProgress: number;
  detailLoading: boolean;
  taskDetail: BacklogTaskDetail | null;
  isSubmitting: boolean;
  isDone: boolean;
  scheduleDate: Dayjs;
  scheduleOpen: boolean;
  isScheduling: boolean;
  timestamps: {
    createdAt?: string;
    scheduledDate?: string | null;
    completedAt?: string | null;
    updatedAt?: string;
  };
  onCancel: () => void;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onContextChange: (value: TaskContext) => void;
  onPriorityChange: (value: TaskPriority) => void;
  onStatusChange: (value: TaskFormStatus) => void;
  onProgressChange: (value: number) => void;
  onConfirm: () => void;
  onDelete: () => void;
  onToggleSchedule: () => void;
  onScheduleDateChange: (date: Dayjs) => void;
  onConfirmSchedule: () => void;
  onNavigateOccurrence: (occ: BacklogOccurrence) => void;
}

export function TaskDetailDrawer({
  open,
  taskProgress,
  detailTitle,
  detailDescription,
  detailContext,
  detailPriority,
  detailStatus,
  detailProgress,
  detailLoading,
  taskDetail,
  isSubmitting,
  isDone,
  scheduleDate,
  scheduleOpen,
  isScheduling,
  timestamps,
  onCancel,
  onTitleChange,
  onDescriptionChange,
  onContextChange,
  onPriorityChange,
  onStatusChange,
  onProgressChange,
  onConfirm,
  onDelete,
  onToggleSchedule,
  onScheduleDateChange,
  onConfirmSchedule,
  onNavigateOccurrence,
}: TaskDetailDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-white overflow-hidden">
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 shrink-0 bg-white">
        <h2 className="text-base font-semibold text-gray-900">待办详情</h2>
        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          aria-label="取消"
        >
          <X size={18} />
        </button>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4">
        <div className="max-w-3xl mx-auto w-full">
          <TaskFormPanel
            mode="edit"
            title={detailTitle}
            description={detailDescription}
            context={detailContext}
            priority={detailPriority}
            status={detailStatus}
            progress={detailProgress}
            onTitleChange={onTitleChange}
            onDescriptionChange={onDescriptionChange}
            onContextChange={onContextChange}
            onPriorityChange={onPriorityChange}
            onStatusChange={(status) => {
              onStatusChange(status);
              onProgressChange(applyStatusChange(status, detailProgress));
            }}
            onProgressChange={(progress) => {
              onProgressChange(progress);
              onStatusChange(progressToFormStatus(progress));
            }}
            onSubmit={onConfirm}
            statusLabel={taskFormStatusLabel(progressToFormStatus(taskProgress))}
            timestamps={timestamps}
          />

          {!isDone && scheduleOpen && (
            <div className="mt-5 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-600 mb-2">选择要添加到的日期：</p>
              <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg max-w-sm">
                <Calendar
                  fullscreen={false}
                  value={scheduleDate}
                  onSelect={(date) => onScheduleDateChange(date)}
                  headerRender={scheduleCalendarHeader}
                />
                <button
                  type="button"
                  disabled={isScheduling}
                  onClick={onConfirmSchedule}
                  className="mt-3 w-full px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isScheduling ? "安排中…" : "确认安排"}
                </button>
              </div>
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-gray-100 pb-2">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">每日进度记录</h3>
            {detailLoading ? (
              <p className="text-xs text-gray-400">加载中…</p>
            ) : (
              <OccurrenceTimeline
                occurrences={taskDetail?.occurrences ?? []}
                onNavigate={onNavigateOccurrence}
              />
            )}
          </div>
        </div>
      </div>

      <footer className="shrink-0 px-4 py-3 border-t border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto flex flex-wrap items-center gap-2">
          {!isDone && (
            <button
              type="button"
              onClick={onToggleSchedule}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <CalendarIcon size={14} />
              {scheduleOpen ? "收起日历" : "安排到每日进度"}
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition-colors"
          >
            <Trash2 size={14} />
            删除
          </button>
          <span className="flex-1 min-w-[1rem]" />
          <button
            type="button"
            disabled={!detailTitle.trim() || isSubmitting}
            onClick={onConfirm}
            className="px-4 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "提交中…" : "确认"}
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onCancel}
            className="px-4 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            取消
          </button>
        </div>
      </footer>
    </div>
  );
}
