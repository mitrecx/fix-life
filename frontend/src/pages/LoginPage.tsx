import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { message } from "antd";
import { useAuthStore } from "@/store/authStore";
import { authService } from "@/services/authService";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { setAuth, setLoading, setError } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!identifier.trim() || !password.trim()) {
      message.warning("请填写所有字段");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await authService.login(identifier, password);
      setAuth(response.user, response.access_token);
      message.success("登录成功");
      navigate(from, { replace: true });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "登录失败";
      setError(errorMsg);
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Fix Life
          </h1>
          <p className="text-gray-600">管理你的目标，规划你的人生</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="px-8 py-6 bg-gradient-to-r from-indigo-500 to-purple-500">
            <h2 className="text-2xl font-semibold text-white">欢迎回来</h2>
            <p className="text-indigo-100 text-sm mt-1">登录到你的账户</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            {/* Email/Username Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                邮箱或用户名
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="请输入邮箱或用户名"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                密码
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="请输入密码"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors text-sm"
                >
                  {showPassword ? "隐藏" : "显示"}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={useAuthStore.getState().loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {useAuthStore.getState().loading ? "登录中..." : (
                <>
                  登录
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          {/* Register Link */}
          <div className="px-8 pb-6 text-center">
            <span className="text-gray-600 text-sm">还没有账户？</span>
            <Link to="/register" className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold ml-1">
              立即注册
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
