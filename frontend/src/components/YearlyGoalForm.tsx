import { Modal, Form, Input, InputNumber, Select, DatePicker, ColorPicker, Switch } from "antd";
import dayjs from "dayjs";
import type {
  YearlyGoal as YearlyGoalType,
  YearlyGoalCreate,
} from "@/types/yearlyGoal";
import { GOAL_CATEGORIES } from "@/types/yearlyGoal";

interface YearlyGoalFormProps {
  visible: boolean;
  goal?: YearlyGoalType;
  onCancel: () => void;
  onOk: (values: YearlyGoalCreate) => Promise<void>;
  loading?: boolean;
}

const YearlyGoalForm = ({
  visible,
  goal,
  onCancel,
  onOk,
  loading,
}: YearlyGoalFormProps) => {
  const [form] = Form.useForm();

  const isEdit = !!goal;

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const goalData: YearlyGoalCreate = {
        year: values.year,
        title: values.title,
        description: values.description,
        category: values.category,
        color: typeof values.color === "string" ? values.color : values.color?.toHexString() || "#3B82F6",
        target_value: values.target_value,
        unit: values.unit,
        start_date: values.start_date ? values.start_date.format("YYYY-MM-DD") : undefined,
        end_date: values.end_date ? values.end_date.format("YYYY-MM-DD") : undefined,
        auto_generate_milestones: values.auto_generate_milestones ?? true,
      };
      await onOk(goalData);
      form.resetFields();
    } catch (error) {
      // Form validation failed or API error
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title={isEdit ? "编辑年度目标" : "创建年度目标"}
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={loading}
      width={600}
      okText={isEdit ? "保存" : "创建"}
      cancelText="取消"
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={
          isEdit
            ? {
                ...goal,
                color: goal.color || "#3B82F6",
                start_date: goal.start_date ? dayjs(goal.start_date) : null,
                end_date: goal.end_date ? dayjs(goal.end_date) : null,
              }
            : {
                year: dayjs().year(),
                color: "#3B82F6",
                auto_generate_milestones: true,
              }
        }
      >
        <Form.Item
          label="年度"
          name="year"
          rules={[{ required: true, message: "请选择年度" }]}
        >
          <InputNumber style={{ width: "100%" }} min={2020} max={2100} />
        </Form.Item>

        <Form.Item
          label="目标标题"
          name="title"
          rules={[
            { required: true, message: "请输入目标标题" },
            { max: 200, message: "标题最多200个字符" },
          ]}
        >
          <Input placeholder="例如：年度阅读50本书" />
        </Form.Item>

        <Form.Item label="详细描述" name="description">
          <Input.TextArea
            rows={3}
            placeholder="详细描述你的目标..."
            maxLength={1000}
            showCount
          />
        </Form.Item>

        <Form.Item
          label="目标类别"
          name="category"
          rules={[{ required: true, message: "请选择目标类别" }]}
        >
          <Select
            placeholder="选择类别"
            options={GOAL_CATEGORIES.map((c) => ({
              label: c.label,
              value: c.value,
            }))}
          />
        </Form.Item>

        <Form.Item label="显示颜色" name="color">
          <ColorPicker showText />
        </Form.Item>

        <Form.Item
          label="目标数值"
          name="target_value"
          rules={[{ required: true, message: "请输入目标数值" }]}
        >
          <InputNumber
            style={{ width: "100%" }}
            min={0}
            step={0.01}
            placeholder="例如：50"
          />
        </Form.Item>

        <Form.Item label="计量单位" name="unit">
          <Input placeholder="例如：本、小时、次、元" />
        </Form.Item>

        <Form.Item label="开始日期" name="start_date">
          <DatePicker style={{ width: "100%" }} placeholder="选择开始日期" />
        </Form.Item>

        <Form.Item label="结束日期" name="end_date">
          <DatePicker style={{ width: "100%" }} placeholder="选择结束日期" />
        </Form.Item>

        <Form.Item
          label="自动生成里程碑"
          name="auto_generate_milestones"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default YearlyGoalForm;
