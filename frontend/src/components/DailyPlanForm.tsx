import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { DailyPlanCreate, DailyPlanUpdate, BusynessLevel } from "@/types/dailyPlan";
import { BUSYNESS_LEVEL } from "@/types/dailyPlan";

interface DailyPlanFormProps {
  onSubmit: (data: DailyPlanCreate | DailyPlanUpdate) => void;
  onCancel: () => void;
  initialData?: DailyPlanCreate | DailyPlanUpdate;
  submitLabel?: string;
  defaultDate?: string;
}

export function DailyPlanForm({
  onSubmit,
  onCancel,
  initialData = {},
  submitLabel = "创建",
  defaultDate = new Date().toISOString().split("T")[0],
}: DailyPlanFormProps) {
  const [planDate, setPlanDate] = useState(initialData.plan_date || defaultDate);
  const [title, setTitle] = useState(initialData.title || "");
  const [busynessLevel, setBusynessLevel] = useState<BusynessLevel | undefined>(initialData.busyness_level);
  const [notes, setNotes] = useState(initialData.notes || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: DailyPlanCreate | DailyPlanUpdate = {
      plan_date: planDate,
    };
    if (title) data.title = title;
    if (busynessLevel) data.busyness_level = busynessLevel;
    if (notes) data.notes = notes;
    onSubmit(data);
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{submitLabel}日计划</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              日期
            </label>
            <input
              type="date"
              value={planDate}
              onChange={(e) => setPlanDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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
              placeholder="例如：今天的学习计划"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              忙碌程度
            </label>
            <div className="grid grid-cols-5 gap-2">
              {BUSYNESS_LEVEL.map((b) => (
                <button
                  key={b.value}
                  type="button"
                  onClick={() => setBusynessLevel(busynessLevel === b.value ? undefined : b.value)}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all ${
                    busynessLevel === b.value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="text-2xl">{b.icon}</span>
                  <span className="text-xs mt-1">{b.label}</span>
                </button>
              ))}
            </div>
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
              placeholder="今天的想法或备注..."
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
