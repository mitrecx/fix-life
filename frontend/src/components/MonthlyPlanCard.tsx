import { useState } from "react";
import { Edit, Trash2, Plus, CheckCircle, Circle, Clock, Calendar } from "lucide-react";
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

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      await monthlyPlanService.createTask(plan.id, {
        title: newTaskTitle,
        priority: "medium",
        status: "todo",
      });
      setNewTaskTitle("");
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
    if (!confirm("确定要删除这个任务吗？")) return;

    try {
      await monthlyPlanService.deleteTask(taskId);
      onUpdate();
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  const progressColor = getProgressColor(plan.completion_rate);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-5 hover:shadow-xl transition-all duration-300">
      {/* Card Header */}
      <div
        className="px-6 py-4 border-b border-gray-100"
        style={{ background: 'linear-gradient(to right, rgb(248 250 252), rgb(249 250 251))' }}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="text-indigo-500" size={18} />
              <h3 className="text-xl font-bold text-gray-800">
                {plan.title || `${plan.year}年${plan.month}月计划`}
              </h3>
            </div>
            {plan.focus_areas && plan.focus_areas.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {plan.focus_areas.map((area, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 text-xs font-medium text-indigo-700 rounded-full border border-indigo-200"
                    style={{ background: 'linear-gradient(to right, rgb(224 231 255), rgb(243 232 255))' }}
                  >
                    {area}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-1">
            <button
              onClick={onEdit}
              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
              title="编辑"
            >
              <Edit size={18} />
            </button>
            <button
              onClick={onDelete}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              title="删除"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Progress Section */}
      <div className="px-6 py-4 bg-white">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-600 font-medium">
            已完成 {plan.completed_tasks} / {plan.total_tasks} 个任务
          </span>
          <span className={`font-bold ${plan.completion_rate === 100 ? 'text-emerald-600' : 'text-indigo-600'}`}>
            {plan.completion_rate.toFixed(0)}%
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden shadow-inner">
          <div
            className="h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
            style={{ width: `${plan.completion_rate}%`, background: progressColor }}
          />
        </div>
      </div>

      {/* Tasks Section */}
      <div
        className="px-6 py-4"
        style={{ background: 'linear-gradient(to bottom, rgb(249 250 251), rgb(255 255 255))' }}
      >
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-700">任务清单</h4>
          <button
            onClick={() => setShowTaskForm(!showTaskForm)}
            className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
          >
            <Plus size={16} />
            添加任务
          </button>
        </div>

        {showTaskForm && (
          <form onSubmit={handleAddTask} className="flex gap-2 mb-3">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
              placeholder="输入新任务名称..."
              autoFocus
            />
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium text-white rounded-xl transition-all shadow-md hover:shadow-lg"
              style={{ background: 'linear-gradient(to right, rgb(99 102 241), rgb(168 85 247))' }}
              onMouseOver={(e) => e.currentTarget.style.background = 'linear-gradient(to right, rgb(79 70 229), rgb(147 51 234))'}
              onMouseOut={(e) => e.currentTarget.style.background = 'linear-gradient(to right, rgb(99 102 241), rgb(168 85 247))'}
            >
              添加
            </button>
          </form>
        )}

        <div className="space-y-2">
          {plan.monthly_tasks.map((task) => {
            const StatusIcon = STATUS_ICONS[task.status];
            const statusConfig = TASK_STATUS.find((s) => s.value === task.status);
            const priorityConfig = TASK_PRIORITY.find((p) => p.value === task.priority);

            return (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 group hover:border-indigo-200 hover:shadow-md transition-all duration-200"
              >
                <button
                  onClick={() => handleToggleTaskStatus(task)}
                  className={`flex-shrink-0 p-1 rounded-lg transition-all ${
                    task.status === "done"
                      ? "text-emerald-500 bg-emerald-50"
                      : "text-gray-300 hover:text-emerald-400 hover:bg-emerald-50"
                  }`}
                >
                  <StatusIcon size={20} strokeWidth={2.5} />
                </button>
                <span
                  className={`flex-1 text-sm ${
                    task.status === "done"
                      ? "line-through text-gray-400"
                      : "text-gray-700 font-medium"
                  }`}
                >
                  {task.title}
                </span>
                {priorityConfig && (
                  <span
                    className="text-xs px-2.5 py-1 rounded-lg font-medium"
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
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  title="删除任务"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}

          {plan.monthly_tasks.length === 0 && (
            <div className="text-center py-6 px-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <div className="text-4xl mb-2">✨</div>
              <p className="text-sm text-gray-500 font-medium">暂无任务</p>
              <p className="text-xs text-gray-400 mt-1">点击"添加任务"开始创建你的第一个任务</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
