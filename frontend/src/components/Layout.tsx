import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { LogOut, Settings } from "lucide-react";
import { message } from "antd";
import { useAuthStore } from "@/store/authStore";
import { ProfileModal } from "@/components/ProfileModal";
import { SystemSettingsModal } from "@/components/SystemSettingsModal";
import type { User as UserType } from "@/types/auth";
import { useState } from "react";

export default function Layout() {
  const { user, clearAuth, setUser } = useAuthStore();
  const navigate = useNavigate();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSystemSettingsModal, setShowSystemSettingsModal] = useState(false);

  const navItems = [
    { path: "/daily-plans", label: "每日计划", shortLabel: "日" },
    { path: "/monthly-plans", label: "月度计划", shortLabel: "月" },
    { path: "/yearly-goals", label: "年度目标", shortLabel: "年" },
    { path: "/weekly-summaries", label: "周总结", shortLabel: "周" },
    { path: "/analytics", label: "数据统计", shortLabel: "统" },
  ];

  const handleLogout = () => {
    clearAuth();
    message.success("已退出登录");
    navigate("/login");
  };

  const handleProfileUpdate = (updatedUser: UserType) => {
    setUser(updatedUser);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-200">
        <div className="w-full mx-auto px-1 sm:px-2 md:px-4">
          <div className="flex items-center justify-between h-12 sm:h-14 md:h-16">
            {/* Logo - 隐藏在窄屏 */}
            <h1 className="hidden sm:block text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              FixLife
            </h1>

            {/* Navigation */}
            <nav className="flex flex-1 justify-center gap-0.5 sm:gap-0 md:space-x-1 mx-1 sm:mx-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `px-1.5 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                      isActive
                        ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`
                  }
                >
                  <span className="hidden sm:inline">{item.label}</span>
                  <span className="sm:hidden">{item.shortLabel}</span>
                </NavLink>
              ))}
            </nav>

            {/* User Menu */}
            <div className="flex items-center gap-1 sm:gap-2 md:gap-3 pl-1 sm:pl-2 border-l border-gray-200">
              {/* System Settings Button */}
              <button
                onClick={() => setShowSystemSettingsModal(true)}
                className="p-1.5 sm:p-2 text-gray-500 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all"
                title="系统设置"
              >
                <Settings size={16} />
              </button>

              {/* Avatar Only - 窄屏只显示头像 */}
              <button
                onClick={() => setShowProfileModal(true)}
                className="flex items-center gap-1 sm:gap-2 text-sm text-gray-700 hover:bg-gray-100 px-1 sm:px-2 py-1 rounded-lg transition-all"
                title="个人中心"
              >
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.username}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs sm:text-sm font-semibold">
                    {user?.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="hidden sm:inline font-medium text-xs sm:text-sm">
                  {user?.full_name || user?.username}
                </span>
              </button>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="p-1.5 sm:p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                title="退出登录"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-6">
        <Outlet />
      </main>

      {/* Profile Modal */}
      {showProfileModal && user && (
        <ProfileModal
          user={user}
          onClose={() => setShowProfileModal(false)}
          onUpdate={handleProfileUpdate}
        />
      )}

      {/* System Settings Modal */}
      {showSystemSettingsModal && (
        <SystemSettingsModal
          onClose={() => {
            setShowSystemSettingsModal(false);
            // Refresh the page to apply settings
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
