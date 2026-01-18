import api from "./api";
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  User,
  SendVerificationCodeRequest,
  SendVerificationCodeResponse,
  VerifyCodeRequest,
  VerifyCodeResponse,
  ResetPasswordResponse
} from "@/types/auth";

export const authService = {
  /**
   * Login user with email/username and password
   */
  async login(identifier: string, password: string): Promise<AuthResponse> {
    return await api.post<AuthResponse>("/auth/login", {
      login_identifier: identifier,
      password,
    });
  },

  /**
   * Register a new user with email verification code
   */
  async register(
    email: string,
    username: string,
    password: string,
    verification_code: string,
    full_name?: string
  ): Promise<AuthResponse> {
    return await api.post<AuthResponse>("/auth/register", {
      email,
      username,
      password,
      verification_code,
      full_name,
    });
  },

  /**
   * Send verification code to email
   */
  async sendVerificationCode(email: string, purpose: "register" | "reset_password" = "register"): Promise<SendVerificationCodeResponse> {
    return await api.post<SendVerificationCodeResponse>("/auth/send-verification-code", {
      email,
      purpose,
    });
  },

  /**
   * Verify code for email
   */
  async verifyCode(email: string, code: string, purpose: "register" | "reset_password" = "register"): Promise<VerifyCodeResponse> {
    return await api.post<VerifyCodeResponse>("/auth/verify-code", {
      email,
      code,
      purpose,
    });
  },

  /**
   * Check if email already exists
   */
  async checkEmailExists(email: string): Promise<{ exists: boolean }> {
    return await api.get<{ exists: boolean }>(`/auth/check-email?email=${encodeURIComponent(email)}`);
  },

  /**
   * Reset password with email verification code
   */
  async resetPassword(email: string, code: string, new_password: string): Promise<ResetPasswordResponse> {
    return await api.post<ResetPasswordResponse>("/auth/reset-password", {
      email,
      code,
      new_password,
    });
  },

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<User> {
    return await api.get<User>("/auth/me");
  },
};
