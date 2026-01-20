import { useState, useRef, useEffect } from "react";
import { X, User as UserIcon, Mail, Calendar, Camera, Lock, Save, Eye, EyeOff } from "lucide-react";
import type { User } from "@/types/auth";
import api from "@/services/api";

interface ProfileModalProps {
  user: User;
  onClose: () => void;
  onUpdate: (user: User) => void;
}

export function ProfileModal({ user, onClose, onUpdate }: ProfileModalProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "password">("profile");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Profile form state
  const [fullName, setFullName] = useState(user.full_name || "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url || "");

  // Password form state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Avatar upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleUpdateProfile = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await api.put<User>("/users/me", {
        full_name: fullName || undefined,
        avatar_url: avatarUrl || undefined,
      });

      onUpdate(response);
      showMessage("success", "个人信息更新成功");
      onClose();
    } catch (error) {
      showMessage("error", error instanceof Error ? error.message : "更新失败");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      showMessage("error", "两次输入的密码不一致");
      return;
    }

    if (newPassword.length < 8) {
      showMessage("error", "新密码至少需要8个字符");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await api.post("/users/me/change-password", {
        old_password: oldPassword,
        new_password: newPassword,
      });

      showMessage("success", "密码修改成功");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onClose();
    } catch (error) {
      showMessage("error", error instanceof Error ? error.message : "密码修改失败");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      showMessage("error", "请上传 JPG, PNG, GIF 或 WEBP 格式的图片");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      showMessage("error", "文件大小不能超过 5MB");
      return;
    }

    setUploadingAvatar(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await api.post<{ avatar_url: string; message: string }>("/users/me/upload-avatar", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setAvatarUrl(response.avatar_url);
      onUpdate({ ...user, avatar_url: response.avatar_url });
      showMessage("success", "头像上传成功");
    } catch (error) {
      showMessage("error", error instanceof Error ? error.message : "头像上传失败");
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">个人中心</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex-1 py-3 px-4 font-medium transition-colors ${
              activeTab === "profile"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <UserIcon size={18} className="inline mr-2" />
            个人信息
          </button>
          <button
            onClick={() => setActiveTab("password")}
            className={`flex-1 py-3 px-4 font-medium transition-colors ${
              activeTab === "password"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Lock size={18} className="inline mr-2" />
            修改密码
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div className="space-y-6">
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
                    disabled={uploadingAvatar}
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
                <p className="text-sm text-gray-500 mt-2">点击相机换头像(要求小于2MB)</p>
              </div>

              {/* User Info Display */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    昵称
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="输入你的昵称"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Password Tab */}
          {activeTab === "password" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  当前密码
                </label>
                <div className="relative">
                  <input
                    type={showOldPassword ? "text" : "password"}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="输入当前密码"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showOldPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  新密码
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="输入新密码 (至少8位)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  确认新密码
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="再次输入新密码"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-sm text-red-500">两次输入的密码不一致</p>
              )}
            </div>
          )}

          {/* Message */}
          {message && (
            <div
              className={`p-3 rounded-md text-sm ${
                message.type === "success"
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {message.text}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          {activeTab === "profile" && (
            <button
              onClick={handleUpdateProfile}
              disabled={loading}
              className="px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center"
            >
              <Save size={18} className="mr-2" />
              {loading ? "保存中..." : "保存"}
            </button>
          )}
          {activeTab === "password" && (
            <button
              onClick={handleChangePassword}
              disabled={loading || !oldPassword || !newPassword || !confirmPassword}
              className="px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center"
            >
              <Lock size={18} className="mr-2" />
              {loading ? "修改中..." : "修改密码"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
