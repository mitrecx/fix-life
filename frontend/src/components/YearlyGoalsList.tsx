import { useEffect, useState } from "react";
import { Empty, Spin, Select, Space, Button, message, Modal } from "antd";
import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { useYearlyGoalStore } from "@/store/yearlyGoalStore";
import YearlyGoalCard from "./YearlyGoalCard";
import YearlyGoalForm from "./YearlyGoalForm";
import ProgressModal from "./ProgressModal";
import type { YearlyGoal as YearlyGoalType, YearlyGoalCreate } from "@/types/yearlyGoal";
import { GOAL_CATEGORIES } from "@/types/yearlyGoal";

const YearlyGoalsList = () => {
  const {
    goals,
    loading,
    error,
    fetchGoals,
    createGoal,
    updateGoal,
    updateProgress,
    deleteGoal,
    clearError,
  } = useYearlyGoalStore();

  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [formVisible, setFormVisible] = useState(false);
  const [editingGoal, setEditingGoal] = useState<YearlyGoalType | undefined>();
  const [progressModalVisible, setProgressModalVisible] = useState(false);
  const [progressGoal, setProgressGoal] = useState<YearlyGoalType | null>(null);

  useEffect(() => {
    fetchGoals(selectedYear, selectedCategory);
  }, [selectedYear, selectedCategory]);

  const handleRefresh = () => {
    fetchGoals(selectedYear, selectedCategory);
  };

  const handleCreate = async (values: YearlyGoalCreate) => {
    try {
      await createGoal(values);
      setFormVisible(false);
      message.success("目标创建成功！");
    } catch (error) {
      // Error is handled by store
    }
  };

  const handleEdit = (goal: YearlyGoalType) => {
    setEditingGoal(goal);
    setFormVisible(true);
  };

  const handleUpdate = async (values: YearlyGoalCreate) => {
    if (!editingGoal) return;
    try {
      await updateGoal(editingGoal.id, values);
      setFormVisible(false);
      setEditingGoal(undefined);
      message.success("目标更新成功！");
    } catch (error) {
      // Error is handled by store
    }
  };

  const handleDelete = (goal: YearlyGoalType) => {
    Modal.confirm({
      title: "确认删除",
      content: `确定要删除"${goal.title}"吗？此操作不可恢复。`,
      okText: "删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        try {
          await deleteGoal(goal.id);
          message.success("目标已删除！");
        } catch (error) {
          // Error is handled by store
        }
      },
    });
  };

  const handleUpdateProgress = (goal: YearlyGoalType) => {
    setProgressGoal(goal);
    setProgressModalVisible(true);
  };

  const handleProgressUpdate = async (goalId: string, progress: any) => {
    try {
      await updateProgress(goalId, progress);
      setProgressModalVisible(false);
      setProgressGoal(null);
    } catch (error) {
      // Error is handled by store
    }
  };

  const yearOptions = Array.from({ length: 10 }, (_, i) => {
    const year = new Date().getFullYear() - 2 + i;
    return { label: `${year}年`, value: year };
  });

  if (error) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <p style={{ color: "red", marginBottom: 16 }}>{error}</p>
        <Button onClick={clearError}>关闭</Button>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h2 style={{ margin: 0 }}>年度目标</h2>
        <Space>
          <Select
            value={selectedYear}
            onChange={setSelectedYear}
            options={yearOptions}
            style={{ width: 120 }}
          />
          <Select
            value={selectedCategory}
            onChange={setSelectedCategory}
            options={[{ label: "全部类别", value: undefined }, ...GOAL_CATEGORIES]}
            placeholder="选择类别"
            allowClear
            style={{ width: 120 }}
          />
          <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setFormVisible(true)}>
            新建目标
          </Button>
        </Space>
      </div>

      {/* Goals List */}
      {loading && goals.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48 }}>
          <Spin size="large" />
        </div>
      ) : goals.length === 0 ? (
        <Empty
          description="还没有年度目标，点击右上角创建一个吧！"
          style={{ marginTop: 48 }}
        />
      ) : (
        <div>
          {goals.map((goal) => (
            <YearlyGoalCard
              key={goal.id}
              goal={goal}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onUpdateProgress={handleUpdateProgress}
            />
          ))}
        </div>
      )}

      {/* Form Modal */}
      <YearlyGoalForm
        visible={formVisible}
        goal={editingGoal}
        onCancel={() => {
          setFormVisible(false);
          setEditingGoal(undefined);
        }}
        onOk={editingGoal ? handleUpdate : handleCreate}
        loading={loading}
      />

      {/* Progress Modal */}
      <ProgressModal
        visible={progressModalVisible}
        goal={progressGoal}
        onCancel={() => {
          setProgressModalVisible(false);
          setProgressGoal(null);
        }}
        onOk={handleProgressUpdate}
        loading={loading}
      />
    </div>
  );
};

export default YearlyGoalsList;
