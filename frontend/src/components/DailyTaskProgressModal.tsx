import { useEffect, useState } from "react";
import { Modal } from "antd";
import type { DailyProgressChoice } from "@/types/backlogTask";

const PRESET_OPTIONS: { value: number; label: string }[] = [
  { value: 25, label: "25%" },
  { value: 50, label: "50%" },
  { value: 75, label: "75%" },
  { value: 100, label: "100%" },
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
  const [keepCurrent, setKeepCurrent] = useState(true);
  const [targetProgress, setTargetProgress] = useState(currentProgress);

  useEffect(() => {
    if (open) {
      setKeepCurrent(true);
      setTargetProgress(currentProgress);
    }
  }, [open, currentProgress]);

  const clampProgress = (value: number) => Math.min(100, Math.max(0, Math.round(value)));
  const delta = keepCurrent ? 0 : Math.max(0, clampProgress(targetProgress) - currentProgress);

  const handleConfirm = () => {
    if (keepCurrent) {
      onConfirm("keep");
      return;
    }
    onConfirm(clampProgress(targetProgress));
  };

  return (
    <Modal
      title="更新整体进度？"
      open={open}
      onCancel={onCancel}
      onOk={handleConfirm}
      okText="确认"
      cancelText="取消"
      confirmLoading={loading}
    >
      <p className="text-sm text-gray-600 mb-1">「{taskTitle}」已在今日标记完成。</p>
      <p className="text-sm text-gray-500 mb-4">
        当前整体进度 {currentProgress}%，是否同步更新待办总进度？
      </p>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setKeepCurrent(true)}
          className={`w-full px-3 py-2 text-sm rounded-lg border text-left transition-all ${
            keepCurrent
              ? "border-indigo-600 bg-indigo-50 text-indigo-900"
              : "border-gray-200 text-gray-600 hover:border-gray-300"
          }`}
        >
          保持当前（{currentProgress}%）
        </button>

        <div
          className={`rounded-lg border p-3 space-y-3 transition-all ${
            !keepCurrent ? "border-indigo-600 bg-indigo-50/40" : "border-gray-200"
          }`}
        >
          <button
            type="button"
            onClick={() => setKeepCurrent(false)}
            className="text-sm font-medium text-gray-800"
          >
            更新总进度
          </button>

          <div className="flex flex-wrap gap-2">
            {PRESET_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setKeepCurrent(false);
                  setTargetProgress(opt.value);
                }}
                className={`px-3 py-1.5 text-xs rounded-md border transition-all ${
                  !keepCurrent && clampProgress(targetProgress) === opt.value
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

          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={targetProgress}
              onFocus={() => setKeepCurrent(false)}
              onChange={(e) => {
                setKeepCurrent(false);
                setTargetProgress(Number(e.target.value));
              }}
              className="w-20 px-2 py-1.5 text-sm border border-gray-200 rounded-md text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-500">% 总进度</span>
          </div>

          {!keepCurrent && (
            <p className="text-sm text-amber-700">
              今日推进 <span className="font-semibold tabular-nums">+{delta}%</span>
              {delta > 0 ? `，总进度 ${clampProgress(targetProgress)}%` : "（未高于当前进度）"}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
