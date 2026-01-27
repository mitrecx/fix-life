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
    { path: "/daily-plans", label: "每日计划" },
    { path: "/monthly-plans", label: "月度计划" },
    { path: "/yearly-goals", label: "年度目标" },
    { path: "/analytics", label: "数据统计" },
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-4">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              FixLife
            </h1>

            <div className="flex items-center gap-4">
              {/* Navigation */}
              <nav className="flex space-x-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>

              {/* User Menu */}
              <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                {/* System Settings Button */}
                <button
                  onClick={() => setShowSystemSettingsModal(true)}
                  className="p-2 text-gray-500 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all"
                  title="系统设置"
                >
                  <Settings size={18} />
                </button>

                {/* Avatar/Username - Clickable */}
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="flex items-center gap-2 text-sm text-gray-700 hover:bg-gray-100 px-2 py-1 rounded-lg transition-all"
                  title="个人中心"
                >
                  {user?.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.username}
                      className="w-8 h-8 rounded-full object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                      {user?.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="font-medium">{user?.full_name || user?.username}</span>
                </button>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  title="退出登录"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-4 py-6">
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
