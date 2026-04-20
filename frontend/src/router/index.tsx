import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import RequireNoPasswordReset from "@/components/RequireNoPasswordReset";
import RequireUsersManage from "@/components/RequireUsersManage";
import Layout from "@/components/Layout";
import PageLoader from "@/components/PageLoader";
import LoginPage from "@/pages/LoginPage";

const RegisterPage = lazy(() => import("@/pages/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("@/pages/ForgotPasswordPage"));
const YearlyGoalsPage = lazy(() => import("@/pages/YearlyGoalsPage"));
const MonthlyPlansPage = lazy(() => import("@/pages/MonthlyPlansPage"));
const DailyPlansPage = lazy(() => import("@/pages/DailyPlansPage"));
const AnalyticsPage = lazy(() => import("@/pages/AnalyticsPage"));
const WeeklySummariesPage = lazy(() => import("@/pages/WeeklySummariesPage"));
const WeeklySummaryDetailPage = lazy(() => import("@/pages/WeeklySummaryDetailPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const SystemStatusPage = lazy(() => import("@/pages/SystemStatusPage"));
const ForceChangePasswordPage = lazy(() => import("@/pages/ForceChangePasswordPage"));
const AdminUsersPage = lazy(() => import("@/pages/AdminUsersPage"));

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: (
      <Suspense fallback={<PageLoader />}>
        <RegisterPage />
      </Suspense>
    ),
  },
  {
    path: "/forgot-password",
    element: (
      <Suspense fallback={<PageLoader />}>
        <ForgotPasswordPage />
      </Suspense>
    ),
  },

  {
    path: "/force-change-password",
    element: (
      <ProtectedRoute>
        <Suspense fallback={<PageLoader />}>
          <ForceChangePasswordPage />
        </Suspense>
      </ProtectedRoute>
    ),
  },

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
