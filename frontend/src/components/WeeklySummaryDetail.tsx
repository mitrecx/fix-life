import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Calendar,
  TrendingUp,
  CheckCircle,
  XCircle,
  Edit,
  Save,
  ArrowLeft,
} from "lucide-react";
import { Button, Spin, message } from "antd";
import { weeklySummaryService } from "@/services/weeklySummaryService";
import type { WeeklySummary, DailySummaryData } from "@/types/weeklySummary";

export function WeeklySummaryDetail() {
  const { summaryId } = useParams<{ summaryId: string }>();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [summaryText, setSummaryText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSummary();
  }, [summaryId]);

  const loadSummary = async () => {
    if (!summaryId) return;
    setLoading(true);
    try {
      const data = await weeklySummaryService.getById(summaryId);
      setSummary(data);
      setSummaryText(data.summary_text || "");
    } catch (error) {
      console.error("Failed to load weekly summary:", error);
      message.error("加载周总结失败");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSummary = async () => {
    if (!summary) return;
    setSaving(true);
    try {
      await weeklySummaryService.update(summary.id, { summary_text: summaryText });
      message.success("总结保存成功");
      setEditing(false);
      loadSummary();
    } catch (error) {
      console.error("Failed to save summary:", error);
      message.error("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    const weekday = weekdays[date.getDay()];
    return `${month}月${day}日 ${weekday}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spin size="large" />
      </div>
    );
  }

  if (!summary) {
    return <div>总结不存在</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          icon={<ArrowLeft size={18} />}
          onClick={() => navigate("/weekly-summaries")}
          className="mb-4"
        >
          返回列表
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {summary.year}年第{summary.week_number}周
            </h1>
            <p className="mt-2 text-gray-600">
              {new Date(summary.start_date).toLocaleDateString("zh-CN")} -{" "}
              {new Date(summary.end_date).toLocaleDateString("zh-CN")}
            </p>
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-6 mb-8 md:grid-cols-4">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <TrendingUp className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">总任务数</p>
              <p className="text-2xl font-bold text-gray-900">{summary.total_tasks}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">已完成</p>
              <p className="text-2xl font-bold text-gray-900">{summary.completed_tasks}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-lg">
              <XCircle className="text-red-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">未完成</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary.total_tasks - summary.completed_tasks}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div
              className={`p-3 rounded-lg ${
                summary.completion_rate >= 80
                  ? "bg-green-100"
                  : summary.completion_rate >= 50
                  ? "bg-yellow-100"
                  : "bg-red-100"
              }`}
            >
              <Calendar
                className={`${
                  summary.completion_rate >= 80
                    ? "text-green-600"
                    : summary.completion_rate >= 50
                    ? "text-yellow-600"
                    : "text-red-600"
                }`}
                size={24}
              />
            </div>
            <div>
              <p className="text-sm text-gray-600">完成率</p>
              <p
                className={`text-2xl font-bold ${
                  summary.completion_rate >= 80
                    ? "text-green-600"
                    : summary.completion_rate >= 50
                    ? "text-yellow-600"
                    : "text-red-600"
                }`}
              >
                {summary.completion_rate}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Breakdown */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">每日详情</h2>
        <div className="space-y-4">
          {summary.stats.daily_data.map((day: DailySummaryData) => (
            <div key={day.date} className="border rounded-xl p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{formatDate(day.date)}</h3>
                  {day.title && <p className="text-sm text-gray-600">{day.title}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">
                    {day.completed_tasks}/{day.total_tasks} 任务
                  </p>
                  <p
                    className={`text-sm font-semibold ${
                      day.completion_rate >= 80
                        ? "text-green-600"
                        : day.completion_rate >= 50
                        ? "text-yellow-600"
                        : "text-red-600"
                    }`}
                  >
                    完成率 {day.completion_rate}%
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                <div
                  className={`h-2 rounded-full ${
                    day.completion_rate >= 80
                      ? "bg-green-500"
                      : day.completion_rate >= 50
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  }`}
                  style={{ width: `${day.completion_rate}%` }}
                />
              </div>

              {/* Daily Summary */}
              {day.daily_summary && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">{day.daily_summary.content}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* User Summary Text */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">周总结</h2>
          {!editing && (
            <Button icon={<Edit size={18} />} onClick={() => setEditing(true)}>
              编辑
            </Button>
          )}
        </div>

        {editing ? (
          <div>
            <textarea
              value={summaryText}
              onChange={(e) => setSummaryText(e.target.value)}
              rows={8}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="总结这周的收获、反思、下周计划..."
            />
            <div className="mt-4 flex gap-3">
              <Button
                type="primary"
                icon={<Save size={18} />}
                onClick={handleSaveSummary}
                loading={saving}
              >
                保存
              </Button>
              <Button onClick={() => { setEditing(false); setSummaryText(summary.summary_text || ""); }}>
                取消
              </Button>
            </div>
          </div>
        ) : (
          <div className="prose max-w-none">
            {summary.summary_text ? (
              <p className="text-gray-700 whitespace-pre-wrap">{summary.summary_text}</p>
            ) : (
              <p className="text-gray-500 italic">暂无总结，点击编辑按钮添加...</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
