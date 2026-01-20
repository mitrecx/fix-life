import { useState, useEffect } from "react";
import { X, BookOpen, Save } from "lucide-react";
import { Modal, message } from "antd";
import type { DailySummary, DailySummaryCreate, SummaryType } from "@/types/dailySummary";
import { SUMMARY_TYPE_OPTIONS } from "@/types/dailySummary";
import { dailySummaryService } from "@/services/dailySummaryService";

interface DailySummaryModalProps {
  planId: string;
  planDate: string;
  onClose: () => void;
  onUpdate: () => void;
}

export function DailySummaryModal({ planId, planDate, onClose, onUpdate }: DailySummaryModalProps) {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [existingSummary, setExistingSummary] = useState<DailySummary | null>(null);
  const [summaryType, setSummaryType] = useState<SummaryType>("daily");
  const [content, setContent] = useState("");

  // Load existing summary if any
  useEffect(() => {
    loadSummary();
  }, [planId]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const loadSummary = async () => {
    setInitialLoading(true);
    try {
      const summary = await dailySummaryService.getByPlanId(planId);
      setExistingSummary(summary);
      setSummaryType(summary.summary_type);
      setContent(summary.content);
    } catch (error) {
      // 404 means no summary exists yet, which is fine
      setExistingSummary(null);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      message.warning("请填写日记内容");
      return;
    }

    setLoading(true);
    try {
      const data: DailySummaryCreate = {
        summary_type: summaryType,
        content: content.trim(),
      };

      if (existingSummary) {
        await dailySummaryService.update(existingSummary.id, data);
        message.success("总结更新成功");
      } else {
        await dailySummaryService.create(planId, data);
        message.success("总结创建成功");
      }

      onUpdate();
      onClose();
    } catch (error) {
      console.error("Failed to save summary:", error);
      message.error("保存失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!existingSummary) return;

    Modal.confirm({
      title: "确认删除",
      content: "确定要删除这条总结吗？删除后无法恢复。",
      okText: "删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        try {
          await dailySummaryService.delete(existingSummary.id);
          message.success("总结已删除");
          onUpdate();
          onClose();
        } catch (error) {
          console.error("Failed to delete summary:", error);
          message.error("删除失败，请稍后重试");
        }
      },
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl animate-in fade-in zoom-in duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-indigo-50 to-purple-50 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
              <BookOpen className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">每日总结</h2>
              <p className="text-sm text-gray-500">{planDate}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        {initialLoading ? (
          <div className="p-6 flex items-center justify-center">
            <div className="text-gray-500 text-sm">加载中...</div>
          </div>
        ) : (
          <div className="p-6">
            {/* Summary Type Selection */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-600 mb-2">
                类型
              </label>
              <div className="flex gap-4">
                {SUMMARY_TYPE_OPTIONS.map((option) => (
                  <div
                    key={option.value}
                    onClick={() => setSummaryType(option.value)}
                    className={`flex items-center gap-2 cursor-pointer transition-all ${
                      summaryType === option.value ? "text-indigo-700" : "text-gray-600 hover:text-gray-800"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                      summaryType === option.value ? "border-indigo-500" : "border-gray-300"
                    }`}>
                      {summaryType === option.value && (
                        <div className="w-2 h-2 rounded-full bg-indigo-500" />
                      )}
                    </div>
                    <span className="text-sm">{option.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Content Input */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-600 mb-2">
                日记
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all overflow-y-auto text-sm"
                style={{ maxHeight: '200px' }}
                placeholder="记录今天的收获、感想、反思..."
              />
              <div className="mt-1.5 text-xs text-gray-500">
                {content.length} 字
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t bg-gray-50">
          <div>
            {!initialLoading && existingSummary && (
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
              >
                删除总结
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !content.trim() || initialLoading}
              className="px-5 py-2.5 text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-medium shadow-md"
            >
              <Save size={18} className="mr-2" />
              {loading ? "保存中..." : existingSummary ? "更新总结" : "保存总结"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
