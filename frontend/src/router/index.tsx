import { createBrowserRouter } from "react-router-dom";
import { Navigate } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import RequireNoPasswordReset from "@/components/RequireNoPasswordReset";
import RequireUsersManage from "@/components/RequireUsersManage";
import Layout from "@/components/Layout";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import YearlyGoalsPage from "@/pages/YearlyGoalsPage";
import MonthlyPlansPage from "@/pages/MonthlyPlansPage";
import DailyPlansPage from "@/pages/DailyPlansPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import WeeklySummariesPage from "@/pages/WeeklySummariesPage";
import WeeklySummaryDetailPage from "@/pages/WeeklySummaryDetailPage";
import SettingsPage from "@/pages/SettingsPage";
import ProfilePage from "@/pages/ProfilePage";
import SystemStatusPage from "@/pages/SystemStatusPage";
import ForceChangePasswordPage from "@/pages/ForceChangePasswordPage";
import AdminUsersPage from "@/pages/AdminUsersPage";

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

  {
    path: "/force-change-password",
    element: (
      <ProtectedRoute>
        <ForceChangePasswordPage />
      </ProtectedRoute>
    ),
  },

  // Protected routes
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <RequireNoPasswordReset>
          <Layout />
        </RequireNoPasswordReset>
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
        path: "weekly-summaries",
        element: <WeeklySummariesPage />,
      },
      {
        path: "weekly-summaries/:summaryId",
        element: <WeeklySummaryDetailPage />,
      },
      {
        path: "analytics",
        element: <AnalyticsPage />,
      },
      {
        path: "system-status",
        element: <SystemStatusPage />,
      },
      {
        path: "admin/users",
        element: (
          <RequireUsersManage>
            <AdminUsersPage />
          </RequireUsersManage>
        ),
      },
      {
        path: "settings",
        element: <SettingsPage />,
      },
      {
        path: "profile",
        element: <ProfilePage />,
      },
    ],
  },
]);
