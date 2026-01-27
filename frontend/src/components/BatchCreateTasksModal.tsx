import { useState } from "react";
import { Calendar, Loader2 } from "lucide-react";
import { DatePicker, message } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { dailyPlanService } from "@/services/dailyPlanService";
import type { DailyTaskPriority } from "@/types/dailyPlan";
import { DAILY_TASK_PRIORITY } from "@/types/dailyPlan";
import type { BusynessLevel } from "@/types/dailyPlan";

interface BatchCreateTasksModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function BatchCreateTasksModal({ onClose, onSuccess }: BatchCreateTasksModalProps) {
  const [taskTitle, setTaskTitle] = useState("");
  const [startDate, setStartDate] = useState<Dayjs>(dayjs());
  const [endDate, setEndDate] = useState<Dayjs>(dayjs().add(6, "day"));
  const [priority, setPriority] = useState<DailyTaskPriority>("medium");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!taskTitle.trim()) {
      message.error("请输入任务名称");
      return;
    }

    if (startDate.isAfter(endDate)) {
      message.error("开始日期不能晚于结束日期");
      return;
    }

    setIsSubmitting(true);

    try {
      // 生成日期范围内的所有日期
      const dates: string[] = [];
      let current = startDate;
      while (current.isBefore(endDate) || current.isSame(endDate, "day")) {
        dates.push(current.format("YYYY-MM-DD"));
        current = current.add(1, "day");
      }

      // 获取现有的日计划
      const existingPlans = await dailyPlanService.getAll(
        startDate.format("YYYY-MM-DD"),
        endDate.format("YYYY-MM-DD")
      );
      const existingDates = new Set(existingPlans.map((plan) => plan.plan_date));

      // 为每个日期创建任务
      let createdCount = 0;
      let createdPlanCount = 0;

      for (const date of dates) {
        let planId: string;

        if (existingDates.has(date)) {
          // 日计划已存在，使用现有计划
          planId = existingPlans.find((plan) => plan.plan_date === date)!.id;
        } else {
          // 日计划不存在，先创建日计划
          const newPlan = await dailyPlanService.create({
            plan_date: date,
            notes: "",
            busyness_level: "moderate" as BusynessLevel,
          });
          planId = newPlan.id;
          createdPlanCount++;
        }

        // 创建任务
        await dailyPlanService.createTask(planId, {
          title: taskTitle,
          priority,
          status: "todo",
        });
        createdCount++;
      }

      message.success(
        `成功在 ${dates.length} 天创建 ${createdCount} 个任务` +
          (createdPlanCount > 0 ? `（其中新建了 ${createdPlanCount} 个日计划）` : "")
      );

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to batch create tasks:", error);
      message.error("批量创建失败，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  const disabledDate = (current: Dayjs) => {
    // 禁用今天之前的日期
    return current && current.isBefore(dayjs(), "day");
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
              <Calendar className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">批量创建任务</h2>
              <p className="text-sm text-gray-500 mt-0.5">在指定日期范围内创建相同的任务</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 任务名称 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              任务名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="请输入任务名称"
              disabled={isSubmitting}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            />
          </div>

          {/* 日期范围 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                开始日期 <span className="text-red-500">*</span>
              </label>
              <DatePicker
                value={startDate}
                onChange={(date) => date && setStartDate(date)}
                disabledDate={disabledDate}
                disabled={isSubmitting}
                className="w-full"
                placeholder="选择开始日期"
                format="YYYY-MM-DD"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                结束日期 <span className="text-red-500">*</span>
              </label>
              <DatePicker
                value={endDate}
                onChange={(date) => date && setEndDate(date)}
                disabledDate={disabledDate}
                disabled={isSubmitting}
                className="w-full"
                placeholder="选择结束日期"
                format="YYYY-MM-DD"
              />
            </div>
          </div>

          {/* 优先级 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              优先级
            </label>
            <div className="flex gap-2">
              {DAILY_TASK_PRIORITY.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value as DailyTaskPriority)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor:
                      priority === p.value ? `${p.color}15` : "white",
                    color: p.color,
                    ...(priority === p.value ? {
                      boxShadow: `0 0 0 2px ${p.color}`
                    } : {})
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* 提示信息 */}
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-sm text-blue-700">
              💡 提示：如果选择的日期范围内某天还没有日计划，系统会自动创建该日的日计划。
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-6 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                创建中...
              </>
            ) : (
              "批量创建"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
