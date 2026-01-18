/** User information from API */
export interface User {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

/** Request payload for login */
export interface LoginRequest {
  login_identifier: string; // email or username
  password: string;
}

/** Request payload for registration with verification code */
export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  full_name?: string;
  verification_code: string;
}

/** Request payload for sending verification code */
export interface SendVerificationCodeRequest {
  email: string;
  purpose?: "register" | "reset_password";
}

/** Response from send verification code API */
export interface SendVerificationCodeResponse {
  message: string;
  code?: string; // For development only
}

/** Request payload for verifying code */
export interface VerifyCodeRequest {
  email: string;
  code: string;
  purpose?: "register" | "reset_password";
}

/** Response from verify code API */
export interface VerifyCodeResponse {
  valid: boolean;
  message: string;
}

/** Request payload for reset password */
export interface ResetPasswordRequest {
  email: string;
  code: string;
  new_password: string;
}

/** Response from reset password API */
export interface ResetPasswordResponse {
  message: string;
}

/** Request payload for updating user profile */
export interface UserProfileUpdate {
  full_name?: string;
  avatar_url?: string;
  bio?: string;
}

/** Request payload for changing password */
export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

/** Response from login or register API */
export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

/** Auth state in store */
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}
