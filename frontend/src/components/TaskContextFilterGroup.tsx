import type { BacklogContextFilter } from "@/types/backlogTask";
import { TASK_CONTEXT } from "@/types/taskContext";

const CONTEXT_FILTERS: { value: BacklogContextFilter; label: string }[] = [
  { value: "all", label: "全部" },
  ...TASK_CONTEXT.map((c) => ({ value: c.value, label: c.label })),
];

const labelClassName = "text-sm font-semibold text-gray-600 shrink-0";
const filterGroupClassName =
  "inline-flex flex-wrap items-center gap-2 sm:gap-2.5 p-2 sm:p-2.5 rounded-lg border border-gray-200 bg-gray-50/90 w-full md:w-fit max-w-full";

interface TaskContextFilterGroupProps {
  value: BacklogContextFilter;
  onChange: (value: BacklogContextFilter) => void;
  label?: string;
}

export function TaskContextFilterGroup({
  value,
  onChange,
  label = "分类:",
}: TaskContextFilterGroupProps) {
  return (
    <div className={filterGroupClassName}>
      <label className={labelClassName}>{label}</label>
      {CONTEXT_FILTERS.map((f) => (
        <button
          key={f.value}
          type="button"
          onClick={() => onChange(f.value)}
          className={`min-h-[44px] px-3 py-2 text-xs font-medium rounded-lg transition-all ${
            value === f.value
              ? "text-white shadow-md bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600"
              : "text-gray-600 bg-gray-100 hover:bg-gray-200"
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
