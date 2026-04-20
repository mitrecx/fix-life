export interface RoleBrief {
  id: string;
  name: string;
}

export interface AdminUserListItem {
  id: string;
  username: string;
  email: string;
  full_name?: string | null;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
  roles: RoleBrief[];
}

export interface AdminUserListResponse {
  items: AdminUserListItem[];
  total: number;
}

export interface RoleListItem {
  id: string;
  name: string;
  description?: string | null;
}

export interface AdminUserCreatePayload {
  username: string;
  email: string;
  password: string;
  full_name?: string;
  is_active: boolean;
  role_ids: string[];
}
