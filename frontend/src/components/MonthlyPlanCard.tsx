import { useState } from "react";
import { Edit, Trash2, Plus, CheckCircle, Circle, Clock, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { Modal, message } from "antd";
import type { MonthlyPlan, MonthlyTask, TaskStatus } from "@/types/monthlyPlan";
import { TASK_STATUS, TASK_PRIORITY } from "@/types/monthlyPlan";
import { monthlyPlanService } from "@/services/monthlyPlanService";

interface MonthlyPlanCardProps {
  plan: MonthlyPlan;
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

export function MonthlyPlanCard({ plan, onUpdate, onEdit, onDelete }: MonthlyPlanCardProps) {
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<keyof typeof TASK_PRIORITY>("medium");
  const [isTaskSectionCollapsed, setIsTaskSectionCollapsed] = useState(false);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      await monthlyPlanService.createTask(plan.id, {
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

  const handleToggleTaskStatus = async (task: MonthlyTask) => {
    const newStatus: TaskStatus =
      task.status === "done" ? "todo" : "done";

    try {
      await monthlyPlanService.updateTaskStatus(task.id, newStatus);
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
          await monthlyPlanService.deleteTask(taskId);
          message.success("任务已删除");
          onUpdate();
        } catch (error) {
          console.error("Failed to delete task:", error);
          message.error("删除失败，请稍后重试");
        }
      },
    });
  };

  const progressColor = getProgressColor(plan.completion_rate);

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden mb-3 hover:shadow-lg transition-all duration-300">
      {/* Card Header */}
      <div className="px-4 py-3" style={{ background: 'linear-gradient(to right, rgb(248 250 252), rgb(249 250 251))' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Calendar className="text-indigo-500 flex-shrink-0" size={16} />
            <h3 className="text-base font-semibold text-gray-800 truncate">
              {plan.title || `${plan.year}年${plan.month}月计划`}
            </h3>
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
                {TASK_PRIORITY.map((p) => (
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
            {plan.monthly_tasks.map((task) => {
              const StatusIcon = STATUS_ICONS[task.status];
              const statusConfig = TASK_STATUS.find((s) => s.value === task.status);
              const priorityConfig = TASK_PRIORITY.find((p) => p.value === task.priority);

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

            {plan.monthly_tasks.length === 0 && (
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
