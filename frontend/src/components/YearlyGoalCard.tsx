import { Card, Progress, Tag, Button, Space, Tooltip } from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import type { YearlyGoal as YearlyGoalType } from "@/types/yearlyGoal";
import { GOAL_CATEGORIES, GOAL_STATUS } from "@/types/yearlyGoal";

interface YearlyGoalCardProps {
  goal: YearlyGoalType;
  onEdit: (goal: YearlyGoalType) => void;
  onDelete: (goal: YearlyGoalType) => void;
  onUpdateProgress: (goal: YearlyGoalType) => void;
}

const YearlyGoalCard = ({
  goal,
  onEdit,
  onDelete,
  onUpdateProgress,
}: YearlyGoalCardProps) => {
  const categoryInfo = GOAL_CATEGORIES.find((c) => c.value === goal.category);
  const statusInfo = GOAL_STATUS.find((s) => s.value === goal.status);

  const formatValue = (value: number) => {
    if (goal.unit) {
      return `${value} ${goal.unit}`;
    }
    return value.toString();
  };

  return (
    <Card
      hoverable
      style={{ marginBottom: 16 }}
      title={
        <Space style={{ maxWidth: "calc(100vw - 200px)" }}>
          <span
            style={{
              display: "inline-block",
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: goal.color,
            }}
          />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {goal.title}
          </span>
          <Tag color={categoryInfo?.color}>{categoryInfo?.label}</Tag>
        </Space>
      }
      extra={
        <Space>
          <Tooltip title="更新进度">
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => onUpdateProgress(goal)}
            >
              更新进度
            </Button>
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEdit(goal)}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => onDelete(goal)}
            />
          </Tooltip>
        </Space>
      }
    >
      <Space direction="vertical" style={{ width: "100%" }} size="large">
        {/* Progress */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <span style={{ color: "#666" }}>
              {formatValue(Number(goal.current_value))} /{" "}
              {formatValue(Number(goal.target_value))}
            </span>
            <Space>
              <TrophyOutlined style={{ color: "#F59E0B" }} />
              <span style={{ fontWeight: 600, fontSize: 16 }}>
                {goal.completion_rate}%
              </span>
            </Space>
          </div>
          <Progress
            percent={goal.completion_rate}
            strokeColor={goal.color}
            strokeWidth={12}
            showInfo={false}
          />
        </div>

        {/* Description */}
        {goal.description && (
          <div style={{ color: "#666", wordBreak: "break-word" }}>{goal.description}</div>
        )}

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 12,
            color: "#999",
          }}
        >
          <span>{goal.year}年</span>
          <Tag color={statusInfo?.color}>{statusInfo?.label}</Tag>
        </div>
      </Space>
    </Card>
  );
};

export default YearlyGoalCard;
