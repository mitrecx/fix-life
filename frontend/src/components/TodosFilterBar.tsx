import type { ReactNode } from "react";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import type {
  BacklogContextFilter,
  BacklogListFilters,
  BacklogPriorityFilter,
  BacklogTimeField,
} from "@/types/backlogTask";
import { TASK_CONTEXT } from "@/types/taskContext";
import { TASK_PRIORITY } from "@/types/taskPriority";

const CONTEXT_FILTERS: { value: BacklogContextFilter; label: string }[] = [
  { value: "all", label: "全部" },
  ...TASK_CONTEXT.map((c) => ({ value: c.value, label: c.label })),
];

const PRIORITY_FILTERS: { value: BacklogPriorityFilter; label: string; color?: string }[] = [
  { value: "all", label: "全部" },
  ...TASK_PRIORITY.map((p) => ({ value: p.value, label: p.label, color: p.color })),
];

const TIME_FIELD_OPTIONS: { value: BacklogTimeField; label: string }[] = [
  { value: "created", label: "创建时间" },
  { value: "scheduled", label: "安排日期" },
  { value: "completed", label: "完成时间" },
];

const labelClassName = "text-sm font-semibold text-gray-600 shrink-0";
const selectClassName =
  "px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white transition-all";
const datePickerClassName = "!rounded-lg [&_.ant-picker-input>input]:text-sm";
const filterGroupClassName =
  "inline-flex flex-wrap items-center gap-2 sm:gap-2.5 p-2 sm:p-2.5 rounded-lg border border-gray-200 bg-gray-50/90 w-fit max-w-full";

interface TodosFilterBarProps {
  filters: BacklogListFilters;
  matchCount: number;
  onChange: (patch: Partial<BacklogListFilters>) => void;
  onClear: () => void;
  onDataRepair?: () => void;
  selectionMode?: boolean;
  onToggleSelectionMode?: () => void;
}

function FilterGroup({ children }: { children: ReactNode }) {
  return <div className={filterGroupClassName}>{children}</div>;
}

function hasTimeRange(filters: BacklogListFilters): boolean {
  return !!(filters.dateFrom || filters.dateTo);
}

export function TodosFilterBar({
  filters,
  matchCount,
  onChange,
  onClear,
  onDataRepair,
  selectionMode = false,
  onToggleSelectionMode,
}: TodosFilterBarProps) {
  const keyword = filters.q ?? "";
  const timeField = filters.timeField ?? "created";
  const context = filters.context ?? "all";
  const priority = filters.priority ?? "all";

  const hasActiveFilters =
    keyword.trim().length > 0 ||
    hasTimeRange(filters) ||
    context !== "all" ||
    priority !== "all";

  return (
    <div className="p-3 sm:p-4 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-100 shrink-0 space-y-3">
      <div className="flex flex-wrap items-start gap-2 sm:gap-2.5">
        <FilterGroup>
          <label className={labelClassName}>关键词:</label>
          <input
            type="search"
            value={keyword}
            onChange={(e) => onChange({ q: e.target.value })}
            placeholder="搜索标题…"
            className={`w-40 sm:w-52 ${selectClassName}`}
          />
        </FilterGroup>

        <FilterGroup>
          <label className={labelClassName}>时间筛选:</label>
          <select
            value={timeField}
            onChange={(e) => onChange({ timeField: e.target.value as BacklogTimeField })}
            className={selectClassName}
          >
            {TIME_FIELD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <label className={labelClassName}>开始日期:</label>
          <DatePicker
            value={filters.dateFrom ? dayjs(filters.dateFrom) : null}
            onChange={(date) => onChange({ dateFrom: date?.format("YYYY-MM-DD") })}
            allowClear
            format="YYYY-MM-DD"
            placeholder=""
            className={datePickerClassName}
            style={{ width: 148 }}
          />

          <label className={labelClassName}>结束日期:</label>
          <DatePicker
            value={filters.dateTo ? dayjs(filters.dateTo) : null}
            onChange={(date) => onChange({ dateTo: date?.format("YYYY-MM-DD") })}
            allowClear
            format="YYYY-MM-DD"
            placeholder=""
            className={datePickerClassName}
            style={{ width: 148 }}
          />
        </FilterGroup>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
        <FilterGroup>
          <label className={labelClassName}>分类:</label>
          {CONTEXT_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => onChange({ context: f.value })}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                context === f.value
                  ? "text-white shadow-md bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600"
                  : "text-gray-600 bg-gray-100 hover:bg-gray-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </FilterGroup>

        <FilterGroup>
          <label className={labelClassName}>优先级:</label>
          {PRIORITY_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => onChange({ priority: f.value })}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                priority === f.value
                  ? f.value === "all"
                    ? "text-white shadow-md bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600"
                    : "text-white shadow-sm"
                  : "text-gray-600 bg-gray-100 hover:bg-gray-200"
              }`}
              style={
                priority === f.value && f.value !== "all" && f.color
                  ? { backgroundColor: f.color, borderColor: f.color }
                  : undefined
              }
            >
              {f.label}
            </button>
          ))}
        </FilterGroup>

        <div className="inline-flex items-center gap-2 shrink-0 py-1">
          <span className="text-sm text-gray-500">{matchCount} 条匹配</span>
          {onToggleSelectionMode && (
            <button
              type="button"
              onClick={onToggleSelectionMode}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                selectionMode
                  ? "text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                  : "text-gray-600 bg-gray-100 hover:bg-gray-200"
              }`}
            >
              {selectionMode ? "多选中" : "多选"}
            </button>
          )}
          {onDataRepair && (
            <button
              type="button"
              onClick={onDataRepair}
              className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 transition-all"
            >
              数据修复
            </button>
          )}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClear}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
            >
              清除筛选
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
