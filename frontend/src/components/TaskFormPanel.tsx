import type { ReactNode } from "react";
import dayjs from "dayjs";
import type { TaskFormStatus } from "@/types/backlogTask";
import type { TaskContext } from "@/types/taskContext";
import { TASK_CONTEXT, getTaskContextConfig } from "@/types/taskContext";
import { TASK_PRIORITY, getTaskPriorityConfig } from "@/types/taskPriority";
import type { TaskPriority } from "@/types/taskPriority";

const FORM_STATUS_OPTIONS: { value: TaskFormStatus; label: string }[] = [
  { value: "pending", label: "待处理" },
  { value: "done", label: "已完成" },
];

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
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onContextChange: (value: TaskContext) => void;
  onPriorityChange: (value: TaskPriority) => void;
  onStatusChange: (value: TaskFormStatus) => void;
  onSubmit?: () => void;
  /** View-mode status label override (e.g. backlog "已安排"). */
  statusLabel?: string | null;
  timestamps?: TaskFormTimestamps;
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

function StatusSelector({
  value,
  onChange,
}: {
  value: TaskFormStatus;
  onChange: (value: TaskFormStatus) => void;
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

export function TaskFormPanel({
  mode,
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
  statusLabel,
  timestamps,
}: TaskFormPanelProps) {
  const editing = mode === "edit" || mode === "create";
  const showTimestamps = mode !== "create" && timestamps !== undefined;

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
              if (e.key === "Enter" && title.trim()) onSubmit?.();
            }}
            className={fieldInputClass}
          />
        ) : (
          <ReadOnlyField>{title}</ReadOnlyField>
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
          <ReadOnlyField multiline>{description.trim() || null}</ReadOnlyField>
        )}
      </DetailRow>
      <DetailRow label="状态">
        {editing ? (
          <StatusSelector value={status} onChange={onStatusChange} />
        ) : (
          <ReadOnlyField>{statusLabel ?? null}</ReadOnlyField>
        )}
      </DetailRow>
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
      {showTimestamps && (
        <>
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
        </>
      )}
    </dl>
  );
}

export function taskFormStatusLabel(status: TaskFormStatus): string {
  return status === "done" ? "已完成" : "待处理";
}
