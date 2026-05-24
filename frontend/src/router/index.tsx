import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import RequireNoPasswordReset from "@/components/RequireNoPasswordReset";
import RequireUsersManage from "@/components/RequireUsersManage";
import Layout from "@/components/Layout";
import SettingsLayout from "@/components/SettingsLayout";
import RequireSystemStatusRead from "@/components/RequireSystemStatusRead";
import PageLoader from "@/components/PageLoader";
import LoginPage from "@/pages/LoginPage";

const QuickNotesPage = lazy(() => import("@/pages/QuickNotesPage"));
const RegisterPage = lazy(() => import("@/pages/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("@/pages/ForgotPasswordPage"));
const YearlyGoalsPage = lazy(() => import("@/pages/YearlyGoalsPage"));
const MonthlyPlansPage = lazy(() => import("@/pages/MonthlyPlansPage"));
const DailyPlansPage = lazy(() => import("@/pages/DailyPlansPage"));
const TodosPage = lazy(() => import("@/pages/TodosPage"));
const AnalyticsPage = lazy(() => import("@/pages/AnalyticsPage"));
const WeeklySummaryDetailPage = lazy(() => import("@/pages/WeeklySummaryDetailPage"));
const SettingsDisplayPage = lazy(() => import("@/pages/settings/SettingsDisplayPage"));
const SettingsNotificationPage = lazy(() => import("@/pages/settings/SettingsNotificationPage"));
const SettingsMcpPage = lazy(() => import("@/pages/settings/SettingsMcpPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const SystemStatusPage = lazy(() => import("@/pages/SystemStatusPage"));
const IpBanManagementPage = lazy(() => import("@/pages/IpBanManagementPage"));
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
        path: "quick-notes",
        element: (
          <Suspense fallback={<PageLoader />}>
            <QuickNotesPage />
          </Suspense>
        ),
      },
      {
        path: "daily-plans",
        element: <DailyPlansPage />,
      },
      {
        path: "todos",
        element: <TodosPage />,
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
        element: <Navigate to="/daily-plans" replace />,
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
        path: "system-management",
        element: <Navigate to="/settings/status" replace />,
      },
      {
        path: "system-management/status",
        element: <Navigate to="/settings/status" replace />,
      },
      {
        path: "system-management/ip-bans",
        element: <Navigate to="/settings/ip-bans" replace />,
      },
      {
        path: "system-status",
        element: <Navigate to="/settings/status" replace />,
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
        element: <SettingsLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="display" replace />,
          },
          {
            path: "display",
            element: (
              <Suspense fallback={<PageLoader />}>
                <SettingsDisplayPage />
              </Suspense>
            ),
          },
          {
            path: "notification",
            element: (
              <Suspense fallback={<PageLoader />}>
                <SettingsNotificationPage />
              </Suspense>
            ),
          },
          {
            path: "mcp",
            element: (
              <Suspense fallback={<PageLoader />}>
                <SettingsMcpPage />
              </Suspense>
            ),
          },
          {
            path: "status",
            element: (
              <RequireSystemStatusRead>
                <Suspense fallback={<PageLoader />}>
                  <SystemStatusPage />
                </Suspense>
              </RequireSystemStatusRead>
            ),
          },
          {
            path: "ip-bans",
            element: (
              <RequireSystemStatusRead>
                <Suspense fallback={<PageLoader />}>
                  <IpBanManagementPage />
                </Suspense>
              </RequireSystemStatusRead>
            ),
          },
        ],
      },
      {
        path: "profile",
        element: <ProfilePage />,
      },
    ],
  },
]);
