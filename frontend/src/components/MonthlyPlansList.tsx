import { useState, useEffect } from "react";
import { Plus, RotateCw } from "lucide-react";
import type { MonthlyPlan, MonthlyPlanCreate, MonthlyPlanUpdate } from "@/types/monthlyPlan";
import { monthlyPlanService } from "@/services/monthlyPlanService";
import { MonthlyPlanCard } from "./MonthlyPlanCard";
import { MonthlyPlanForm } from "./MonthlyPlanForm";

export function MonthlyPlansList() {
  const [plans, setPlans] = useState<MonthlyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MonthlyPlan | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState<number | undefined>(new Date().getMonth() + 1);

  useEffect(() => {
    loadPlans();
  }, [year, month]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const data = await monthlyPlanService.getAll(year, month);
      setPlans(data);
    } catch (error) {
      console.error("Failed to load monthly plans:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: MonthlyPlanCreate) => {
    try {
      await monthlyPlanService.create(data);
      setShowForm(false);
      loadPlans();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "创建失败，请稍后重试";
      alert(errorMessage);
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
    if (!confirm("确定要删除这个月度计划吗？相关的任务也会被删除。")) return;

    try {
      await monthlyPlanService.delete(planId);
      loadPlans();
    } catch (error) {
      console.error("Failed to delete plan:", error);
    }
  };

  const currentMonthLabel = month ? `${year}年${month}月` : `${year}年`;

  return (
    <div className="space-y-6">
      {/* Header with gradient background */}
      <div
        className="rounded-2xl p-6 shadow-lg"
        style={{
          background: 'linear-gradient(to right, rgb(99 102 241), rgb(168 85 247), rgb(236 72 153))'
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white mb-1">月度计划</h2>
            <p className="text-white/80 text-sm">追踪每月目标，一步步实现你的年度计划</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-600 rounded-xl hover:bg-indigo-50 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            <Plus size={20} />
            <span className="font-medium">新建计划</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 p-4 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-100">
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

        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-gray-600">月份:</label>
          <select
            value={month || ""}
            onChange={(e) => setMonth(e.target.value ? Number(e.target.value) : undefined)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white transition-all"
          >
            <option value="">全部</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m}月
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={loadPlans}
          className="ml-auto flex items-center gap-1.5 px-4 py-1.5 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
        >
          <RotateCw size={16} />
          <span className="text-sm font-medium">刷新</span>
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
        <div>
          {plans.length === 0 ? (
            <div
              className="text-center py-16 px-8 rounded-2xl border-2 border-dashed border-gray-300"
              style={{ background: 'linear-gradient(to bottom right, rgb(249 250 251), rgb(243 244 246))' }}
            >
              <div className="text-6xl mb-4">📅</div>
              <p className="text-lg text-gray-600 font-medium">
                {month
                  ? `${currentMonthLabel}还没有计划`
                  : `${year}年还没有计划`}
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
          defaultMonth={month || new Date().getMonth() + 1}
        />
      )}

      {/* Edit Form */}
      {editingPlan && (
        <MonthlyPlanForm
          onSubmit={handleUpdate}
          onCancel={() => setEditingPlan(null)}
          initialData={editingPlan}
          submitLabel="保存"
        />
      )}
    </div>
  );
}
