import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Modal, message } from "antd";
import type { MonthlyPlan, MonthlyPlanCreate, MonthlyPlanUpdate } from "@/types/monthlyPlan";
import { monthlyPlanService } from "@/services/monthlyPlanService";
import { MonthlyPlanCard } from "./MonthlyPlanCard";
import { MonthlyPlanForm } from "./MonthlyPlanForm";

// Custom sorting: current month first, then future months ascending, then past months ascending
const sortPlans = (plans: MonthlyPlan[]): MonthlyPlan[] => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  return [...plans].sort((a, b) => {
    const aIsCurrent = a.year === currentYear && a.month === currentMonth;
    const bIsCurrent = b.year === currentYear && b.month === currentMonth;

    // Current month always first
    if (aIsCurrent && !bIsCurrent) return -1;
    if (!aIsCurrent && bIsCurrent) return 1;

    // Calculate month value for sorting (year * 12 + month)
    const aMonthValue = a.year * 12 + a.month;
    const bMonthValue = b.year * 12 + b.month;
    const currentMonthValue = currentYear * 12 + currentMonth;

    // Both are future months or both are past months - sort ascending
    const aIsFuture = aMonthValue > currentMonthValue;
    const bIsFuture = bMonthValue > currentMonthValue;

    if (aIsFuture && bIsFuture) return aMonthValue - bMonthValue;
    if (!aIsFuture && !bIsFuture) return aMonthValue - bMonthValue;

    // Future before past
    return aIsFuture ? -1 : 1;
  });
};

export function MonthlyPlansList() {
  const [plans, setPlans] = useState<MonthlyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MonthlyPlan | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadPlans();
  }, [year]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const data = await monthlyPlanService.getAll(year);
      setPlans(sortPlans(data));
    } catch (error) {
      console.error("Failed to load monthly plans:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: MonthlyPlanCreate | MonthlyPlanUpdate) => {
    try {
      await monthlyPlanService.create(data as MonthlyPlanCreate);
      setShowForm(false);
      loadPlans();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "创建失败，请稍后重试";
      message.error(errorMessage);
    }
  };

  const handleUpdate = async (data: MonthlyPlanUpdate) => {
    if (!editingPlan) return;
    try {
      await monthlyPlanService.update(editingPlan.id, data);
      setEditingPlan(null);
      loadPlans();
    } catch (error) {
      console.error("Failed to update plan:", error);
    }
  };

  const handleDelete = async (planId: string) => {
    Modal.confirm({
      title: "确认删除",
      content: "确定要删除这个月度计划吗？相关的任务也会被删除。",
      okText: "删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        try {
          await monthlyPlanService.delete(planId);
          message.success("月度计划已删除");
          loadPlans();
        } catch (error) {
          console.error("Failed to delete plan:", error);
          message.error("删除失败，请稍后重试");
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with gradient background */}
      <div
        className="rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg"
        style={{
          background: 'linear-gradient(to right, rgb(99 102 241), rgb(168 85 247), rgb(236 72 153))'
        }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1">月度计划</h2>
            <p className="text-white/80 text-xs sm:text-sm">追踪每月目标，一步步实现你的年度计划</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-white text-indigo-600 rounded-lg sm:rounded-xl hover:bg-indigo-50 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-sm"
          >
            <Plus size={18} />
            <span className="font-medium">新建计划</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-gray-600">年份:</label>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white transition-all"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(
              (y) => (
                <option key={y} value={y}>
                  {y}年
                </option>
              )
            )}
          </select>
        </div>

        <button
          onClick={loadPlans}
          className="px-4 py-1.5 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all text-sm font-medium"
        >
          查询
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-200 border-t-indigo-600" />
        </div>
      )}

      {/* Plans List */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.length === 0 ? (
            <div
              className="col-span-full text-center py-16 px-8 rounded-2xl border-2 border-dashed border-gray-300"
              style={{ background: 'linear-gradient(to bottom right, rgb(249 250 251), rgb(243 244 246))' }}
            >
              <div className="text-6xl mb-4">📅</div>
              <p className="text-lg text-gray-600 font-medium">
                {year}年还没有计划
              </p>
              <p className="text-sm text-gray-400 mt-2">点击"新建计划"开始创建你的第一个月度计划</p>
            </div>
          ) : (
            plans.map((plan) => (
              <MonthlyPlanCard
                key={plan.id}
                plan={plan}
                onUpdate={loadPlans}
                onEdit={() => setEditingPlan(plan)}
                onDelete={() => handleDelete(plan.id)}
              />
            ))
          )}
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <MonthlyPlanForm
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
          submitLabel="创建"
          defaultYear={year}
          existingPlans={plans}
        />
      )}

      {/* Edit Form */}
      {editingPlan && (
        <MonthlyPlanForm
          onSubmit={handleUpdate}
          onCancel={() => setEditingPlan(null)}
          initialData={editingPlan}
          submitLabel="保存"
          existingPlans={plans}
        />
      )}
    </div>
  );
}
