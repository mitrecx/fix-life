import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, ArrowRight } from "lucide-react";
import { message, Input, Button } from "antd";
import { useAuthStore } from "@/store/authStore";
import api from "@/services/api";
import { authService } from "@/services/authService";

export default function ForceChangePasswordPage() {
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && !user.must_change_password) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      message.warning("新密码至少 8 位");
      return;
    }
    if (newPassword !== confirmPassword) {
      message.warning("两次输入的密码不一致");
      return;
    }

    setLoading(true);
    try {
      await api.post("/users/me/change-password", { new_password: newPassword });
      const fresh = await authService.getCurrentUser();
      setUser(fresh);
      message.success("密码已更新，欢迎使用");
      navigate("/", { replace: true });
    } catch (err) {
      message.error(err instanceof Error ? err.message : "修改失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-500 text-white mb-4">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">需要更新密码</h1>
          <p className="text-gray-600 text-sm mt-2">
            管理员已为你生成临时登录密码。请设置新密码后继续。
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                新密码
              </label>
              <Input.Password
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="至少 8 位"
                size="large"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                确认新密码
              </label>
              <Input.Password
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次输入"
                size="large"
                autoComplete="new-password"
              />
            </div>

            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
              className="h-12 font-semibold"
              icon={<ArrowRight size={18} />}
            >
              确认并继续
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
