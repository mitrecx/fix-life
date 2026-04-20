import { useState, useMemo, useEffect } from "react";
import { X } from "lucide-react";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import type { DailyPlanCreate, DailyPlanUpdate } from "@/types/dailyPlan";
import { dailyPlanService } from "@/services/dailyPlanService";

interface DailyPlanFormProps {
  onSubmit: (data: DailyPlanCreate | DailyPlanUpdate) => void;
  onCancel: () => void;
  initialData?: DailyPlanCreate | DailyPlanUpdate;
  submitLabel?: string;
  /** ISO date for new plans; defaults to today */
  defaultDate?: string;
}

const formatDateLabel = (dateStr: string) => {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
};

const todayIso = () => new Date().toISOString().split("T")[0];

export function DailyPlanForm({
  onSubmit,
  onCancel,
  initialData = {},
  submitLabel = "创建",
  defaultDate,
}: DailyPlanFormProps) {
  const isEditing = "plan_date" in initialData && initialData.plan_date !== undefined;

  const calculatedDefaultDate = useMemo(() => {
    if (isEditing && "plan_date" in initialData && initialData.plan_date) {
      return initialData.plan_date;
    }
    return defaultDate || todayIso();
  }, [isEditing, initialData, defaultDate]);

  const [planDate, setPlanDate] = useState(calculatedDefaultDate);
  const [title, setTitle] = useState(
    initialData.title || (isEditing ? "" : `计划${formatDateLabel(calculatedDefaultDate)}`)
  );
  const [notes, setNotes] = useState(initialData.notes || "");
  const [mergeHint, setMergeHint] = useState<string | null>(null);

  useEffect(() => {
    setPlanDate(calculatedDefaultDate);
  }, [calculatedDefaultDate]);

  useEffect(() => {
    if (!isEditing && (!title || title.startsWith("计划"))) {
      setTitle(`计划${formatDateLabel(planDate)}`);
    }
  }, [planDate, isEditing, title]);

  useEffect(() => {
    if (isEditing) {
      setMergeHint(null);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      (async () => {
        try {
          const head = await dailyPlanService.getPlanHeadByDate(planDate);
          if (cancelled) return;
          if (head) {
            setMergeHint(
              `该日期已有计划「${head.title || "无标题"}」，提交将与该计划合并（标题以本次为准，备注追加）`
            );
          } else {
            setMergeHint(null);
          }
        } catch {
          if (!cancelled) setMergeHint(null);
        }
      })();
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [planDate, isEditing]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

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
    if (isEditing) {
      const data: DailyPlanUpdate = {};
      if (title) data.title = title;
      if (notes) data.notes = notes;
      onSubmit(data);
      return;
    }
    const data: DailyPlanCreate = { plan_date: planDate };
    if (title) data.title = title;
    if (notes) data.notes = notes;
    onSubmit(data);
  };

  const handleDateChange = (date: dayjs.Dayjs | null) => {
    if (date) {
      setPlanDate(date.format("YYYY-MM-DD"));
    }
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
            <DatePicker
              value={dayjs(planDate)}
              onChange={handleDateChange}
              disabled={isEditing}
              format="YYYY年MM月DD日"
              placeholder="选择日期"
              className="w-full"
              style={{ width: "100%" }}
              size="large"
            />
            {mergeHint && !isEditing && (
              <p className="text-xs text-amber-700 mt-1.5 bg-amber-50 border border-amber-100 rounded-md px-2 py-1.5">
                {mergeHint}
              </p>
            )}
            {!isEditing && !mergeHint && (
              <p className="text-xs text-gray-500 mt-1">可选择任意日期；若该日已有计划将自动合并</p>
            )}
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
