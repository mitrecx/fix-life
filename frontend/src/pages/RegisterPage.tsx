import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, User, ArrowRight, Check, X } from "lucide-react";
import { message } from "antd";
import { useAuthStore } from "@/store/authStore";
import { authService } from "@/services/authService";

interface FormData {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
}

export default function RegisterPage() {
  const [formData, setFormData] = useState<FormData>({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  const { setAuth, setLoading, setError } = useAuthStore();
  const navigate = useNavigate();

  // Validation
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
  const usernameValid = formData.username.length >= 3 && formData.username.length <= 20 && /^[a-zA-Z0-9_-]+$/.test(formData.username);
  const passwordValid = formData.password.length >= 8;
  const passwordsMatch = formData.password === formData.confirmPassword && formData.password !== "";
  const formValid = emailValid && usernameValid && passwordValid && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formValid) {
      message.warning("请检查输入信息");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await authService.register(formData.email, formData.username, formData.password);
      setAuth(response.user, response.access_token);
      message.success("注册成功");
      navigate("/", { replace: true });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "注册失败";
      setError(errorMsg);
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Fix Life
          </h1>
          <p className="text-gray-600">开启你的自我提升之旅</p>
        </div>

        {/* Register Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="px-8 py-6 bg-gradient-to-r from-purple-500 to-pink-500">
            <h2 className="text-2xl font-semibold text-white">创建账户</h2>
            <p className="text-purple-100 text-sm mt-1">加入我们，开始规划你的人生</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                邮箱
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className={`w-full pl-11 pr-10 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                    formData.email && (emailValid ? "border-emerald-300" : "border-red-300")
                  }`}
                  placeholder="your@email.com"
                  autoComplete="email"
                  required
                />
                {formData.email && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {emailValid ? (
                      <Check className="text-emerald-500" size={20} />
                    ) : (
                      <X className="text-red-500" size={20} />
                    )}
                  </div>
                )}
              </div>
              {formData.email && !emailValid && (
                <p className="text-red-500 text-xs mt-1">请输入有效的邮箱地址</p>
              )}
            </div>

            {/* Username Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                用户名
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => updateField("username", e.target.value)}
                  className={`w-full pl-11 pr-10 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                    formData.username && (usernameValid ? "border-emerald-300" : "border-red-300")
                  }`}
                  placeholder="3-20个字符，字母数字下划线"
                  autoComplete="username"
                  required
                />
                {formData.username && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {usernameValid ? (
                      <Check className="text-emerald-500" size={20} />
                    ) : (
                      <X className="text-red-500" size={20} />
                    )}
                  </div>
                )}
              </div>
              {formData.username && !usernameValid && (
                <p className="text-red-500 text-xs mt-1">用户名需3-20个字符，仅支持字母、数字、下划线</p>
              )}
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
                  value={formData.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  className="w-full pl-11 pr-12 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="至少8个字符"
                  autoComplete="new-password"
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
              {formData.password && !passwordValid && (
                <p className="text-red-500 text-xs mt-1">密码至少需要8个字符</p>
              )}
            </div>

            {/* Confirm Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                确认密码
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => updateField("confirmPassword", e.target.value)}
                  className={`w-full pl-11 pr-10 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                    formData.confirmPassword && (passwordsMatch ? "border-emerald-300" : "border-red-300")
                  }`}
                  placeholder="再次输入密码"
                  autoComplete="new-password"
                  required
                />
                {formData.confirmPassword && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {passwordsMatch ? (
                      <Check className="text-emerald-500" size={20} />
                    ) : (
                      <X className="text-red-500" size={20} />
                    )}
                  </div>
                )}
              </div>
              {formData.confirmPassword && !passwordsMatch && (
                <p className="text-red-500 text-xs mt-1">密码不匹配</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={useAuthStore.getState().loading || !formValid}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {useAuthStore.getState().loading ? "注册中..." : (
                <>
                  创建账户
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="px-8 pb-6 text-center">
            <span className="text-gray-600 text-sm">已有账户？</span>
            <Link to="/login" className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold ml-1">
              立即登录
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
