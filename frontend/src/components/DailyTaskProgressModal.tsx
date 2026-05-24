import { useEffect, useState } from "react";
import { Modal } from "antd";
import type { DailyProgressChoice } from "@/types/backlogTask";

const OPTIONS: { value: DailyProgressChoice; label: string }[] = [
  { value: "keep", label: "保持当前" },
  { value: 25, label: "25%" },
  { value: 50, label: "50%" },
  { value: 75, label: "75%" },
  { value: 100, label: "100% 全部完成" },
];

interface DailyTaskProgressModalProps {
  open: boolean;
  taskTitle: string;
  currentProgress: number;
  loading?: boolean;
  onConfirm: (choice: DailyProgressChoice) => void;
  onCancel: () => void;
}

export function DailyTaskProgressModal({
  open,
  taskTitle,
  currentProgress,
  loading = false,
  onConfirm,
  onCancel,
}: DailyTaskProgressModalProps) {
  const [choice, setChoice] = useState<DailyProgressChoice>("keep");

  useEffect(() => {
    if (open) setChoice("keep");
  }, [open]);

  return (
    <Modal
      title="更新整体进度？"
      open={open}
      onCancel={onCancel}
      onOk={() => onConfirm(choice)}
      okText="确认"
      cancelText="取消"
      confirmLoading={loading}
    >
      <p className="text-sm text-gray-600 mb-1">「{taskTitle}」已在今日标记完成。</p>
      <p className="text-sm text-gray-500 mb-4">
        当前整体进度 {currentProgress}%，是否同步更新待办进度？
      </p>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => setChoice(opt.value)}
            className={`px-3 py-1.5 text-xs rounded-md border transition-all ${
              choice === opt.value
                ? opt.value === 100
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-indigo-600 bg-indigo-600 text-white"
                : "border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </Modal>
  );
}
