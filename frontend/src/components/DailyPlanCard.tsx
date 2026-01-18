import { useState } from "react";
import { Edit, Trash2, Plus, CheckCircle, Circle, Clock, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import type { DailyPlan, DailyTask, DailyTaskStatus } from "@/types/dailyPlan";
import { DAILY_TASK_STATUS, DAILY_TASK_PRIORITY, BUSYNESS_LEVEL } from "@/types/dailyPlan";
import { dailyPlanService } from "@/services/dailyPlanService";

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
  const [newTaskPriority, setNewTaskPriority] = useState<keyof typeof DAILY_TASK_PRIORITY>("medium");
  const [isTaskSectionCollapsed, setIsTaskSectionCollapsed] = useState(false);

  const busynessConfig = getBusynessConfig(plan.busyness_level);
  const progressColor = getProgressColor(plan.completion_rate);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

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
    if (!confirm("确定要删除这个任务吗？")) return;

    try {
      await dailyPlanService.deleteTask(taskId);
      onUpdate();
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden mb-3 hover:shadow-lg transition-all duration-300">
      {/* Card Header */}
      <div className="px-4 py-3" style={{ background: 'linear-gradient(to right, rgb(248 250 252), rgb(249 250 251))' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Calendar className="text-indigo-500 flex-shrink-0" size={16} />
            <h3 className="text-base font-semibold text-gray-800 truncate">
              {plan.title || "日计划"}
            </h3>
            <span className="px-2 py-0.5 text-xs font-medium rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-200 flex-shrink-0">
              {(() => {
                const relativeDate = formatDate(plan.plan_date);
                const isRelative = relativeDate === "今天" || relativeDate === "昨天" || relativeDate === "明天";
                return isRelative
                  ? `${relativeDate} ${new Date(plan.plan_date).getMonth() + 1}月${new Date(plan.plan_date).getDate()}日`
                  : relativeDate;
              })()}
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
                className="w-full px-4 py-1.5 text-xs font-medium text-white rounded-lg transition-all"
                style={{ background: 'linear-gradient(to right, rgb(99 102 241), rgb(168 85 247))' }}
                onMouseOver={(e) => e.currentTarget.style.background = 'linear-gradient(to right, rgb(79 70 229), rgb(147 51 234))'}
                onMouseOut={(e) => e.currentTarget.style.background = 'linear-gradient(to right, rgb(99 102 241), rgb(168 85 247))'}
              >
                添加任务
              </button>
            </form>
          )}

          <div className="space-y-1.5">
            {plan.daily_tasks.map((task) => {
              const StatusIcon = STATUS_ICONS[task.status];
              const statusConfig = DAILY_TASK_STATUS.find((s) => s.value === task.status);
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
                    className={`flex-1 text-xs ${
                      task.status === "done"
                        ? "line-through text-gray-400"
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
        </div>
      )}
    </div>
  );
}
