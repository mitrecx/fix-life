import { useState, useMemo, useEffect } from "react";
import { X } from "lucide-react";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import type { DailyPlanCreate, DailyPlanUpdate, BusynessLevel, DailyPlan } from "@/types/dailyPlan";
import { BUSYNESS_LEVEL } from "@/types/dailyPlan";

interface DailyPlanFormProps {
  onSubmit: (data: DailyPlanCreate | DailyPlanUpdate) => void;
  onCancel: () => void;
  initialData?: DailyPlanCreate | DailyPlanUpdate;
  submitLabel?: string;
  defaultDate?: string;
  existingPlans?: DailyPlan[];
}

// 格式化日期为 M月D日
const formatDateLabel = (dateStr: string) => {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
};

// 计算下一个可用的日期
const calculateNextAvailableDate = (existingPlans: DailyPlan[]): string => {
  if (existingPlans.length === 0) {
    return new Date().toISOString().split("T")[0];
  }

  // 找到最新的计划日期
  const latestPlan = existingPlans.reduce((latest, plan) => {
    return plan.plan_date > latest.plan_date ? plan : latest;
  }, existingPlans[0]);

  // 最新日期的后一天
  const latestDate = new Date(latestPlan.plan_date);
  latestDate.setDate(latestDate.getDate() + 1);

  return latestDate.toISOString().split("T")[0];
};

export function DailyPlanForm({
  onSubmit,
  onCancel,
  initialData = {},
  submitLabel = "创建",
  defaultDate,
  existingPlans = [],
}: DailyPlanFormProps) {
  const isEditing = "plan_date" in initialData && initialData.plan_date !== undefined;

  // 计算默认日期
  const calculatedDefaultDate = useMemo(() => {
    if (isEditing && "plan_date" in initialData && initialData.plan_date) {
      return initialData.plan_date;
    }
    return defaultDate || calculateNextAvailableDate(existingPlans);
  }, [isEditing, initialData, defaultDate, existingPlans]);

  const [planDate, setPlanDate] = useState(calculatedDefaultDate);
  const [title, setTitle] = useState(
    initialData.title || (isEditing ? "" : `计划${formatDateLabel(calculatedDefaultDate)}`)
  );
  const [busynessLevel, setBusynessLevel] = useState<BusynessLevel | undefined>(
    initialData.busyness_level || (isEditing ? undefined : "moderate")
  );
  const [notes, setNotes] = useState(initialData.notes || "");

  // 获取已占用的日期集合
  const takenDates = useMemo(() => {
    const editingPlanId = "id" in initialData ? initialData.id : undefined;
    return new Set(
      existingPlans
        .filter(plan => editingPlanId === undefined || plan.id !== editingPlanId)
        .map(plan => plan.plan_date)
    );
  }, [existingPlans, initialData]);

  // 禁用日期的函数
  const disabledDate = (current: dayjs.Dayjs) => {
    if (!current) return false;
    const dateStr = current.format("YYYY-MM-DD");
    return takenDates.has(dateStr);
  };

  // 当日期变化时，如果是新建且标题为空或以"计划"开头，自动更新标题
  useEffect(() => {
    if (!isEditing && (!title || title.startsWith("计划"))) {
      setTitle(`计划${formatDateLabel(planDate)}`);
    }
  }, [planDate, isEditing, title]);

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
    const data: DailyPlanCreate | DailyPlanUpdate = {
      plan_date: planDate,
    };
    if (title) data.title = title;
    if (busynessLevel) data.busyness_level = busynessLevel;
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
              disabledDate={disabledDate}
              format="YYYY年MM月DD日"
              placeholder="选择日期"
              className="w-full"
              style={{ width: "100%" }}
              size="large"
            />
            {takenDates.size > 0 && !isEditing && (
              <p className="text-xs text-gray-500 mt-1">
                已有计划的日期已置灰不可选
              </p>
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
