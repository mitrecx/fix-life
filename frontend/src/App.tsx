import { useState } from "react";
import { ConfigProvider, Tabs } from "antd";
import zhCN from "antd/locale/zh_CN";
import YearlyGoalsList from "./components/YearlyGoalsList";
import { MonthlyPlansList } from "./components/MonthlyPlansList";
import { DailyPlansList } from "./components/DailyPlansList";

function App() {
  const [activeTab, setActiveTab] = useState("yearly");

  const items = [
    {
      key: "yearly",
      label: "年度目标",
      children: <YearlyGoalsList />,
    },
    {
      key: "monthly",
      label: "月度计划",
      children: <MonthlyPlansList />,
    },
    {
      key: "daily",
      label: "每日计划",
      children: <DailyPlansList />,
    },
  ];

  return (
    <ConfigProvider locale={zhCN}>
      <div style={{ minHeight: "100vh", backgroundColor: "#f5f5f5", padding: "16px" }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={items}
          size="large"
        />
      </div>
    </ConfigProvider>
  );
}

export default App;
