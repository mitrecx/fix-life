import { useState, useEffect } from "react";
import { Plus, RotateCw } from "lucide-react";
import { Modal, message } from "antd";
import type { DailyPlan, DailyPlanCreate, DailyPlanUpdate } from "@/types/dailyPlan";
import { dailyPlanService } from "@/services/dailyPlanService";
import { DailyPlanCard } from "./DailyPlanCard";
import { DailyPlanForm } from "./DailyPlanForm";

export function DailyPlansList() {
  const [plans, setPlans] = useState<DailyPlan[]>([]);
  const [allPlans, setAllPlans] = useState<DailyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<DailyPlan | null>(null);
  // 计算当前周的周一和周日
  const getCurrentWeekRange = () => {
    const today = new Date();
    const currentDay = today.getDay();
    const diff = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { monday, sunday };
  };

  const { monday: currentMonday, sunday: currentSunday } = getCurrentWeekRange();

  const [startDate, setStartDate] = useState<string>(() => {
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    return formatDate(currentMonday);
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    return formatDate(currentSunday);
  });

  // 计算当前是第几周
  const getCurrentWeekNumber = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), 0, 1);
    const firstDayOfWeek = firstDay.getDay();
    const firstMonday = new Date(firstDay);
    if (firstDayOfWeek === 0) {
      firstMonday.setDate(firstDay.getDate() + 1);
    } else if (firstDayOfWeek !== 1) {
      firstMonday.setDate(firstDay.getDate() + (8 - firstDayOfWeek) % 7);
    }
    const daysDiff = Math.floor((today.getTime() - firstMonday.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.floor(daysDiff / 7) + 1);
  };

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeekNumber());

  // 根据年份和周数获取日期范围
  const getDateRangeByYearWeek = (year: number, week: number) => {
    // 获取该年第一天（1月1日）
    const firstDay = new Date(year, 0, 1);
    // 计算第一天是星期几（0-6，0是周日）
    const firstDayOfWeek = firstDay.getDay();
    // 计算第一周的周一
    const firstMonday = new Date(firstDay);
    if (firstDayOfWeek === 0) {
      // 如果1月1日是周日，第一周从下周一开始
      firstMonday.setDate(firstDay.getDate() + 1);
    } else if (firstDayOfWeek !== 1) {
      // 如果1月1日不是周一，向前或向后找到第一个周一
      firstMonday.setDate(firstDay.getDate() + (8 - firstDayOfWeek) % 7);
    }
    // 计算目标周的周一和周日
    const targetMonday = new Date(firstMonday);
    targetMonday.setDate(firstMonday.getDate() + (week - 1) * 7);
    const targetSunday = new Date(targetMonday);
    targetSunday.setDate(targetMonday.getDate() + 6);
    // 使用本地日期格式化避免时区问题
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    return {
      start: formatDate(targetMonday),
      end: formatDate(targetSunday)
    };
  };

  // 根据年周查询
  const handleSearchByYearWeek = () => {
    const { start, end } = getDateRangeByYearWeek(selectedYear, selectedWeek);
    setStartDate(start);
    setEndDate(end);
  };

  // 上一周
  const handlePreviousWeek = () => {
    let newWeek = selectedWeek - 1;
    let newYear = selectedYear;
    if (newWeek < 1) {
      newWeek = 53;
      newYear = selectedYear - 1;
    }
    setSelectedYear(newYear);
    setSelectedWeek(newWeek);
    const { start, end } = getDateRangeByYearWeek(newYear, newWeek);
    setStartDate(start);
    setEndDate(end);
  };

  // 下一周
  const handleNextWeek = () => {
    let newWeek = selectedWeek + 1;
    let newYear = selectedYear;
    if (newWeek > 53) {
      newWeek = 1;
      newYear = selectedYear + 1;
    }
    setSelectedYear(newYear);
    setSelectedWeek(newWeek);
    const { start, end } = getDateRangeByYearWeek(newYear, newWeek);
    setStartDate(start);
    setEndDate(end);
  };

  // 生成周数选项（1-53）
  const weekOptions = Array.from({ length: 53 }, (_, i) => i + 1);

  // 生成年份选项（前后5年）
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  useEffect(() => {
    loadPlans();
  }, [startDate, endDate]);

  const loadAllPlans = async () => {
    try {
      // 获取所有计划（设置一个很大的日期范围）
      const data = await dailyPlanService.getAll("2020-01-01", "2030-12-31");
      setAllPlans(data);
    } catch (error) {
      console.error("Failed to load all daily plans:", error);
    }
  };

  // 排序计划：今天 > 未来（递增） > 过去（递增）
  const sortPlans = (plans: DailyPlan[]): DailyPlan[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 重置时间为当天0点

    return [...plans].sort((a, b) => {
      const planDateA = new Date(a.plan_date);
      planDateA.setHours(0, 0, 0, 0);
      const planDateB = new Date(b.plan_date);
      planDateB.setHours(0, 0, 0, 0);

      const isTodayA = planDateA.getTime() === today.getTime();
      const isTodayB = planDateB.getTime() === today.getTime();
      const isFutureA = planDateA > today;
      const isFutureB = planDateB > today;
      const isPastA = planDateA < today;
      const isPastB = planDateB < today;

      // 今天的计划最优先
      if (isTodayA && !isTodayB) return -1;
      if (!isTodayA && isTodayB) return 1;

      // 如果两个都是今天，保持原顺序
      if (isTodayA && isTodayB) return 0;

      // 未来的计划排在过去的计划前面
      if (isFutureA && isPastB) return -1;
      if (isPastA && isFutureB) return 1;

      // 同类型（都是未来或都是过去），按日期递增排
      return planDateA.getTime() - planDateB.getTime();
    });
  };

  const loadPlans = async () => {
    try {
      setLoading(true);
      const data = await dailyPlanService.getAll(startDate, endDate);
      setPlans(sortPlans(data));
      // 同时加载所有计划用于日期冲突检查
      loadAllPlans();
    } catch (error) {
      console.error("Failed to load daily plans:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: DailyPlanCreate | DailyPlanUpdate) => {
    try {
      await dailyPlanService.create(data as DailyPlanCreate);
      setShowForm(false);
      loadPlans();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "创建失败，请稍后重试";
      message.error(errorMessage);
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
    Modal.confirm({
      title: "确认删除",
      content: "确定要删除这个日计划吗？相关的任务也会被删除。",
      okText: "删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        try {
          await dailyPlanService.delete(planId);
          message.success("日计划已删除");
          loadPlans();
        } catch (error) {
          console.error("Failed to delete plan:", error);
          message.error("删除失败，请稍后重试");
        }
      },
    });
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
      <div className="p-4 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-100">
        {/* Year and Week selection */}
        <div className="flex items-center gap-4 mb-3">
          <label className="text-sm font-semibold text-gray-600">按周查询:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white transition-all"
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}年
              </option>
            ))}
          </select>
          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(Number(e.target.value))}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white transition-all"
          >
            {weekOptions.map((week) => (
              <option key={week} value={week}>
                第{week}周
              </option>
            ))}
          </select>
          <button
            onClick={handlePreviousWeek}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
          >
            上一周
          </button>
          <button
            onClick={handleSearchByYearWeek}
            className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 transition-all"
          >
            查询
          </button>
          <button
            onClick={handleNextWeek}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
          >
            下一周
          </button>
        </div>

        {/* Date range selection */}
        <div className="flex items-center gap-4">
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
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-200 border-t-emerald-600" />
        </div>
      )}

      {/* Plans List */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
          {plans.length === 0 ? (
            <div
              className="col-span-full text-center py-16 px-8 rounded-2xl border-2 border-dashed border-gray-300"
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
          existingPlans={allPlans}
        />
      )}

      {/* Edit Form */}
      {editingPlan && (
        <DailyPlanForm
          onSubmit={handleUpdate}
          onCancel={() => setEditingPlan(null)}
          initialData={editingPlan}
          submitLabel="保存"
          existingPlans={allPlans}
        />
      )}
    </div>
  );
}
