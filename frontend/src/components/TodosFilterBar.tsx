import { useState, type ReactNode } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import type {
  BacklogListFilters,
  BacklogPriorityFilter,
  BacklogTimeField,
} from "@/types/backlogTask";
import { TASK_PRIORITY } from "@/types/taskPriority";
import { TaskContextFilterGroup } from "@/components/TaskContextFilterGroup";
import { MobileBottomSheet } from "@/components/MobileBottomSheet";
import { useIsMobile } from "@/hooks/useMediaQuery";

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
  "px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white transition-all min-h-[44px]";
const datePickerClassName = "!rounded-lg [&_.ant-picker-input>input]:text-sm !min-h-[44px]";
const filterGroupClassName =
  "inline-flex flex-wrap items-center gap-2 sm:gap-2.5 p-2 sm:p-2.5 rounded-lg border border-gray-200 bg-gray-50/90 w-full md:w-fit max-w-full";

interface TodosFilterBarProps {
  filters: BacklogListFilters;
  matchCount: number;
  onChange: (patch: Partial<BacklogListFilters>) => void;
  onSearch: () => void;
  onReset: () => void;
  selectionMode?: boolean;
  onToggleSelectionMode?: () => void;
}

function FilterGroup({ children }: { children: ReactNode }) {
  return <div className={filterGroupClassName}>{children}</div>;
}

function hasAdvancedFilters(filters: BacklogListFilters): boolean {
  return !!(
    (filters.priority && filters.priority !== "all") ||
    filters.dateFrom ||
    filters.dateTo
  );
}

function hasActiveFilters(filters: BacklogListFilters): boolean {
  return !!(
    filters.q?.trim() ||
    (filters.context && filters.context !== "all") ||
    hasAdvancedFilters(filters)
  );
}

interface TodosFilterFieldsProps {
  filters: BacklogListFilters;
  onChange: (patch: Partial<BacklogListFilters>) => void;
  moreOpen: boolean;
  stackAdvanced?: boolean;
}

function FilterExpandToggle({
  moreOpen,
  onToggle,
  advancedActive,
}: {
  moreOpen: boolean;
  onToggle: () => void;
  advancedActive: boolean;
}) {
  return (
    <button
      type="button"
      aria-expanded={moreOpen}
      aria-label={moreOpen ? "收起更多筛选" : "展开更多筛选"}
      onClick={onToggle}
      className={`relative shrink-0 hidden md:inline-flex items-center justify-center w-9 h-9 rounded-md transition-all ${
        moreOpen || advancedActive
          ? "text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
          : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
      }`}
    >
      {advancedActive && !moreOpen && (
        <span
          className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-indigo-500"
          aria-hidden
        />
      )}
      <ChevronDown
        size={16}
        className={`transition-transform duration-200 ${moreOpen ? "rotate-180" : ""}`}
      />
    </button>
  );
}

function TodosFilterFields({
  filters,
  onChange,
  moreOpen,
  stackAdvanced = false,
}: TodosFilterFieldsProps) {
  const keyword = filters.q ?? "";
  const timeField = filters.timeField ?? "created";
  const context = filters.context ?? "all";
  const priority = filters.priority ?? "all";

  return (
    <>
      <TaskContextFilterGroup
        value={context}
        onChange={(value) => onChange({ context: value })}
      />

      <FilterGroup>
        <label className={labelClassName}>关键词:</label>
        <input
          type="search"
          value={keyword}
          onChange={(e) => onChange({ q: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
            }
          }}
          placeholder="搜索标题…"
          className={`flex-1 min-w-0 md:w-40 lg:w-52 ${selectClassName}`}
        />
      </FilterGroup>

      {(stackAdvanced || moreOpen) && (
        <div className={`${stackAdvanced ? "space-y-3" : "mt-3 pt-3 border-t border-gray-100"} flex flex-col md:flex-row md:flex-wrap items-start gap-2 sm:gap-2.5`}>
          <FilterGroup>
            <label className={labelClassName}>优先级:</label>
            {PRIORITY_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => onChange({ priority: f.value })}
                className={`min-h-[44px] px-3 py-2 text-xs font-medium rounded-lg transition-all ${
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
              style={{ width: "100%", maxWidth: 148 }}
            />

            <label className={labelClassName}>结束日期:</label>
            <DatePicker
              value={filters.dateTo ? dayjs(filters.dateTo) : null}
              onChange={(date) => onChange({ dateTo: date?.format("YYYY-MM-DD") })}
              allowClear
              format="YYYY-MM-DD"
              placeholder=""
              className={datePickerClassName}
              style={{ width: "100%", maxWidth: 148 }}
            />
          </FilterGroup>
        </div>
      )}
    </>
  );
}

export function TodosFilterBar({
  filters,
  matchCount,
  onChange,
  onSearch,
  onReset,
  selectionMode = false,
  onToggleSelectionMode,
}: TodosFilterBarProps) {
  const isMobile = useIsMobile();
  const [moreOpen, setMoreOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const active = hasActiveFilters(filters);
  const advancedActive = hasAdvancedFilters(filters);

  const actionButtons = (
    <>
      <button
        type="button"
        onClick={onReset}
        className="min-h-[44px] px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
      >
        重置
      </button>
      <button
        type="button"
        onClick={onSearch}
        className="min-h-[44px] px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-all"
      >
        查询
      </button>
      <span className="text-sm text-gray-500 tabular-nums self-center">{matchCount} 条匹配</span>
      {onToggleSelectionMode && (
        <button
          type="button"
          onClick={onToggleSelectionMode}
          className={`min-h-[44px] px-3 py-2 text-xs font-medium rounded-lg transition-all ${
            selectionMode
              ? "text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
              : "text-gray-600 bg-gray-100 hover:bg-gray-200"
          }`}
        >
          {selectionMode ? "多选中" : "多选"}
        </button>
      )}
    </>
  );

  if (isMobile) {
    return (
      <>
        <div className="p-3 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-100 shrink-0 space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="search"
              value={filters.q ?? ""}
              onChange={(e) => onChange({ q: e.target.value })}
              placeholder="搜索标题…"
              className={`flex-1 min-w-0 ${selectClassName}`}
            />
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className={`relative shrink-0 flex h-11 w-11 items-center justify-center rounded-lg border transition-all ${
                active
                  ? "border-indigo-200 bg-indigo-50 text-indigo-600"
                  : "border-gray-200 bg-white text-gray-600"
              }`}
              aria-label="筛选"
            >
              {active && (
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-indigo-500" aria-hidden />
              )}
              <SlidersHorizontal size={18} />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">{actionButtons}</div>
        </div>

        <MobileBottomSheet open={drawerOpen} onClose={() => setDrawerOpen(false)} title="筛选待办">
          <div className="space-y-3">
            <TodosFilterFields
              filters={filters}
              onChange={onChange}
              moreOpen
              stackAdvanced
            />
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">{actionButtons}</div>
          </div>
        </MobileBottomSheet>
      </>
    );
  }

  return (
    <div className="p-3 sm:p-4 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-100 shrink-0">
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full">
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 flex-1 min-w-0">
          <TodosFilterFields
            filters={filters}
            onChange={onChange}
            moreOpen={moreOpen}
          />
          <div className="inline-flex flex-wrap items-center gap-2 shrink-0 py-1">{actionButtons}</div>
        </div>
        <FilterExpandToggle
          moreOpen={moreOpen}
          onToggle={() => setMoreOpen((open) => !open)}
          advancedActive={advancedActive}
        />
      </div>
    </div>
  );
}
