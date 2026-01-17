import { Modal, Form, Input, InputNumber, Select, message } from "antd";
import dayjs from "dayjs";
import type { YearlyGoal as YearlyGoalType, ProgressUpdate } from "@/types/yearlyGoal";

interface ProgressModalProps {
  visible: boolean;
  goal: YearlyGoalType | null;
  onCancel: () => void;
  onOk: (goalId: string, progress: ProgressUpdate) => Promise<void>;
  loading?: boolean;
}

const ProgressModal = ({
  visible,
  goal,
  onCancel,
  onOk,
  loading,
}: ProgressModalProps) => {
  const [form] = Form.useForm();

  const handleOk = async () => {
    if (!goal) return;

    try {
      const values = await form.validateFields();
      const progressData: ProgressUpdate = {
        progress: values.progress,
        month: values.month,
        note: values.note,
      };
      await onOk(goal.id, progressData);
      form.resetFields();
      message.success("进度更新成功！");
    } catch (error) {
      // Form validation failed or API error
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    label: `${i + 1}月`,
    value: i + 1,
  }));

  return (
    <Modal
      title="更新进度"
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText="更新"
      cancelText="取消"
    >
      {goal && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 16, fontWeight: 500 }}>{goal.title}</p>
          <p style={{ color: "#666" }}>
            当前进度：{goal.current_value} / {goal.target_value} {goal.unit || ""}
          </p>
        </div>
      )}

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          progress: 1,
          month: dayjs().month() + 1,
        }}
      >
        <Form.Item
          label="增加进度"
          name="progress"
          rules={[{ required: true, message: "请输入要增加的进度" }]}
        >
          <InputNumber
            style={{ width: "100%" }}
            min={0}
            step={1}
            placeholder="输入要增加的数值"
          />
        </Form.Item>

        <Form.Item
          label="更新月份里程碑（可选）"
          name="month"
          tooltip="选择要同步更新进度的月份"
        >
          <Select
            placeholder="选择月份"
            allowClear
            options={monthOptions}
          />
        </Form.Item>

        <Form.Item label="备注" name="note">
          <Input.TextArea rows={3} placeholder="添加备注信息..." maxLength={500} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ProgressModal;
