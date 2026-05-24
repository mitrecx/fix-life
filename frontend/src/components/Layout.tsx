import { Suspense, useMemo, useState, useEffect, type MouseEvent } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  LogOut,
  Settings,
  ListTodo,
  CalendarDays,
  Calendar,
  Target,
  BookOpen,
  BarChart3,
  Activity,
  Users,
  type LucideIcon,
} from "lucide-react";
import { message } from "antd";
import { useAuthStore } from "@/store/authStore";
import PageLoader from "@/components/PageLoader";

const SYSTEM_STATUS_READ = "system_status:read";
const USERS_MANAGE = "users:manage";
const SIDEBAR_COLLAPSED_KEY = "fix-life-sidebar-collapsed";

type NavItem = {
  path: string;
  label: string;
  icon: LucideIcon;
};

function readCollapsedPreference(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

export default function Layout() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(readCollapsedPreference);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch {
      // ignore storage errors
    }
  }, [collapsed]);

  const navItems = useMemo(() => {
    const items: NavItem[] = [
      { path: "/todos", label: "待办", icon: ListTodo },
      { path: "/daily-plans", label: "每日计划", icon: CalendarDays },
      { path: "/monthly-plans", label: "月度计划", icon: Calendar },
      { path: "/yearly-goals", label: "年度目标", icon: Target },
      { path: "/weekly-summaries", label: "周总结", icon: BookOpen },
      { path: "/analytics", label: "数据统计", icon: BarChart3 },
    ];
    if (user?.permissions?.includes(SYSTEM_STATUS_READ)) {
      items.push({ path: "/system-status", label: "系统状态", icon: Activity });
    }
    if (user?.permissions?.includes(USERS_MANAGE)) {
      items.push({ path: "/admin/users", label: "用户管理", icon: Users });
    }
    return items;
  }, [user]);

  const toggleCollapsed = () => setCollapsed((value) => !value);

  const handleToggleDoubleClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleCollapsed();
  };

  const handleLogout = () => {
    clearAuth();
    message.success("已退出登录");
    navigate("/login");
  };

  const collapseHint = collapsed ? "双击展开侧边栏" : "双击收起侧边栏";

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center rounded-lg py-2.5 text-sm font-medium transition-all ${
      collapsed ? "justify-center px-2" : "gap-3 px-3"
    } ${
      isActive
        ? "bg-indigo-50 text-indigo-700"
        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
    }`;

  const sidebarWidth = collapsed ? "w-16" : "w-56";
  const mainPadding = collapsed ? "pl-16" : "pl-56";

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex ${sidebarWidth} flex-col border-r border-gray-200 bg-white transition-[width] duration-200 ease-in-out`}
      >
        <div
          onDoubleClick={handleToggleDoubleClick}
          title={collapseHint}
          className={`flex h-14 w-full items-center border-b border-gray-200 cursor-default select-none ${
            collapsed ? "justify-center px-2" : "px-4"
          }`}
        >
          <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent truncate">
            {collapsed ? "FL" : "FixLife"}
          </h1>
        </div>

        <nav className={`flex-1 overflow-y-auto py-4 space-y-1 ${collapsed ? "px-2" : "px-3"}`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onDoubleClick={handleToggleDoubleClick}
                title={collapsed ? `${item.label} · ${collapseHint}` : `${item.label} · ${collapseHint}`}
                className={navLinkClass}
              >
                <Icon size={18} className="flex-shrink-0 pointer-events-none" />
                {!collapsed && <span className="truncate pointer-events-none">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className={`border-t border-gray-200 space-y-1 ${collapsed ? "p-2" : "p-3"}`}>
          <NavLink
            to="/settings"
            onDoubleClick={handleToggleDoubleClick}
            title={`系统设置 · ${collapseHint}`}
            className={navLinkClass}
          >
            <Settings size={18} className="flex-shrink-0 pointer-events-none" />
            {!collapsed && <span className="pointer-events-none">系统设置</span>}
          </NavLink>

          <NavLink
            to="/profile"
            onDoubleClick={handleToggleDoubleClick}
            title={`个人中心 · ${collapseHint}`}
            className={navLinkClass}
          >
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.username}
                className="w-[18px] h-[18px] rounded-full object-cover flex-shrink-0 pointer-events-none"
              />
            ) : (
              <div className="w-[18px] h-[18px] rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0 pointer-events-none">
                {user?.username.charAt(0).toUpperCase()}
              </div>
            )}
            {!collapsed && (
              <span className="truncate pointer-events-none">{user?.full_name || user?.username}</span>
            )}
          </NavLink>

          <button
            type="button"
            onClick={handleLogout}
            title="退出登录"
            className={`flex w-full items-center rounded-lg py-2.5 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all ${
              collapsed ? "justify-center px-2" : "gap-3 px-3"
            }`}
          >
            <LogOut size={18} className="flex-shrink-0 pointer-events-none" />
            {!collapsed && <span className="pointer-events-none">退出登录</span>}
          </button>
        </div>
      </aside>

      <div className={`flex flex-1 flex-col min-w-0 transition-[padding] duration-200 ease-in-out ${mainPadding}`}>
        <main className="flex-1 overflow-auto px-3 sm:px-4 py-3 sm:py-4">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
