import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button, message, Modal, InputNumber } from "antd";
import { weeklySummaryService } from "@/services/weeklySummaryService";

function getISOWeek(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getLastWeekDefaults() {
  const today = new Date();
  const lastMonday = new Date(today);
  lastMonday.setDate(today.getDate() - today.getDay() - 6);
  return {
    year: lastMonday.getFullYear(),
    week: getISOWeek(lastMonday),
  };
}

type GenerateWeeklySummaryButtonProps = {
  defaultYear?: number;
  defaultWeek?: number;
};

export function GenerateWeeklySummaryButton({
  defaultYear,
  defaultWeek,
}: GenerateWeeklySummaryButtonProps) {
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [generateYear, setGenerateYear] = useState(new Date().getFullYear());
  const [generateWeek, setGenerateWeek] = useState<number | null>(null);

  const handleOpenGenerateModal = () => {
    if (defaultYear !== undefined && defaultWeek !== undefined) {
      setGenerateYear(defaultYear);
      setGenerateWeek(defaultWeek);
    } else {
      const { year, week } = getLastWeekDefaults();
      setGenerateYear(year);
      setGenerateWeek(week);
    }
    setIsModalOpen(true);
  };

  const handleGenerate = async () => {
    if (generateWeek === null) {
      message.warning("请选择周数");
      return;
    }

    setGenerating(true);
    setIsModalOpen(false);
    try {
      const summary = await weeklySummaryService.generate({
        year: generateYear,
        week_number: generateWeek,
        force_regenerate: true,
      });
      message.success("周总结生成成功");
      navigate(`/weekly-summaries/${summary.id}`);
    } catch (error: unknown) {
      console.error("Failed to generate weekly summary:", error);
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        message.warning("该周没有每日进度数据");
      } else {
        message.error("生成周总结失败");
      }
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <Button
        type="primary"
        icon={<Plus size={18} />}
        onClick={handleOpenGenerateModal}
        loading={generating}
        className="shadow-lg"
      >
        生成周总结
      </Button>

      <Modal
        title="生成周总结"
        open={isModalOpen}
        onOk={handleGenerate}
        onCancel={() => setIsModalOpen(false)}
        confirmLoading={generating}
        okText="生成"
        cancelText="取消"
      >
        <div className="space-y-4 py-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">年份</label>
            <InputNumber
              value={generateYear}
              onChange={(value) => setGenerateYear(value || new Date().getFullYear())}
              min={2020}
              max={2030}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">周数 (1-53)</label>
            <InputNumber
              value={generateWeek}
              onChange={(value) => setGenerateWeek(value)}
              min={1}
              max={53}
              className="w-full"
            />
          </div>
          <p className="text-sm text-gray-500">如果该周的总结已存在，将自动覆盖更新。</p>
        </div>
      </Modal>
    </>
  );
}
