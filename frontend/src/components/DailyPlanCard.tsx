import { useState, useEffect } from "react";
import { Edit, Trash2, Plus, CheckCircle, Circle, Clock, ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import { Modal, message } from "antd";
import type { DailyPlan, DailyTask, DailyTaskStatus, DailyTaskPriority } from "@/types/dailyPlan";
import { DAILY_TASK_PRIORITY, BUSYNESS_LEVEL } from "@/types/dailyPlan";
import { dailyPlanService } from "@/services/dailyPlanService";
import { DailySummaryModal } from "@/components/DailySummaryModal";
import { systemSettingsService } from "@/services/systemSettingsService";

interface DailyPlanCardProps {
  plan: DailyPlan;
  onUpdate: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const STATUS_ICONS = {
  todo: Circle,
  "in-progress": Clock,
  done: CheckCircle,
  cancelled: Circle,
};

// 星期配置 - 每天（周一到周日）使用不同颜色
const WEEKDAY_CONFIG = [
  { day: 1, label: "周一", color: "from-blue-50 to-blue-100", borderColor: "border-blue-200", textColor: "text-blue-700", tagBg: "bg-blue-100" },
  { day: 2, label: "周二", color: "from-purple-50 to-purple-100", borderColor: "border-purple-200", textColor: "text-purple-700", tagBg: "bg-purple-100" },
  { day: 3, label: "周三", color: "from-pink-50 to-pink-100", borderColor: "border-pink-200", textColor: "text-pink-700", tagBg: "bg-pink-100" },
  { day: 4, label: "周四", color: "from-orange-50 to-orange-100", borderColor: "border-orange-200", textColor: "text-orange-700", tagBg: "bg-orange-100" },
  { day: 5, label: "周五", color: "from-emerald-50 to-emerald-100", borderColor: "border-emerald-200", textColor: "text-emerald-700", tagBg: "bg-emerald-100" },
  { day: 6, label: "周六", color: "from-cyan-50 to-cyan-100", borderColor: "border-cyan-200", textColor: "text-cyan-700", tagBg: "bg-cyan-100" },
  { day: 0, label: "周日", color: "from-rose-50 to-rose-100", borderColor: "border-rose-200", textColor: "text-rose-700", tagBg: "bg-rose-100" },
];

// 获取星期几配置
const getWeekdayConfig = (dateStr: string) => {
  const date = new Date(dateStr);
  const day = date.getDay();
  return WEEKDAY_CONFIG.find((w) => w.day === day) || WEEKDAY_CONFIG[6]; // 默认周日
};

// 动态进度条颜色
const getProgressColor = (rate: number) => {
  if (rate === 100) return "linear-gradient(to right, rgb(52 211 153), rgb(34 197 94))";
  if (rate >= 50) return "linear-gradient(to right, rgb(96 165 250), rgb(99 102 241))";
  if (rate >= 25) return "linear-gradient(to right, rgb(251 191 36), rgb(249 115 22))";
  return "linear-gradient(to right, rgb(156 163 175), rgb(100 116 139))";
};

// 获取忙碌程度配置
const getBusynessConfig = (busyness?: string) => {
  return BUSYNESS_LEVEL.find((b) => b.value === busyness);
};

// 排序任务：按优先级（高→中→低），然后按创建时间（早→晚）
const sortTasks = (tasks: DailyTask[]) => {
  const priorityOrder = { high: 3, medium: 2, low: 1 };

  return [...tasks].sort((a, b) => {
    // 先按优先级排序
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;

    // 优先级相同时，按创建时间排序（早的在前）
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
};

// 格式化日期
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return "今天";
  if (date.toDateString() === yesterday.toDateString()) return "昨天";
  if (date.toDateString() === tomorrow.toDateString()) return "明天";
  return `${date.getMonth() + 1}月${date.getDate()}日`;
};

export function DailyPlanCard({ plan, onUpdate, onEdit, onDelete }: DailyPlanCardProps) {
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<DailyTaskPriority>("medium");
  const [isTaskSectionCollapsed, setIsTaskSectionCollapsed] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [showDailySummary, setShowDailySummary] = useState(false);
  const [expandedSummary, setExpandedSummary] = useState(false);

  useEffect(() => {
    // Load system settings to check if we should show daily summary
    const loadSettings = async () => {
      const settings = await systemSettingsService.getSettings();
      setShowDailySummary(settings.show_daily_summary);
    };
    loadSettings();
  }, []);

  const weekdayConfig = getWeekdayConfig(plan.plan_date);
  const busynessConfig = getBusynessConfig(plan.busyness_level);
  const progressColor = getProgressColor(plan.completion_rate);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || isSubmittingTask) return;

    setIsSubmittingTask(true);
    try {
      await dailyPlanService.createTask(plan.id, {
        title: newTaskTitle,
        priority: newTaskPriority,
        status: "todo",
      });
      setNewTaskTitle("");
      setNewTaskPriority("medium");
      setShowTaskForm(false);
      onUpdate();
    } catch (error) {
      console.error("Failed to create task:", error);
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const handleToggleTaskStatus = async (task: DailyTask) => {
    const newStatus: DailyTaskStatus =
      task.status === "done" ? "todo" : "done";

    try {
      await dailyPlanService.updateTaskStatus(task.id, newStatus);
      onUpdate();
    } catch (error) {
      console.error("Failed to update task status:", error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    Modal.confirm({
      title: "确认删除",
      content: "确定要删除这个任务吗？",
      okText: "删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        try {
          await dailyPlanService.deleteTask(taskId);
          message.success("任务已删除");
          onUpdate();
        } catch (error) {
          console.error("Failed to delete task:", error);
          message.error("删除失败，请稍后重试");
        }
      },
    });
  };

  return (
    <div className={`rounded-xl shadow-md border-2 overflow-hidden mb-3 hover:shadow-lg transition-all duration-300 bg-gradient-to-br ${weekdayConfig.color} ${weekdayConfig.borderColor}`}>
      {/* Card Header */}
      <div className="px-4 py-3 bg-white/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className={`px-2 py-0.5 text-xs font-medium rounded-lg border flex-shrink-0 ${weekdayConfig.textColor} ${weekdayConfig.tagBg} ${weekdayConfig.borderColor}`}>
              {(() => {
                const relativeDate = formatDate(plan.plan_date);
                const isRelative = relativeDate === "今天" || relativeDate === "昨天" || relativeDate === "明天";
                return isRelative
                  ? `${relativeDate} ${new Date(plan.plan_date).getMonth() + 1}月${new Date(plan.plan_date).getDate()}日`
                  : relativeDate;
              })()}
            </span>
            <span className={`px-2 py-0.5 text-xs font-bold rounded-lg flex-shrink-0 ${weekdayConfig.textColor} ${weekdayConfig.tagBg} ${weekdayConfig.borderColor}`}>
              {weekdayConfig.label}
            </span>
            {busynessConfig && (
              <span className="text-base flex-shrink-0" title={busynessConfig.label}>
                {busynessConfig.icon}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {plan.total_tasks > 0 && (
              <button
                onClick={() => setIsTaskSectionCollapsed(!isTaskSectionCollapsed)}
                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                title={isTaskSectionCollapsed ? "展开任务" : "收起任务"}
              >
                {isTaskSectionCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              </button>
            )}
            <button
              onClick={onEdit}
              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
              title="编辑"
            >
              <Edit size={16} />
            </button>
            <button
              onClick={() => setShowSummaryModal(true)}
              className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
              title="总结"
            >
              <BookOpen size={16} />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              title="删除"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Progress Section - Only show when not collapsed */}
      {plan.total_tasks > 0 && !isTaskSectionCollapsed && (
        <div className="px-4 py-2 bg-white">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-gray-600">
              {plan.completed_tasks}/{plan.total_tasks}
            </span>
            <span className={`font-semibold ${plan.completion_rate === 100 ? 'text-emerald-600' : 'text-indigo-600'}`}>
              {plan.completion_rate.toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${plan.completion_rate}%`, background: progressColor }}
            />
          </div>
        </div>
      )}

      {/* Tasks Section - Collapsible */}
      {!isTaskSectionCollapsed && (
        <div
          className="px-4 py-3"
          style={{ background: 'linear-gradient(to bottom, rgb(249 250 251), rgb(255 255 255))' }}
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-gray-700">任务清单</h4>
            <button
              onClick={() => setShowTaskForm(!showTaskForm)}
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
            >
              <Plus size={14} />
              添加任务
            </button>
          </div>

          {showTaskForm && (
            <form onSubmit={handleAddTask} className="mb-2">
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="输入新任务名称..."
                  autoFocus
                />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-500">优先级:</span>
                {DAILY_TASK_PRIORITY.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setNewTaskPriority(p.value)}
                    className={`px-2.5 py-1 text-xs rounded-lg border-2 transition-all ${
                      newTaskPriority === p.value
                        ? "border-current"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    style={{
                      backgroundColor: newTaskPriority === p.value ? `${p.color}15` : "white",
                      color: newTaskPriority === p.value ? p.color : "gray",
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <button
                type="submit"
                disabled={isSubmittingTask}
                className="w-full px-4 py-1.5 text-xs font-medium text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(to right, rgb(99 102 241), rgb(168 85 247))' }}
                onMouseOver={(e) => !isSubmittingTask && (e.currentTarget.style.background = 'linear-gradient(to right, rgb(79 70 229), rgb(147 51 234))')}
                onMouseOut={(e) => e.currentTarget.style.background = 'linear-gradient(to right, rgb(99 102 241), rgb(168 85 247))'}
              >
                {isSubmittingTask ? "添加中..." : "完成"}
              </button>
            </form>
          )}

          <div className="space-y-1.5">
            {sortTasks(plan.daily_tasks).map((task) => {
              const StatusIcon = STATUS_ICONS[task.status];
              const priorityConfig = DAILY_TASK_PRIORITY.find((p) => p.value === task.priority);

              return (
                <div
                  key={task.id}
                  className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-100 group hover:border-indigo-200 transition-all duration-200"
                >
                  <button
                    onClick={() => handleToggleTaskStatus(task)}
                    className={`flex-shrink-0 p-0.5 rounded transition-all ${
                      task.status === "done"
                        ? "text-emerald-500 bg-emerald-50"
                        : "text-gray-300 hover:text-emerald-400 hover:bg-emerald-50"
                    }`}
                  >
                    <StatusIcon size={16} strokeWidth={2.5} />
                  </button>
                  <span
                    className={`flex-1 text-sm break-words min-w-0 ${
                      task.status === "done"
                        ? "text-gray-400"
                        : "text-gray-700"
                    }`}
                  >
                    {task.title}
                  </span>
                  {task.time_slot && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                      {task.time_slot}
                    </span>
                  )}
                  {priorityConfig && (
                    <span
                      className="text-xs px-2 py-0.5 rounded font-medium"
                      style={{
                        backgroundColor: `${priorityConfig.color}15`,
                        color: priorityConfig.color,
                        border: `1px solid ${priorityConfig.color}30`,
                      }}
                    >
                      {priorityConfig.label}
                    </span>
                  )}
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                    title="删除任务"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}

            {plan.daily_tasks.length === 0 && (
              <div className="text-center py-4 px-3 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <p className="text-xs text-gray-500">暂无任务</p>
              </div>
            )}
          </div>

          {/* Daily Summary Section - Show based on system settings */}
          {showDailySummary && plan.daily_summary && (
            <div className="mt-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                    <BookOpen size={14} className="text-amber-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="text-xs font-semibold text-amber-800 mb-1">每日总结</h5>
                  <p className={`text-sm text-amber-900 whitespace-pre-wrap ${expandedSummary ? '' : 'line-clamp-6'}`}>
                    {plan.daily_summary.content}
                  </p>
                  {!expandedSummary && plan.daily_summary.content && plan.daily_summary.content.length > 150 && (
                    <button
                      onClick={() => setExpandedSummary(true)}
                      className="mt-1.5 text-xs font-medium text-amber-700 hover:text-amber-800 transition-colors"
                    >
                      显示更多 ▼
                    </button>
                  )}
                  {expandedSummary && (
                    <button
                      onClick={() => setExpandedSummary(false)}
                      className="mt-1.5 text-xs font-medium text-amber-700 hover:text-amber-800 transition-colors"
                    >
                      收起 ▲
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Summary Modal */}
      {showSummaryModal && (
        <DailySummaryModal
          planId={plan.id}
          planDate={(() => {
            const relativeDate = formatDate(plan.plan_date);
            const isRelative = relativeDate === "今天" || relativeDate === "昨天" || relativeDate === "明天";
            return isRelative
              ? `${relativeDate} ${new Date(plan.plan_date).getMonth() + 1}月${new Date(plan.plan_date).getDate()}日`
              : relativeDate;
          })()}
          onClose={() => setShowSummaryModal(false)}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
}
