import axios from "axios";

const TOKEN_KEY = "auth_token";

const rawApi = axios.create({
  // Use relative path for production (same domain), localhost for development
  baseURL: import.meta.env.VITE_API_URL || "/api/v1",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - Add JWT token from localStorage
rawApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle 401 errors and unwrap response.data
rawApi.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // Handle 401 Unauthorized - clear tokens and redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem("auth_user");
      // Only redirect if not already on login page
      if (window.location.pathname !== "/login" && window.location.pathname !== "/register") {
        window.location.href = "/login";
      }
    }

    const message = error.response?.data?.detail || error.message || "请求失败";
    console.error("API Error:", message);
    return Promise.reject(new Error(message));
  }
);

// Export typed API methods
const api = {
  get: <T>(url: string, config?: any) => rawApi.get<any, T>(url, config),
  post: <T>(url: string, data?: any, config?: any) => rawApi.post<any, T>(url, data, config),
  put: <T>(url: string, data?: any, config?: any) => rawApi.put<any, T>(url, data, config),
  patch: <T>(url: string, data?: any, config?: any) => rawApi.patch<any, T>(url, data, config),
  delete: <T>(url: string, config?: any) => rawApi.delete<any, T>(url, config),
  request: <T>(config: any) => rawApi.request<any, T>(config),
  // Also expose raw methods for compatibility
  interceptors: rawApi.interceptors,
};

export default api;
