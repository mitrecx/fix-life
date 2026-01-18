import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, Target, Calendar } from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { analyticsService } from "@/services/analyticsService";
import type { DashboardStats, YearlyStats, CompletionRateTrend } from "@/types/analytics";

// Category colors for charts
const CATEGORY_COLORS = {
  health: "#10b981",
  career: "#3b82f6",
  learning: "#8b5cf6",
  finance: "#f59e0b",
  relationship: "#ec4899",
  entertainment: "#06b6d4",
  other: "#6b7280",
};

// Category labels in Chinese
const CATEGORY_LABELS: Record<string, string> = {
  health: "健康",
  career: "事业",
  learning: "学习",
  finance: "财务",
  relationship: "关系",
  entertainment: "娱乐",
  other: "其他",
};

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [yearlyStats, setYearlyStats] = useState<YearlyStats | null>(null);
  const [completionTrend, setCompletionTrend] = useState<CompletionRateTrend | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadAnalytics();
  }, [selectedYear]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [dashboard, yearly, trend] = await Promise.all([
        analyticsService.getDashboardStats(),
        analyticsService.getYearlyStats(selectedYear),
        analyticsService.getCompletionRateTrend("daily", undefined, undefined, 90),
      ]);
      setDashboardStats(dashboard);
      setYearlyStats(yearly);
      setCompletionTrend(trend);
    } catch (error) {
      console.error("Failed to load analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  if (!dashboardStats || !yearlyStats) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">无法加载数据</p>
      </div>
    );
  }

  // Prepare chart data
  const categoryData = yearlyStats.category_stats.map((cat) => ({
    name: CATEGORY_LABELS[cat.category] || cat.category,
    value: cat.count,
    completed: cat.completed,
    rate: cat.completion_rate,
  }));

  const monthlyProgressData = yearlyStats.monthly_progress.map((m) => ({
    name: `${m.month}月`,
    completed: m.completed,
    total: m.total,
  }));

  const trendData = completionTrend?.data.map((d) => ({
    date: d.date ? new Date(d.date).toLocaleDateString("zh-CN", { month: "short", day: "numeric" }) : "",
    rate: d.rate,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className="rounded-2xl p-6 shadow-lg"
        style={{
          background: 'linear-gradient(to right, rgb(99 102 241), rgb(168 85 247), rgb(236 72 153))'
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">数据统计与分析</h1>
            <p className="text-white/80 text-sm">了解你的进度，追踪你的成长</p>
          </div>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-4 py-2 rounded-lg border-0 bg-white/20 text-white font-medium focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
              <option key={y} value={y} className="text-gray-800">
                {y}年
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Dashboard Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-100">
              <Target className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">年度目标</p>
              <p className="text-2xl font-bold text-gray-800">{dashboardStats.total_goals}</p>
              <p className="text-xs text-green-600">
                已完成 {dashboardStats.completed_goals}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-purple-100">
              <Calendar className="text-purple-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">月度计划</p>
              <p className="text-2xl font-bold text-gray-800">{dashboardStats.total_monthly_plans}</p>
              <p className="text-xs text-gray-500">
                日计划 {dashboardStats.total_daily_plans}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-green-100">
              <BarChart3 className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">总任务</p>
              <p className="text-2xl font-bold text-gray-800">{dashboardStats.total_tasks}</p>
              <p className="text-xs text-green-600">
                已完成 {dashboardStats.completed_tasks}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-100">
              <TrendingUp className="text-amber-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">完成率</p>
              <p className="text-2xl font-bold text-gray-800">
                {dashboardStats.overall_completion_rate.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500">
                目标完成率 {yearlyStats.goal_completion_rate.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">目标分类统计</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CATEGORY_COLORS[entry.name as keyof typeof CATEGORY_COLORS] || "#6b7280"}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Progress */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">月度进度</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyProgressData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="total" name="总数" fill="#e0e7ff" />
              <Bar dataKey="completed" name="已完成" fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">完成率趋势 (最近90天)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="rate"
              name="完成率"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={{ fill: "#8b5cf6" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Category Details */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">分类详情</h3>
        <div className="space-y-3">
          {categoryData.map((cat, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor:
                      CATEGORY_COLORS[cat.name as keyof typeof CATEGORY_COLORS] || "#6b7280"
                  }}
                />
                <span className="font-medium text-gray-700">{cat.name}</span>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-sm">
                  <span className="text-gray-500">数量:</span>
                  <span className="ml-1 font-semibold text-gray-700">{cat.value}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">完成:</span>
                  <span className="ml-1 font-semibold text-green-600">{cat.completed}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">完成率:</span>
                  <span className="ml-1 font-semibold text-indigo-600">{cat.rate.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
