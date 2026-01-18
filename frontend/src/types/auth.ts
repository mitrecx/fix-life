/** User information from API */
export interface User {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

/** Request payload for login */
export interface LoginRequest {
  login_identifier: string; // email or username
  password: string;
}

/** Request payload for registration */
export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  full_name?: string;
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
