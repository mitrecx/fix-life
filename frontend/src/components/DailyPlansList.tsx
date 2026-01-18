import { useState, useEffect } from "react";
import { Plus, RotateCw } from "lucide-react";
import type { DailyPlan, DailyPlanCreate, DailyPlanUpdate } from "@/types/dailyPlan";
import { dailyPlanService } from "@/services/dailyPlanService";
import { DailyPlanCard } from "./DailyPlanCard";
import { DailyPlanForm } from "./DailyPlanForm";

export function DailyPlansList() {
  const [plans, setPlans] = useState<DailyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<DailyPlan | null>(null);
  const [startDate, setStartDate] = useState<string>(() => {
    const today = new Date();
    today.setDate(today.getDate() - 7);
    return today.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const today = new Date();
    today.setDate(today.getDate() + 7);
    return today.toISOString().split("T")[0];
  });

  useEffect(() => {
    loadPlans();
  }, [startDate, endDate]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const data = await dailyPlanService.getAll(startDate, endDate);
      setPlans(data);
    } catch (error) {
      console.error("Failed to load daily plans:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: DailyPlanCreate) => {
    try {
      await dailyPlanService.create(data);
      setShowForm(false);
      loadPlans();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "创建失败，请稍后重试";
      alert(errorMessage);
    }
  };

  const handleUpdate = async (data: DailyPlanUpdate) => {
    if (!editingPlan) return;
    try {
      await dailyPlanService.update(editingPlan.id, data);
      setEditingPlan(null);
      loadPlans();
    } catch (error) {
      console.error("Failed to update plan:", error);
    }
  };

  const handleDelete = async (planId: string) => {
    if (!confirm("确定要删除这个日计划吗？相关的任务也会被删除。")) return;

    try {
      await dailyPlanService.delete(planId);
      loadPlans();
    } catch (error) {
      console.error("Failed to delete plan:", error);
    }
  };

  const formatDateRange = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const formatDate = (date: Date) => `${date.getMonth() + 1}月${date.getDate()}日`;
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header with gradient background */}
      <div
        className="rounded-2xl p-6 shadow-lg"
        style={{
          background: 'linear-gradient(to right, rgb(34 197 94), rgb(16 185 129), rgb(6 182 212))'
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white mb-1">每日计划</h2>
            <p className="text-white/80 text-sm">规划每一天，让每一天都有意义</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-emerald-600 rounded-xl hover:bg-emerald-50 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            <Plus size={20} />
            <span className="font-medium">新建计划</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 p-4 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-gray-600">开始日期:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-gray-600">结束日期:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white transition-all"
          />
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
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-200 border-t-emerald-600" />
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
              <div className="text-6xl mb-4">📝</div>
              <p className="text-lg text-gray-600 font-medium">
                {formatDateRange()} 还没有计划
              </p>
              <p className="text-sm text-gray-400 mt-2">点击"新建计划"开始创建你的第一个日计划</p>
            </div>
          ) : (
            plans.map((plan) => (
              <DailyPlanCard
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
        <DailyPlanForm
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
          submitLabel="创建"
        />
      )}

      {/* Edit Form */}
      {editingPlan && (
        <DailyPlanForm
          onSubmit={handleUpdate}
          onCancel={() => setEditingPlan(null)}
          initialData={editingPlan}
          submitLabel="保存"
        />
      )}
    </div>
  );
}
