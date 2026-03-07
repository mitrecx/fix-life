import { useState, useRef } from "react";
import {
  User as UserIcon,
  Camera,
  Mail,
  Calendar,
  Lock,
} from "lucide-react";
import { Input, message } from "antd";
import { useAuthStore } from "@/store/authStore";
import api from "@/services/api";
import type { User } from "@/types/auth";

type ProfileTab = "info" | "password";

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<ProfileTab>("info");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Profile form state
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "");

  // Password form state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const menuItems = [
    {
      key: "info" as ProfileTab,
      icon: UserIcon,
      label: "个人信息",
      description: "查看和编辑个人资料",
    },
    {
      key: "password" as ProfileTab,
      icon: Lock,
      label: "修改密码",
      description: "更改账户密码",
    },
  ];

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      message.error("请上传 JPG, PNG, GIF 或 WEBP 格式的图片");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      message.error("文件大小不能超过 5MB");
      return;
    }

    setIsUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await api.post<{ avatar_url: string; message: string }>(
        "/users/me/upload-avatar",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setAvatarUrl(response.avatar_url);
      if (user) {
        setUser({ ...user, avatar_url: response.avatar_url });
      }
      message.success("头像上传成功");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "头像上传失败");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;

    setIsLoading(true);

    try {
      const response = await api.put<User>("/users/me", {
        full_name: fullName || undefined,
        avatar_url: avatarUrl || undefined,
      });

      setUser(response);
      message.success("个人信息更新成功");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "更新失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      message.error("两次输入的密码不一致");
      return;
    }

    if (newPassword.length < 8) {
      message.error("新密码至少需要8个字符");
      return;
    }

    setIsChangingPassword(true);

    try {
      await api.post("/users/me/change-password", {
        old_password: oldPassword,
        new_password: newPassword,
      });

      message.success("密码修改成功");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "密码修改失败");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
              <UserIcon className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">个人中心</h1>
            </div>
          </div>
          {activeTab === "info" && (
            <button
              onClick={handleUpdateProfile}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? "保存中..." : "保存"}
            </button>
          )}
          {activeTab === "password" && (
            <button
              onClick={handleChangePassword}
              disabled={isChangingPassword || !oldPassword || !newPassword || !confirmPassword}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isChangingPassword ? "修改中..." : "修改密码"}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex gap-6">
        {/* Left Sidebar */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 p-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all mb-1 ${
                    isActive
                      ? "bg-indigo-50 text-indigo-600"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <Icon size={18} />
                  <div className="text-left flex-1">
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-xs opacity-70 mt-0.5">
                      {item.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Content */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            {/* Profile Info */}
            {activeTab === "info" && user && (
              <div className="space-y-6">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">
                    个人信息
                  </h2>
                  <p className="text-sm text-gray-500">
                    查看和编辑您的个人资料
                  </p>
                </div>

                {/* Avatar */}
                <div className="flex flex-col items-center">
                  <div className="relative group">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={user.username}
                        className="w-24 h-24 rounded-full object-cover border-4 border-gray-100"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-semibold">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                      className="absolute bottom-0 right-0 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full shadow-lg transition-colors disabled:opacity-50"
                    >
                      <Camera size={16} />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    点击相机图标更换头像
                  </p>
                </div>

                {/* User Info Display */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center text-sm">
                    <UserIcon size={18} className="text-gray-400 mr-3 w-5" />
                    <span className="text-gray-600">用户名:</span>
                    <span className="ml-2 font-medium">{user.username}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Mail size={18} className="text-gray-400 mr-3 w-5" />
                    <span className="text-gray-600">邮箱:</span>
                    <span className="ml-2 font-medium">{user.email}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Calendar size={18} className="text-gray-400 mr-3 w-5" />
                    <span className="text-gray-600">注册时间:</span>
                    <span className="ml-2 font-medium">
                      {new Date(user.created_at).toLocaleDateString("zh-CN")}
                    </span>
                  </div>
                </div>

                {/* Edit Profile Form */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      昵称
                    </label>
                    <Input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="输入你的昵称"
                      size="large"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Change Password */}
            {activeTab === "password" && (
              <div className="space-y-4">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">
                    修改密码
                  </h2>
                  <p className="text-sm text-gray-500">
                    定期更改密码有助于保护账户安全
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    当前密码
                  </label>
                  <Input.Password
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="输入当前密码"
                    size="large"
                    visibilityToggle={{
                      visible: showOldPassword,
                      onVisibleChange: setShowOldPassword,
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    新密码
                  </label>
                  <Input.Password
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="输入新密码（至少8位）"
                    size="large"
                    visibilityToggle={{
                      visible: showNewPassword,
                      onVisibleChange: setShowNewPassword,
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    确认新密码
                  </label>
                  <Input.Password
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="再次输入新密码"
                    size="large"
                    visibilityToggle={{
                      visible: showConfirmPassword,
                      onVisibleChange: setShowConfirmPassword,
                    }}
                  />
                </div>

                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-sm text-red-500">两次输入的密码不一致</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
