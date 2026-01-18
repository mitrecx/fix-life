import { createBrowserRouter } from "react-router-dom";
import Layout from "@/components/Layout";
import YearlyGoalsPage from "@/pages/YearlyGoalsPage";
import MonthlyPlansPage from "@/pages/MonthlyPlansPage";
import DailyPlansPage from "@/pages/DailyPlansPage";
import AnalyticsPage from "@/pages/AnalyticsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <YearlyGoalsPage />,
      },
      {
        path: "yearly-goals",
        element: <YearlyGoalsPage />,
      },
      {
        path: "monthly-plans",
        element: <MonthlyPlansPage />,
      },
      {
        path: "daily-plans",
        element: <DailyPlansPage />,
      },
      {
        path: "analytics",
        element: <AnalyticsPage />,
      },
    ],
  },
]);
