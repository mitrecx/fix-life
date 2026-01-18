import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, ArrowLeft, ArrowRight, Eye, EyeOff, Shield } from "lucide-react";
import { message } from "antd";
import { authService } from "@/services/authService";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [step, setStep] = useState<1 | 2>(1); // Step 1: Email, Step 2: Code & Password
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // Validation
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const codeValid = verificationCode.length === 6 && /^\d{6}$/.test(verificationCode);
  const passwordValid = newPassword.length >= 8;
  const passwordsMatch = newPassword === confirmPassword && newPassword !== "";
  const formValid = emailValid && codeValid && passwordValid && passwordsMatch;

  const handleSendCode = async () => {
    if (!emailValid) {
      message.warning("请输入有效的邮箱地址");
      return;
    }

    setSendingCode(true);
    try {
      const response = await authService.sendVerificationCode(email, "reset_password");
      message.success(response.message);
      if (response.code) {
        console.log("验证码:", response.code);
      }
      // Start countdown
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      // Move to step 2
      setStep(2);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "发送验证码失败";
      message.error(errorMsg);
    } finally {
      setSendingCode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formValid) {
      message.warning("请检查输入信息");
      return;
    }

    setLoading(true);

    try {
      await authService.resetPassword(email, verificationCode, newPassword);
      message.success("密码重置成功，请使用新密码登录");
      navigate("/login", { replace: true });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "重置密码失败";
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToStep1 = () => {
    setStep(1);
    setVerificationCode("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Fix Life
          </h1>
          <p className="text-gray-600">重置你的密码</p>
        </div>

        {/* Forgot Password Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="px-8 py-6 bg-gradient-to-r from-indigo-500 to-purple-500">
            <h2 className="text-2xl font-semibold text-white">忘记密码</h2>
            <p className="text-indigo-100 text-sm mt-1">
              {step === 1 ? "输入邮箱获取验证码" : "输入验证码和新密码"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            {/* Step 1: Email Input */}
            {step === 1 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  邮箱
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full pl-11 pr-28 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                      email && (emailValid ? "border-emerald-300" : "border-red-300")
                    }`}
                    placeholder="your@email.com"
                    autoComplete="email"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={!emailValid || sendingCode || countdown > 0}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${!emailValid || sendingCode || countdown > 0 ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-indigo-500 text-white hover:bg-indigo-600"}`}
                  >
                    {sendingCode ? "发送中..." : countdown > 0 ? `${countdown}秒` : "发送验证码"}
                  </button>
                </div>
                {email && !emailValid && (
                  <p className="text-red-500 text-xs mt-1">请输入有效的邮箱地址</p>
                )}
              </div>
            )}

            {/* Step 2: Code & Password */}
            {step === 2 && (
              <>
                {/* Email Display (readonly) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    邮箱
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="email"
                      value={email}
                      readOnly
                      className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-600 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Verification Code Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    验证码
                  </label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className={`w-full pl-11 pr-10 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                        verificationCode && (codeValid ? "border-emerald-300" : "border-red-300")
                      }`}
                      placeholder="6位数字验证码"
                      maxLength={6}
                      required
                    />
                  </div>
                  {verificationCode && !codeValid && (
                    <p className="text-red-500 text-xs mt-1">请输入6位数字验证码</p>
                  )}
                </div>

                {/* New Password Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    新密码
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-11 pr-12 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="至少8个字符"
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {newPassword && !passwordValid && (
                    <p className="text-red-500 text-xs mt-1">密码至少需要8个字符</p>
                  )}
                </div>

                {/* Confirm Password Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    确认新密码
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full pl-11 pr-10 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                        confirmPassword && (passwordsMatch ? "border-emerald-300" : "border-red-300")
                      }`}
                      placeholder="再次输入新密码"
                      autoComplete="new-password"
                      required
                    />
                  </div>
                  {confirmPassword && !passwordsMatch && (
                    <p className="text-red-500 text-xs mt-1">密码不匹配</p>
                  )}
                </div>
              </>
            )}

            {/* Back Button (Step 2 only) */}
            {step === 2 && (
              <button
                type="button"
                onClick={handleBackToStep1}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
              >
                <ArrowLeft size={16} />
                返回修改邮箱
              </button>
            )}

            {/* Submit Button */}
            <button
              type={step === 1 ? "button" : "submit"}
              onClick={step === 1 ? handleSendCode : undefined}
              disabled={loading || (step === 1 ? !emailValid : !formValid)}
              className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? "处理中..." : step === 1 ? (
                <>
                  下一步
                  <ArrowRight size={20} />
                </>
              ) : (
                "重置密码"
              )}
            </button>
          </form>

          {/* Back to Login Link */}
          <div className="px-8 pb-6 text-center">
            <Link to="/login" className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold flex items-center justify-center gap-1">
              <ArrowLeft size={16} />
              返回登录
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
