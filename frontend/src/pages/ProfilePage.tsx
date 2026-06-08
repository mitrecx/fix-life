import { useState, useRef, useEffect } from "react";
import {
  User as UserIcon,
  Camera,
  Mail,
  Calendar,
  Lock,
  Smartphone,
} from "lucide-react";
import { Input, message } from "antd";
import { useAuthStore } from "@/store/authStore";
import api from "@/services/api";
import { authService } from "@/services/authService";
import type { User } from "@/types/auth";

type ProfileTab = "info" | "password" | "wechat";

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
  const [bindCode, setBindCode] = useState("");
  const [bindExpiresAt, setBindExpiresAt] = useState<Date | null>(null);
  const [bindCountdown, setBindCountdown] = useState(0);
  const [isCreatingBindCode, setIsCreatingBindCode] = useState(false);

  useEffect(() => {
    if (!bindExpiresAt) {
      setBindCountdown(0);
      return;
    }
    const tick = () => {
      const seconds = Math.max(0, Math.floor((bindExpiresAt.getTime() - Date.now()) / 1000));
      setBindCountdown(seconds);
      if (seconds <= 0) {
        setBindCode("");
        setBindExpiresAt(null);
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [bindExpiresAt]);

  const handleCreateBindCode = async () => {
    setIsCreatingBindCode(true);
    try {
      const res = await authService.createWeChatBindCode();
      setBindCode(res.code);
      setBindExpiresAt(new Date(res.expires_at));
      message.success("绑定码已生成，请在 10 分钟内在小程序输入");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "生成绑定码失败");
    } finally {
      setIsCreatingBindCode(false);
    }
  };

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
    {
      key: "wechat" as ProfileTab,
      icon: Smartphone,
      label: "小程序绑定",
      description: "与微信小程序共用数据",
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

            {/* WeChat bind */}
            {activeTab === "wechat" && user && (
              <div className="space-y-4">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">微信小程序绑定</h2>
                  <p className="text-sm text-gray-500">
                    绑定后，小程序与 Web 将使用同一账号，待办、每日进度与计划数据完全同步。
                  </p>
                </div>

                {user.wechat_bound ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
                    当前账号已绑定微信。在小程序中使用微信登录即可看到相同数据。
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-sm text-indigo-900 space-y-2">
                      <p className="font-medium">绑定步骤</p>
                      <ol className="list-decimal list-inside space-y-1 text-indigo-800">
                        <li>点击下方按钮生成 6 位绑定码（10 分钟内有效）</li>
                        <li>打开微信小程序，进入「我的 → 绑定 Web 账号」</li>
                        <li>输入绑定码并确认</li>
                      </ol>
                    </div>
                    <button
                      onClick={() => void handleCreateBindCode()}
                      disabled={isCreatingBindCode || bindCountdown > 0}
                      className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all disabled:opacity-50"
                    >
                      {isCreatingBindCode
                        ? "生成中..."
                        : bindCountdown > 0
                          ? `绑定码有效 ${bindCountdown}s`
                          : "生成绑定码"}
                    </button>
                    {bindCode && bindCountdown > 0 && (
                      <div className="p-6 bg-gray-50 border border-gray-200 rounded-xl text-center">
                        <div className="text-xs text-gray-500 mb-2">请在小程序输入以下绑定码</div>
                        <div className="text-4xl font-bold tracking-[0.3em] text-indigo-600">{bindCode}</div>
                      </div>
                    )}
                  </div>
                )}
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
