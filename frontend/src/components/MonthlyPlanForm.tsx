import { useState, useEffect, useMemo } from "react";
import { X } from "lucide-react";
import type { MonthlyPlanCreate, MonthlyPlanUpdate, MonthlyPlan } from "@/types/monthlyPlan";

interface MonthlyPlanFormProps {
  onSubmit: (data: MonthlyPlanCreate | MonthlyPlanUpdate) => void;
  onCancel: () => void;
  initialData?: MonthlyPlanCreate | MonthlyPlanUpdate;
  submitLabel?: string;
  defaultYear?: number;
  existingPlans?: MonthlyPlan[];
}

export function MonthlyPlanForm({
  onSubmit,
  onCancel,
  initialData = {},
  submitLabel = "创建",
  defaultYear = new Date().getFullYear(),
  existingPlans = [],
}: MonthlyPlanFormProps) {
  const [title, setTitle] = useState(initialData.title || "");
  const [notes, setNotes] = useState(initialData.notes || "");
  const [year, setYear] = useState("year" in initialData ? initialData.year : defaultYear);
  const [month, setMonth] = useState(() => {
    // For editing, use the existing month
    if ("month" in initialData) {
      return initialData.month;
    }
    // For creating, calculate default month based on existing plans
    const currentYearPlans = existingPlans.filter(p => p.year === defaultYear);
    if (currentYearPlans.length > 0) {
      const maxMonth = Math.max(...currentYearPlans.map(p => p.month));
      const nextMonth = maxMonth + 1;
      return nextMonth > 12 ? 1 : nextMonth;
    }
    return new Date().getMonth() + 1;
  });

  // Get occupied months for the selected year
  const occupiedMonths = useMemo(() => {
    return existingPlans
      .filter(p => p.year === year)
      .map(p => p.month);
  }, [existingPlans, year]);

  // Check if a month is disabled
  const isMonthDisabled = (m: number) => {
    // When editing, don't disable the current plan's month
    if ("month" in initialData && initialData.month === m) {
      return false;
    }
    return occupiedMonths.includes(m);
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onCancel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // For new plan creation, always include year and month (required fields)
    const isCreating = !("year" in initialData);
    const data: MonthlyPlanCreate | MonthlyPlanUpdate = isCreating
      ? { year, month }
      : {};
    if (title) data.title = title;
    if (notes) data.notes = notes;
    onSubmit(data);
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{submitLabel}月度计划</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                年份
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="2000"
                max="2100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                月份
              </label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m} disabled={isMonthDisabled(m)}>
                    {m}月
                  </option>
                ))}
              </select>
              {occupiedMonths.length >= 12 && (
                <p className="text-xs text-gray-500 mt-1">本年所有月份都已创建计划</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              标题
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例如：2024年1月计划"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              备注
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="其他备注信息..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600 transition-colors"
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
