import { Plus } from "lucide-react";
import type {
  BacklogContextFilter,
  BacklogListFilters,
  BacklogTimeField,
} from "@/types/backlogTask";
import { TASK_CONTEXT } from "@/types/taskContext";

const CONTEXT_FILTERS: { value: BacklogContextFilter; label: string }[] = [
  { value: "all", label: "全部" },
  ...TASK_CONTEXT.map((c) => ({ value: c.value, label: c.label })),
];

const TIME_FIELD_OPTIONS: { value: BacklogTimeField; label: string }[] = [
  { value: "created", label: "创建时间" },
  { value: "scheduled", label: "安排日期" },
  { value: "completed", label: "完成时间" },
];

const labelClassName = "text-sm font-semibold text-gray-600 shrink-0";
const selectClassName =
  "px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white transition-all";
const dateInputClassName =
  "px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white transition-all";

interface TodosFilterBarProps {
  filters: BacklogListFilters;
  matchCount: number;
  onChange: (patch: Partial<BacklogListFilters>) => void;
  onClear: () => void;
  onAdd: () => void;
}

function hasTimeRange(filters: BacklogListFilters): boolean {
  return !!(filters.dateFrom || filters.dateTo);
}

export function TodosFilterBar({ filters, matchCount, onChange, onClear, onAdd }: TodosFilterBarProps) {
  const keyword = filters.q ?? "";
  const timeField = filters.timeField ?? "created";
  const context = filters.context ?? "all";

  const hasActiveFilters =
    keyword.trim().length > 0 || hasTimeRange(filters) || context !== "all";

  return (
    <div className="p-3 sm:p-4 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-100 shrink-0 space-y-3">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <label className={labelClassName}>关键词:</label>
        <input
          type="search"
          value={keyword}
          onChange={(e) => onChange({ q: e.target.value })}
          placeholder="搜索标题…"
          className={`w-40 sm:w-52 ${selectClassName}`}
        />

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
        <input
          type="date"
          value={filters.dateFrom ?? ""}
          onChange={(e) => onChange({ dateFrom: e.target.value || undefined })}
          className={dateInputClassName}
        />

        <label className={labelClassName}>结束日期:</label>
        <input
          type="date"
          value={filters.dateTo ?? ""}
          onChange={(e) => onChange({ dateTo: e.target.value || undefined })}
          className={dateInputClassName}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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

        <span className="text-sm text-gray-500">{matchCount} 条匹配</span>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClear}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
          >
            清除筛选
          </button>
        )}

        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-2 px-5 py-2.5 text-emerald-700 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-all ml-auto"
        >
          <Plus size={20} />
          <span className="font-medium">新增待办</span>
        </button>
      </div>
    </div>
  );
}
