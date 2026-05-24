import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, Input, message } from "antd";
import { Search } from "lucide-react";
import { backlogTaskService } from "@/services/backlogTaskService";
import { dailyPlanService } from "@/services/dailyPlanService";
import { TaskFormPanel } from "@/components/TaskFormPanel";
import type { BacklogTask, TaskFormStatus } from "@/types/backlogTask";
import { applyStatusChange, progressToFormStatus } from "@/types/backlogTask";
import { DEFAULT_TASK_CONTEXT, getTaskContextConfig } from "@/types/taskContext";
import type { TaskContext } from "@/types/taskContext";
import { DEFAULT_TASK_PRIORITY, getTaskPriorityConfig } from "@/types/taskPriority";
import type { TaskPriority } from "@/types/taskPriority";
import type { DailyTaskStatus } from "@/types/dailyPlan";

type AddMode = "pick" | "create";

interface AddToTodayModalProps {
  open: boolean;
  planId: string;
  planDate: string;
  existingBacklogIds: Set<string>;
  onClose: () => void;
  onSuccess: () => void;
}

function formStatusToDailyStatus(status: TaskFormStatus): DailyTaskStatus {
  if (status === "done") return "done";
  if (status === "in_progress") return "in-progress";
  return "todo";
}

export function AddToTodayModal({
  open,
  planId,
  planDate,
  existingBacklogIds,
  onClose,
  onSuccess,
}: AddToTodayModalProps) {
  const [mode, setMode] = useState<AddMode>("pick");
  const [search, setSearch] = useState("");
  const [candidates, setCandidates] = useState<BacklogTask[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formContext, setFormContext] = useState<TaskContext>(DEFAULT_TASK_CONTEXT);
  const [formPriority, setFormPriority] = useState<TaskPriority>(DEFAULT_TASK_PRIORITY);
  const [formStatus, setFormStatus] = useState<TaskFormStatus>("pending");
  const [formProgress, setFormProgress] = useState(0);

  const reset = useCallback(() => {
    setMode("pick");
    setSearch("");
    setSelectedId(null);
    setFormTitle("");
    setFormDescription("");
    setFormContext(DEFAULT_TASK_CONTEXT);
    setFormPriority(DEFAULT_TASK_PRIORITY);
    setFormStatus("pending");
    setFormProgress(0);
  }, []);

  const loadCandidates = useCallback(async () => {
    setLoadingCandidates(true);
    try {
      const [pending, inProgress] = await Promise.all([
        backlogTaskService.list("pending"),
        backlogTaskService.list("in_progress"),
      ]);
      setCandidates([...pending.tasks, ...inProgress.tasks]);
    } catch (error) {
      console.error("Failed to load backlog tasks:", error);
      message.error("加载待办失败");
    } finally {
      setLoadingCandidates(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadCandidates();
    } else {
      reset();
    }
  }, [open, loadCandidates, reset]);

  const filteredCandidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return candidates.filter((task) => {
      if (existingBacklogIds.has(task.id)) return false;
      if (!q) return true;
      return task.title.toLowerCase().includes(q);
    });
  }, [candidates, existingBacklogIds, search]);

  const handleStatusChange = (status: TaskFormStatus) => {
    setFormStatus(status);
    setFormProgress(applyStatusChange(status, formProgress));
  };

  const handleProgressChange = (progress: number) => {
    setFormProgress(progress);
    setFormStatus(progressToFormStatus(progress));
  };

  const handlePickSubmit = async () => {
    if (!selectedId || submitting) return;
    setSubmitting(true);
    try {
      await dailyPlanService.createTask(planId, { backlog_task_id: selectedId });
      message.success("已添加到当日");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to link backlog task:", error);
      message.error("添加失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateSubmit = async () => {
    if (!formTitle.trim() || submitting) return;
    setSubmitting(true);
    const trimmedDescription = formDescription.trim();
    try {
      await dailyPlanService.createTask(planId, {
        title: formTitle.trim(),
        description: trimmedDescription || undefined,
        priority: formPriority,
        context: formContext,
        status: formStatusToDailyStatus(formStatus),
      });
      message.success("已创建并添加到当日");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to create task:", error);
      message.error("添加失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="添到今日"
      open={open}
      onCancel={onClose}
      onOk={mode === "pick" ? handlePickSubmit : handleCreateSubmit}
      okText={mode === "pick" ? "添加选中" : "创建并添加"}
      cancelText="取消"
      confirmLoading={submitting}
      okButtonProps={{
        disabled: mode === "pick" ? !selectedId : !formTitle.trim(),
      }}
      width={520}
    >
      <p className="text-sm text-gray-500 mb-3">将待办关联到 {planDate} 的每日进度</p>

      <div className="flex gap-1 mb-4">
        <button
          type="button"
          onClick={() => setMode("pick")}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md border transition-all ${
            mode === "pick"
              ? "border-indigo-600 bg-indigo-600 text-white"
              : "border-gray-200 text-gray-600 hover:border-gray-300"
          }`}
        >
          从待办选择
        </button>
        <button
          type="button"
          onClick={() => setMode("create")}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md border transition-all ${
            mode === "create"
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-gray-200 text-gray-600 hover:border-gray-300"
          }`}
        >
          新建待办
        </button>
      </div>

      {mode === "pick" ? (
        <div>
          <div className="relative mb-3">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索待办标题"
              className="pl-8"
              allowClear
            />
          </div>
          <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
            {loadingCandidates ? (
              <div className="py-8 text-center text-sm text-gray-400">加载中…</div>
            ) : filteredCandidates.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">
                {candidates.length === 0 ? "暂无待办" : "无匹配或未添加的待办"}
              </div>
            ) : (
              filteredCandidates.map((task) => {
                const selected = selectedId === task.id;
                const contextConfig = getTaskContextConfig(task.context);
                const priorityConfig = getTaskPriorityConfig(task.priority);
                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => setSelectedId(task.id)}
                    className={`w-full text-left px-3 py-2.5 transition-colors ${
                      selected ? "bg-indigo-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <p className="text-sm text-gray-800 break-words">{task.title}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {priorityConfig && (
                        <span
                          className="text-[10px] px-1 py-0.5 rounded font-medium"
                          style={{
                            backgroundColor: `${priorityConfig.color}18`,
                            color: priorityConfig.color,
                          }}
                        >
                          {priorityConfig.label}
                        </span>
                      )}
                      {contextConfig && (
                        <span
                          className="text-[10px] px-1 py-0.5 rounded font-medium"
                          style={{
                            backgroundColor: `${contextConfig.color}12`,
                            color: contextConfig.color,
                          }}
                        >
                          {contextConfig.label}
                        </span>
                      )}
                      {task.progress > 0 && task.progress < 100 && (
                        <span className="text-[10px] text-amber-600">{task.progress}%</span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <TaskFormPanel
          mode="create"
          title={formTitle}
          description={formDescription}
          context={formContext}
          priority={formPriority}
          status={formStatus}
          progress={formProgress}
          onTitleChange={setFormTitle}
          onDescriptionChange={setFormDescription}
          onContextChange={setFormContext}
          onPriorityChange={setFormPriority}
          onStatusChange={handleStatusChange}
          onProgressChange={handleProgressChange}
          onSubmit={handleCreateSubmit}
        />
      )}
    </Modal>
  );
}
