import { useCallback, useEffect, useState } from "react";
import { Modal, message } from "antd";
import { Wrench } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import {
  taskDataRepairService,
  type DataRepairPreview,
  type DataRepairRunResult,
} from "@/services/taskDataRepairService";

interface DataRepairModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function DataRepairModal({ open, onClose, onComplete }: DataRepairModalProps) {
  const [preview, setPreview] = useState<DataRepairPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<DataRepairRunResult | null>(null);
  const [mergingPair, setMergingPair] = useState<string | null>(null);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    setLastResult(null);
    try {
      const data = await taskDataRepairService.preview();
      setPreview(data);
    } catch (error) {
      console.error("Failed to load repair preview:", error);
      message.error("加载修复预览失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      void loadPreview();
    } else {
      setPreview(null);
      setLastResult(null);
    }
  }, [open, loadPreview]);

  const handleDryRun = async () => {
    setRunning(true);
    try {
      const result = await taskDataRepairService.run(true);
      setLastResult(result);
      message.info("预演完成（未写入数据库）");
    } catch (error) {
      console.error("Dry run failed:", error);
      message.error("预演失败");
    } finally {
      setRunning(false);
    }
  };

  const handleRun = async () => {
    Modal.confirm({
      title: "确认执行数据修复？",
      content:
        "将回填无关联的每日任务、合并同标题同日的重复待办。同日复制的每日条目会被删除，此操作不可撤销。",
      okText: "执行修复",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        setRunning(true);
        try {
          const result = await taskDataRepairService.run(false);
          setLastResult(result);
          message.success("数据修复完成");
          onComplete();
          await loadPreview();
        } catch (error) {
          console.error("Repair run failed:", error);
          message.error("修复失败");
        } finally {
          setRunning(false);
        }
      },
    });
  };

  const handleMergePair = async (keeperId: string, mergeId: string) => {
    const key = `${keeperId}:${mergeId}`;
    setMergingPair(key);
    try {
      await taskDataRepairService.merge(keeperId, mergeId);
      message.success("已合并重复待办");
      onComplete();
      await loadPreview();
    } catch (error) {
      console.error("Merge failed:", error);
      message.error("合并失败");
    } finally {
      setMergingPair(null);
    }
  };

  const hasWork =
    preview &&
    (preview.orphan_daily_count > 0 ||
      preview.duplicate_groups.length > 0 ||
      preview.fuzzy_duplicate_pairs.length > 0);

  return (
    <Modal
      title={
        <span className="inline-flex items-center gap-2">
          <Wrench size={16} />
          数据修复
        </span>
      }
      open={open}
      onCancel={onClose}
      width={640}
      footer={[
        <button
          key="dry"
          type="button"
          disabled={loading || running || !hasWork}
          onClick={handleDryRun}
          className="px-4 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 mr-2"
        >
          预演
        </button>,
        <button
          key="run"
          type="button"
          disabled={loading || running || !hasWork}
          onClick={handleRun}
          className="px-4 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {running ? "处理中…" : "执行修复"}
        </button>,
      ]}
    >
      {loading ? (
        <LoadingSpinner size="small" label="分析数据中…" block />
      ) : preview ? (
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="孤立每日任务" value={preview.orphan_daily_count} />
            <Stat label="重复待办组" value={preview.duplicate_groups.length} />
            <Stat label="可能重复对" value={preview.fuzzy_duplicate_pairs.length} />
            <Stat
              label="预计合并待办"
              value={preview.would_merge_backlogs}
            />
          </div>

          {preview.orphan_daily_count > 0 && (
            <Section title="孤立每日任务（样本）">
              <ul className="space-y-1 max-h-32 overflow-y-auto">
                {preview.orphan_samples.map((item) => (
                  <li key={item.daily_task_id} className="text-gray-600">
                    {item.plan_date} · {item.title}
                    <span className="text-gray-400 ml-1">
                      ({item.suggested_action === "link_existing" ? "关联已有" : "新建待办"})
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {preview.duplicate_groups.length > 0 && (
            <Section title="同标题同日重复">
              <ul className="space-y-1 max-h-28 overflow-y-auto">
                {preview.duplicate_groups.map((g) => (
                  <li key={`${g.plan_date}-${g.normalized_title}`} className="text-gray-600">
                    {g.plan_date} · {g.normalized_title}（{g.backlog_ids.length} 条）
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {preview.fuzzy_duplicate_pairs.length > 0 && (
            <Section title="可能重复（7 天内同标题）">
              <ul className="space-y-2 max-h-40 overflow-y-auto">
                {preview.fuzzy_duplicate_pairs.map((pair) => {
                  const key = `${pair.backlog_id_a}:${pair.backlog_id_b}`;
                  const isMerging = mergingPair === key;
                  return (
                    <li
                      key={key}
                      className="flex items-center justify-between gap-2 text-gray-600"
                    >
                      <span className="min-w-0 truncate">
                        {pair.title}
                        <span className="text-gray-400 ml-1">({pair.days_apart} 天内)</span>
                      </span>
                      <button
                        type="button"
                        disabled={!!mergingPair}
                        onClick={() => handleMergePair(pair.backlog_id_a, pair.backlog_id_b)}
                        className="shrink-0 px-2 py-0.5 text-xs text-indigo-600 hover:bg-indigo-50 rounded disabled:opacity-50"
                      >
                        {isMerging ? "合并中…" : "合并"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Section>
          )}

          {!hasWork && (
            <p className="text-center text-gray-400 py-6">暂无需要修复的数据</p>
          )}

          {lastResult && (
            <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 text-xs text-gray-600 space-y-1">
              <p className="font-medium text-gray-700">
                {lastResult.dry_run ? "预演结果" : "执行结果"}
              </p>
              <p>关联已有待办：{lastResult.linked_existing}</p>
              <p>新建待办：{lastResult.created_backlog}</p>
              <p>合并待办：{lastResult.merged_backlogs}</p>
              <p>删除重复每日条目：{lastResult.deleted_duplicate_dailies}</p>
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-gray-800 tabular-nums">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-700 mb-1.5">{title}</h4>
      {children}
    </div>
  );
}
