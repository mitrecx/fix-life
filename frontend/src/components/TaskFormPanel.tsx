import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import type { TaskFormStatus } from "@/types/backlogTask";
import { formStatusLabel, progressToFormStatus } from "@/types/backlogTask";
import type { TaskContext } from "@/types/taskContext";
import { TASK_CONTEXT, getTaskContextConfig } from "@/types/taskContext";
import { TASK_PRIORITY, getTaskPriorityConfig } from "@/types/taskPriority";
import type { TaskPriority } from "@/types/taskPriority";
import { linkifyText } from "@/utils/linkifyText";

const fieldInputClass =
  "w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-gray-400";

export type TaskFormPanelMode = "view" | "edit" | "create";

export interface TaskFormTimestamps {
  createdAt?: string | null;
  scheduledDate?: string | null;
  completedAt?: string | null;
  updatedAt?: string | null;
}

export interface TaskFormPanelProps {
  mode: TaskFormPanelMode;
  title: string;
  description: string;
  context: TaskContext;
  priority: TaskPriority;
  status: TaskFormStatus;
  progress?: number;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onContextChange: (value: TaskContext) => void;
  onPriorityChange: (value: TaskPriority) => void;
  onStatusChange: (value: TaskFormStatus) => void;
  onProgressChange?: (value: number) => void;
  onSubmit?: () => void;
  statusLabel?: string | null;
  timestamps?: TaskFormTimestamps;
  hideStatusFields?: boolean;
  hideTimestamps?: boolean;
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
  onClick,
}: {
  children: ReactNode;
  multiline?: boolean;
  onClick?: () => void;
}) {
  const hasContent =
    children !== null &&
    children !== undefined &&
    children !== false &&
    !(typeof children === "string" && children.trim() === "");
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={`w-full px-2 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-md border border-gray-100 break-words ${
        multiline ? "min-h-[4.5rem] whitespace-pre-wrap" : "min-h-[2.25rem] flex items-center"
      }${onClick ? " cursor-text hover:border-gray-200" : ""}`}
    >
      {hasContent ? children : null}
    </div>
  );
}

function DescriptionField({
  value,
  onChange,
  editing,
}: {
  value: string;
  onChange: (value: string) => void;
  editing: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const trimmed = value.trim();

  useEffect(() => {
    if (!trimmed) {
      setIsEditing(false);
    }
  }, [trimmed]);

  if (!editing) {
    return (
      <ReadOnlyField multiline>
        {trimmed ? linkifyText(value) : null}
      </ReadOnlyField>
    );
  }

  if (isEditing || !trimmed) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setIsEditing(false)}
        onFocus={() => setIsEditing(true)}
        placeholder="可选描述"
        rows={3}
        autoFocus={isEditing}
        className={`${fieldInputClass} resize-y min-h-[4.5rem]`}
      />
    );
  }

  return (
    <ReadOnlyField multiline onClick={() => setIsEditing(true)}>
      {linkifyText(value)}
    </ReadOnlyField>
  );
}

