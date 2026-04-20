import api from "./api";
import type {
  AdminUserCreatePayload,
  AdminUserListItem,
  AdminUserListResponse,
  RoleListItem,
} from "@/types/adminUser";

export const adminUserService = {
  async listRoles(): Promise<RoleListItem[]> {
    return api.get<RoleListItem[]>("/admin/roles");
  },

  async createUser(body: AdminUserCreatePayload): Promise<AdminUserListItem> {
    return api.post<AdminUserListItem>("/admin/users", body);
  },

  async deleteUser(userId: string): Promise<void> {
    await api.delete(`/admin/users/${userId}`);
  },

  async listUsers(
    page: number,
    pageSize: number,
    q?: string
  ): Promise<AdminUserListResponse> {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    });
    if (q?.trim()) params.set("q", q.trim());
    return api.get<AdminUserListResponse>(`/admin/users?${params}`);
  },

  async patchUser(
    userId: string,
    body: { is_active?: boolean; role_ids?: string[] }
  ): Promise<AdminUserListItem> {
    return api.patch<AdminUserListItem>(`/admin/users/${userId}`, body);
  },

  async resetTempPassword(
    userId: string
  ): Promise<{ temp_password: string }> {
    return api.post<{ temp_password: string }>(
      `/admin/users/${userId}/reset-temp-password`,
      {}
    );
  },
};
