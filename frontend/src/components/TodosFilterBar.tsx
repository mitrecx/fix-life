import { Search, X } from "lucide-react";
import { DatePicker } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import type {
  BacklogContextFilter,
  BacklogDatePreset,
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

const DATE_PRESET_OPTIONS: { value: BacklogDatePreset; label: string }[] = [
  { value: "all", label: "不限" },
  { value: "today", label: "今天" },
  { value: "7d", label: "近 7 天" },
  { value: "30d", label: "近 30 天" },
  { value: "custom", label: "自定义" },
];

interface TodosFilterBarProps {
  filters: BacklogListFilters;
  matchCount: number;
  onChange: (patch: Partial<BacklogListFilters>) => void;
  onClear: () => void;
}

function selectClassName() {
  return "h-8 px-2 text-xs border border-gray-200 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400";
}

export function TodosFilterBar({ filters, matchCount, onChange, onClear }: TodosFilterBarProps) {
  const keyword = filters.q ?? "";
  const timeField = filters.timeField ?? "created";
  const datePreset = filters.datePreset ?? "all";
  const context = filters.context ?? "all";

  const hasActiveFilters =
    keyword.trim().length > 0 || datePreset !== "all" || context !== "all";

  const customFrom = filters.dateFrom ? dayjs(filters.dateFrom) : null;
  const customTo = filters.dateTo ? dayjs(filters.dateTo) : null;

  const handleCustomFrom = (date: Dayjs | null) => {
    onChange({ dateFrom: date?.format("YYYY-MM-DD") });
  };

  const handleCustomTo = (date: Dayjs | null) => {
    onChange({ dateTo: date?.format("YYYY-MM-DD") });
  };

  return (
    <div className="space-y-2 shrink-0">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={keyword}
            onChange={(e) => onChange({ q: e.target.value })}
            placeholder="搜索标题…"
            className="w-full h-8 pl-8 pr-3 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
          />
        </div>

        <select
          value={timeField}
          onChange={(e) => onChange({ timeField: e.target.value as BacklogTimeField })}
          className={selectClassName()}
          disabled={datePreset === "all"}
          title="时间维度"
        >
          {TIME_FIELD_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          value={datePreset}
          onChange={(e) => onChange({ datePreset: e.target.value as BacklogDatePreset })}
          className={selectClassName()}
          title="时间范围"
        >
          {DATE_PRESET_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {datePreset === "custom" && (
          <>
            <DatePicker
              value={customFrom}
              onChange={handleCustomFrom}
              format="YYYY-MM-DD"
              placeholder="开始"
              className="!h-8 text-xs"
              allowClear
            />
            <span className="text-xs text-gray-400">—</span>
            <DatePicker
              value={customTo}
              onChange={handleCustomTo}
              format="YYYY-MM-DD"
              placeholder="结束"
              className="!h-8 text-xs"
              allowClear
            />
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          {CONTEXT_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => onChange({ context: f.value })}
              className={`px-2 py-1 text-xs rounded-md border transition-all ${
                context === f.value
                  ? "bg-gray-900 border-gray-900 text-white"
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-gray-400 ml-auto">{matchCount} 条匹配</span>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-800"
          >
            <X size={12} />
            清除筛选
          </button>
        )}
      </div>
    </div>
  );
}
