import { Suspense, useMemo, useState, useEffect, type MouseEvent } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LogOut,
  Settings,
  ListTodo,
  NotebookPen,
  CalendarDays,
  Calendar,
  Target,
  BarChart3,
  Users,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { message } from "antd";
import { useAuthStore } from "@/store/authStore";
import PageLoader from "@/components/PageLoader";
import { MobileBottomNav, type MobileBottomNavItem } from "@/components/MobileBottomNav";
import { useIsMobile } from "@/hooks/useMediaQuery";

const USERS_MANAGE = "users:manage";
const QUICK_NOTES_USE = "quick_notes:use";
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

function resolvePageTitle(pathname: string, navItems: NavItem[]): string {
  if (pathname.startsWith("/settings/")) {
    return "系统设置";
  }
  if (pathname === "/profile") {
    return "个人中心";
  }
  const match = navItems.find(
    (item) => pathname === item.path || pathname.startsWith(`${item.path}/`),
  );
  return match?.label ?? "Fix Life";
}

export default function Layout() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(readCollapsedPreference);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch {
      // ignore storage errors
    }
  }, [collapsed]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobile) {
      setMobileNavOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    if (!mobileNavOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileNavOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileNavOpen]);

  const navItems = useMemo(() => {
    const items: NavItem[] = [];
    if (user?.permissions?.includes(QUICK_NOTES_USE)) {
      items.push({ path: "/quick-notes", label: "随手记", icon: NotebookPen });
    }
    items.push(
      { path: "/todos", label: "待办", icon: ListTodo },
      { path: "/daily-plans", label: "每日进度", icon: CalendarDays },
      { path: "/monthly-plans", label: "月度计划", icon: Calendar },
      { path: "/yearly-goals", label: "年度目标", icon: Target },
      { path: "/analytics", label: "数据统计", icon: BarChart3 },
    );
    if (user?.permissions?.includes(USERS_MANAGE)) {
      items.push({ path: "/admin/users", label: "用户管理", icon: Users });
    }
    items.push({ path: "/settings/display", label: "系统设置", icon: Settings });
    return items;
  }, [user]);

  const pageTitle = useMemo(
    () => resolvePageTitle(location.pathname, navItems),
    [location.pathname, navItems],
  );

  const mobileTabPaths = useMemo(() => {
    const paths = ["/todos", "/daily-plans"];
    if (user?.permissions?.includes(QUICK_NOTES_USE)) {
      paths.unshift("/quick-notes");
    }
    return paths;
  }, [user]);

  const isMoreTabActive = useMemo(() => {
    if (mobileNavOpen) {
      return true;
    }
    return !mobileTabPaths.some(
      (path) => location.pathname === path || location.pathname.startsWith(`${path}/`),
    );
  }, [location.pathname, mobileNavOpen, mobileTabPaths]);

  const mobileBottomNavItems = useMemo((): MobileBottomNavItem[] => {
    const items: MobileBottomNavItem[] = [];
    if (user?.permissions?.includes(QUICK_NOTES_USE)) {
      items.push({
        type: "link",
        path: "/quick-notes",
        label: "随手记",
        icon: NotebookPen,
      });
    }
    items.push(
      { type: "link", path: "/todos", label: "待办", icon: ListTodo },
      { type: "link", path: "/daily-plans", label: "每日", icon: CalendarDays },
      {
        type: "menu",
        label: "更多",
        icon: Menu,
        active: isMoreTabActive,
        onClick: () => setMobileNavOpen(true),
      },
    );
    return items;
  }, [user, isMoreTabActive]);

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
  const showLabels = isMobile || !collapsed;

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center rounded-lg py-2.5 text-sm font-medium transition-all ${
      showLabels ? "gap-3 px-3" : "justify-center px-2"
    } ${
      isActive
        ? "bg-indigo-50 text-indigo-700"
        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
    }`;

  const sidebarWidth = collapsed ? "w-16" : "w-56";
  const mainPadding = collapsed ? "md:pl-16" : "md:pl-56";

  const renderNavLinks = (onNavigate?: () => void) => (
    <>
      <nav className={`flex-1 overflow-y-auto py-4 space-y-1 ${showLabels ? "px-3" : "px-2"}`}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isSettings =
            item.path.startsWith("/settings") && location.pathname.startsWith("/settings/");
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              onDoubleClick={isMobile ? undefined : handleToggleDoubleClick}
              title={
                isMobile
                  ? item.label
                  : collapsed
                    ? `${item.label} · ${collapseHint}`
                    : `${item.label} · ${collapseHint}`
              }
              className={({ isActive }) => navLinkClass({ isActive: isActive || isSettings })}
            >
              <Icon size={18} className="flex-shrink-0 pointer-events-none" />
              {showLabels && <span className="truncate pointer-events-none">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className={`border-t border-gray-200 space-y-1 ${showLabels ? "p-3" : "p-2"}`}>
        <NavLink
          to="/profile"
          onClick={onNavigate}
          onDoubleClick={isMobile ? undefined : handleToggleDoubleClick}
          title={isMobile ? "个人中心" : `个人中心 · ${collapseHint}`}
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
          {showLabels && (
            <span className="truncate pointer-events-none">{user?.full_name || user?.username}</span>
          )}
        </NavLink>

        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            handleLogout();
          }}
          title="退出登录"
          className={`flex w-full items-center rounded-lg py-2.5 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all ${
            showLabels ? "gap-3 px-3" : "justify-center px-2"
          }`}
        >
          <LogOut size={18} className="flex-shrink-0 pointer-events-none" />
          {showLabels && <span className="pointer-events-none">退出登录</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen h-dvh overflow-hidden bg-gray-50 flex">
      <aside
        className={`hidden md:flex fixed inset-y-0 left-0 z-40 ${sidebarWidth} flex-col border-r border-gray-200 bg-white transition-[width] duration-200 ease-in-out`}
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
        {renderNavLinks()}
      </aside>

      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <button
            type="button"
            aria-label="关闭菜单"
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(280px,85vw)] flex-col border-r border-gray-200 bg-white shadow-xl pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            <div className="flex h-14 items-center justify-between border-b border-gray-200 px-4">
              <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                FixLife
              </h1>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
                aria-label="关闭菜单"
              >
                <X size={20} />
              </button>
            </div>
            {renderNavLinks(() => setMobileNavOpen(false))}
          </aside>
        </div>
      )}

      <div
        className={`flex flex-1 flex-col min-w-0 min-h-0 transition-[padding] duration-200 ease-in-out ${mainPadding}`}
      >
        <header className="md:hidden shrink-0 flex min-h-14 items-center border-b border-gray-200 bg-white px-4 pt-[env(safe-area-inset-top)]">
          <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-gray-900">{pageTitle}</h1>
        </header>

        <main className="mobile-shell-main flex-1 min-h-0 overflow-auto px-3 sm:px-4 py-3 sm:py-4 md:!pb-4">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <MobileBottomNav items={mobileBottomNavItems} />
    </div>
  );
}
