import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import YearlyGoalsList from "./components/YearlyGoalsList";

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <div style={{ minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
        <YearlyGoalsList />
      </div>
    </ConfigProvider>
  );
}

export default App;