function formatFullDateTime(dateStr: string) {
  return dayjs(dateStr).format("YYYY-MM-DD HH:mm");
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

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function ProgressSliderInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const [draftText, setDraftText] = useState(String(value));

  useEffect(() => {
    setDraftText(String(value));
  }, [value]);

  const applyProgress = (next: number) => {
    const clamped = clampProgress(next);
    onChange(clamped);
    setDraftText(String(clamped));
  };

  const commitDraftText = () => {
    const parsed = Number(draftText);
    if (Number.isFinite(parsed)) {
      applyProgress(parsed);
    } else {
      setDraftText(String(value));
    }
  };

  return (
    <div className="space-y-2 w-full max-w-md">
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={value}
          onChange={(e) => applyProgress(Number(e.target.value))}
          className="flex-1 h-2 accent-indigo-600 cursor-pointer"
          aria-label="进度"
        />
        <div className="flex items-center gap-1 shrink-0">
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            onBlur={commitDraftText}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                commitDraftText();
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="w-16 px-2 py-1 text-sm border border-gray-200 rounded-md text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-indigo-500"
            aria-label="进度百分比"
          />
          <span className="text-xs text-gray-500">%</span>
        </div>
      </div>
      <p className="text-xs text-gray-500">
        {formStatusLabel(progressToFormStatus(value))}
        {value > 0 && value < 100 ? ` · ${value}%` : ""}
      </p>
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

export function TaskFormTimestamps({ timestamps }: { timestamps: TaskFormTimestamps }) {
  return (
    <dl className="py-1">
      <DetailRow label="创建时间">
        <ReadOnlyField>
          {timestamps.createdAt ? formatFullDateTime(timestamps.createdAt) : null}
        </ReadOnlyField>
      </DetailRow>
      <DetailRow label="安排日期">
        <ReadOnlyField>
          {timestamps.scheduledDate
            ? dayjs(timestamps.scheduledDate).format("YYYY-MM-DD")
            : null}
        </ReadOnlyField>
      </DetailRow>
      <DetailRow label="完成时间">
        <ReadOnlyField>
          {timestamps.completedAt ? formatFullDateTime(timestamps.completedAt) : null}
        </ReadOnlyField>
      </DetailRow>
      <DetailRow label="更新时间">
        <ReadOnlyField>
          {timestamps.updatedAt ? formatFullDateTime(timestamps.updatedAt) : null}
        </ReadOnlyField>
      </DetailRow>
    </dl>
  );
}

export function TaskFormPanel({
  mode,
  title,
  description,
  context,
  priority,
  status,
  progress = 0,
  onTitleChange,
  onDescriptionChange,
  onContextChange,
  onPriorityChange,
  onProgressChange,
  onSubmit,
  statusLabel,
  timestamps,
  hideStatusFields = false,
  hideTimestamps = false,
}: TaskFormPanelProps) {
  const editing = mode === "edit" || mode === "create";
  const showTimestamps = mode !== "create" && timestamps !== undefined && !hideTimestamps;
  const showProgressPresets = editing && onProgressChange !== undefined && !hideStatusFields;

  return (
    <dl className="py-1">
      <DetailRow label="标题">
        {editing ? (
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="待办标题"
            autoFocus={mode === "create"}
            onKeyDown={(e) => {
              if (e.key === "Enter" && title.trim()) onSubmit?.();
            }}
            className={fieldInputClass}
          />
        ) : (
          <ReadOnlyField>{title}</ReadOnlyField>
        )}
      </DetailRow>
      <DetailRow label="描述">
        <DescriptionField
          value={description}
          onChange={onDescriptionChange}
          editing={editing}
        />
      </DetailRow>
      {!hideStatusFields && (
      <DetailRow label="状态">
        {editing ? (
          showProgressPresets && onProgressChange ? (
            <ProgressSliderInput value={progress} onChange={onProgressChange} />
          ) : null
        ) : (
          <ReadOnlyField>
            {statusLabel ?? `${formStatusLabel(status)}${progress > 0 && progress < 100 ? ` · ${progress}%` : ""}`}
          </ReadOnlyField>
        )}
      </DetailRow>
      )}
      <DetailRow label="优先级">
        {editing ? (
          <PrioritySelector value={priority} onChange={onPriorityChange} />
        ) : (
          <ReadOnlyField>
            <PriorityBadge priority={priority} />
          </ReadOnlyField>
        )}
      </DetailRow>
      <DetailRow label="分类">
        {editing ? (
          <ContextSelector value={context} onChange={onContextChange} />
        ) : (
          <ReadOnlyField>
            <ContextBadge context={context} />
          </ReadOnlyField>
        )}
      </DetailRow>
      {showTimestamps && timestamps && <TaskFormTimestamps timestamps={timestamps} />}
    </dl>
  );
}

export function taskFormStatusLabel(status: TaskFormStatus): string {
  return formStatusLabel(status);
}
