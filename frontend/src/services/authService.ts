import api from "./api";
import type { LoginRequest, RegisterRequest, AuthResponse, User } from "@/types/auth";

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
   * Register a new user
   */
  async register(email: string, username: string, password: string, full_name?: string): Promise<AuthResponse> {
    return await api.post<AuthResponse>("/auth/register", {
      email,
      username,
      password,
      full_name,
    });
  },

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<User> {
    return await api.get<User>("/auth/me");
  },
};
