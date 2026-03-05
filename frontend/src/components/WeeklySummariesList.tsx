import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, FileText, RefreshCw } from "lucide-react";
import { Button, Spin, message } from "antd";
import { weeklySummaryService } from "@/services/weeklySummaryService";
import type { WeeklySummary } from "@/types/weeklySummary";

export function WeeklySummariesList() {
  const navigate = useNavigate();
  const [summaries, setSummaries] = useState<WeeklySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number | undefined>(new Date().getFullYear());

  useEffect(() => {
    loadSummaries();
  }, [selectedYear]);

  const loadSummaries = async () => {
    setLoading(true);
    try {
      const response = await weeklySummaryService.getAll({
        year: selectedYear,
        skip: 0,
        limit: 100,
      });
      setSummaries(response.summaries);
    } catch (error) {
      console.error("Failed to load weekly summaries:", error);
      message.error("加载周总结失败");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLastWeek = async () => {
    setGenerating(true);
    try {
      await weeklySummaryService.generate({});
      message.success("周总结生成成功");
      loadSummaries();
    } catch (error: any) {
      console.error("Failed to generate weekly summary:", error);
      if (error.response?.status === 409) {
        message.warning("上周的总结已存在，如需重新生成请使用强制重新生成");
      } else if (error.response?.status === 404) {
        message.warning("上周没有日计划数据");
      } else {
        message.error("生成周总结失败");
      }
    } finally {
      setGenerating(false);
    }
  };

  const getWeekLabel = (summary: WeeklySummary) => {
    const startDate = new Date(summary.start_date);
    const endDate = new Date(summary.end_date);
    const startMonth = startDate.getMonth() + 1;
    const startDay = startDate.getDate();
    const endMonth = endDate.getMonth() + 1;
    const endDay = endDate.getDate();

    if (startMonth === endMonth) {
      return `${startMonth}月${startDay}日-${endDay}日`;
    } else {
      return `${startMonth}月${startDay}日-${endMonth}月${endDay}日`;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">周总结</h1>
            <p className="mt-2 text-gray-600">回顾每周的计划完成情况</p>
          </div>
          <Button
            type="primary"
            icon={<RefreshCw size={18} />}
            onClick={handleGenerateLastWeek}
            loading={generating}
            className="shadow-lg"
          >
            生成上周总结
          </Button>
        </div>
      </div>

      {/* Year Filter */}
      <div className="mb-6 flex gap-2">
        <Button
          type={selectedYear === undefined ? "primary" : "default"}
          onClick={() => setSelectedYear(undefined)}
        >
          全部
        </Button>
        <Button
          type={selectedYear === new Date().getFullYear() ? "primary" : "default"}
          onClick={() => setSelectedYear(new Date().getFullYear())}
        >
          {new Date().getFullYear()}年
        </Button>
        <Button
          type={selectedYear === new Date().getFullYear() - 1 ? "primary" : "default"}
          onClick={() => setSelectedYear(new Date().getFullYear() - 1)}
        >
          {new Date().getFullYear() - 1}年
        </Button>
      </div>

      {/* Summaries List */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Spin size="large" />
        </div>
      ) : summaries.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
          <FileText className="mx-auto text-gray-400" size={48} />
          <h3 className="mt-4 text-lg font-medium text-gray-900">暂无周总结</h3>
          <p className="mt-2 text-gray-500">点击"生成上周总结"按钮开始使用</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {summaries.map((summary) => (
            <div
              key={summary.id}
              onClick={() => navigate(`/weekly-summaries/${summary.id}`)}
              className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow cursor-pointer p-6"
            >
              {/* Week Label */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="text-indigo-600" size={20} />
                  <span className="font-semibold text-gray-900">
                    {summary.year}年第{summary.week_number}周
                  </span>
                </div>
              </div>

              {/* Date Range */}
              <p className="text-sm text-gray-600 mb-4">{getWeekLabel(summary)}</p>

              {/* Stats */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">总任务数</span>
                  <span className="font-semibold text-gray-900">{summary.total_tasks}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">已完成</span>
                  <span className="font-semibold text-green-600">{summary.completed_tasks}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">完成率</span>
                  <span
                    className={`font-semibold ${
                      summary.completion_rate >= 80
                        ? "text-green-600"
                        : summary.completion_rate >= 50
                        ? "text-yellow-600"
                        : "text-red-600"
                    }`}
                  >
                    {summary.completion_rate}%
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      summary.completion_rate >= 80
                        ? "bg-green-500"
                        : summary.completion_rate >= 50
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    }`}
                    style={{ width: `${summary.completion_rate}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
