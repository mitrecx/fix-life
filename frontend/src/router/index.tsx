import { createBrowserRouter } from "react-router-dom";
import { Navigate } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import YearlyGoalsPage from "@/pages/YearlyGoalsPage";
import MonthlyPlansPage from "@/pages/MonthlyPlansPage";
import DailyPlansPage from "@/pages/DailyPlansPage";
import AnalyticsPage from "@/pages/AnalyticsPage";

export const router = createBrowserRouter([
  // Public routes
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    path: "/forgot-password",
    element: <ForgotPasswordPage />,
  },

  // Protected routes
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/daily-plans" replace />,
      },
      {
        path: "daily-plans",
        element: <DailyPlansPage />,
      },
      {
        path: "monthly-plans",
        element: <MonthlyPlansPage />,
      },
      {
        path: "yearly-goals",
        element: <YearlyGoalsPage />,
      },
      {
        path: "analytics",
        element: <AnalyticsPage />,
      },
    ],
  },
]);
