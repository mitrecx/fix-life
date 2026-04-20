import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Search,
  Loader2,
  KeyRound,
  Shield,
  UserCog,
  UserPlus,
  Trash2,
} from "lucide-react";
import {
  Table,
  Input,
  Button,
  Tag,
  Modal,
  Select,
  Switch,
  message,
  Space,
  Typography,
  Popconfirm,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { adminUserService } from "@/services/adminUserService";
import type { AdminUserListItem, RoleListItem } from "@/types/adminUser";
import { useAuthStore } from "@/store/authStore";

const { Text } = Typography;

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const [roles, setRoles] = useState<RoleListItem[]>([]);
  const [items, setItems] = useState<AdminUserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [rolesModalUser, setRolesModalUser] = useState<AdminUserListItem | null>(
    null
  );
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [savingRoles, setSavingRoles] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [activeLoadingId, setActiveLoadingId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [newIsActive, setNewIsActive] = useState(true);
  const [newRoleIds, setNewRoleIds] = useState<string[]>([]);

  const loadRoles = useCallback(async () => {
    try {
      const r = await adminUserService.listRoles();
      setRoles(r);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "加载角色失败";
      message.error(msg);
      if (msg.includes("Insufficient permissions") || msg.includes("403")) {
        navigate("/", { replace: true });
      }
    }
  }, [navigate]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminUserService.listUsers(page, pageSize, search);
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "加载用户失败";
      message.error(msg);
      if (msg.includes("Insufficient permissions") || msg.includes("403")) {
        navigate("/", { replace: true });
      }
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, navigate]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const openRolesModal = (u: AdminUserListItem) => {
    setRolesModalUser(u);
    setSelectedRoleIds(u.roles.map((r) => r.id));
  };

  const saveRoles = async () => {
    if (!rolesModalUser) return;
    setSavingRoles(true);
    try {
      await adminUserService.patchUser(rolesModalUser.id, {
        role_ids: selectedRoleIds,
      });
      message.success("角色已更新");
      setRolesModalUser(null);
      loadUsers();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSavingRoles(false);
    }
  };

  const toggleActive = async (u: AdminUserListItem, next: boolean) => {
    if (!next && u.id === currentUser?.id) {
      message.warning("不能停用自己的账号");
      return;
    }
    Modal.confirm({
      title: next ? "启用账号" : "停用账号",
      content: next
        ? `确定启用「${u.username}」吗？`
        : `确定停用「${u.username}」吗？该用户将无法登录。`,
      okText: "确定",
      cancelText: "取消",
      onOk: async () => {
        setActiveLoadingId(u.id);
        try {
          await adminUserService.patchUser(u.id, { is_active: next });
          message.success(next ? "已启用" : "已停用");
          loadUsers();
        } catch (e) {
          message.error(e instanceof Error ? e.message : "操作失败");
        } finally {
          setActiveLoadingId(null);
        }
      },
    });
  };

  const resetCreateForm = () => {
    setNewUsername("");
    setNewEmail("");
    setNewFullName("");
    setNewPassword("");
    setNewPassword2("");
    setNewIsActive(true);
    setNewRoleIds([]);
  };

  const submitCreateUser = async () => {
    if (!newUsername.trim() || !newEmail.trim() || !newPassword) {
      message.warning("请填写用户名、邮箱和初始密码");
      return;
    }
    if (newPassword.length < 8) {
      message.warning("密码至少 8 位");
      return;
    }
    if (newPassword !== newPassword2) {
      message.warning("两次输入的密码不一致");
      return;
    }
    setCreateSubmitting(true);
    try {
      await adminUserService.createUser({
        username: newUsername.trim(),
        email: newEmail.trim(),
        password: newPassword,
        full_name: newFullName.trim() || undefined,
        is_active: newIsActive,
        role_ids: newRoleIds,
      });
      message.success("用户已创建");
      setCreateOpen(false);
      resetCreateForm();
      loadUsers();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "创建失败");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const deleteUser = async (u: AdminUserListItem) => {
    if (u.id === currentUser?.id) {
      message.warning("不能删除自己的账号");
      return;
    }
    try {
      await adminUserService.deleteUser(u.id);
      message.success("已删除用户");
      loadUsers();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "删除失败");
    }
  };

  const issueTempPassword = (u: AdminUserListItem) => {
    if (u.id === currentUser?.id) {
      message.warning("不能为自己生成临时密码");
      return;
    }
    Modal.confirm({
      title: "生成临时密码",
      content:
        "将重置该用户密码为随机临时值，用户下次登录时必须修改密码。确定继续？",
      okText: "生成",
      cancelText: "取消",
      onOk: async () => {
        try {
          const { temp_password } = await adminUserService.resetTempPassword(
            u.id
          );
          setTempPassword(temp_password);
          loadUsers();
        } catch (e) {
          message.error(e instanceof Error ? e.message : "操作失败");
        }
      },
    });
  };

  const columns: ColumnsType<AdminUserListItem> = [
    {
      title: "用户名",
      dataIndex: "username",
      key: "username",
      render: (text, record) => (
        <div>
          <div className="font-medium text-gray-900">{text}</div>
          <Text type="secondary" className="text-xs">
            {record.email}
          </Text>
        </div>
      ),
    },
    {
      title: "状态",
      key: "flags",
      width: 200,
      render: (_, u) => (
        <Space size={[0, 4]} wrap>
          <Tag color={u.is_active ? "green" : "default"}>
            {u.is_active ? "正常" : "已停用"}
          </Tag>
          {u.must_change_password ? (
            <Tag color="orange">须改密</Tag>
          ) : null}
        </Space>
      ),
    },
    {
      title: "角色",
      key: "roles",
      render: (_, u) => (
        <span className="text-sm text-gray-700">
          {u.roles.map((r) => r.name).join(", ") || "—"}
        </span>
      ),
    },
    {
      title: "注册时间",
      dataIndex: "created_at",
      key: "created_at",
      width: 120,
      render: (v: string) =>
        new Date(v).toLocaleDateString("zh-CN", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }),
    },
    {
      title: "操作",
      key: "actions",
      width: 360,
      render: (_, u) => (
        <Space wrap>
          <Button
            type="link"
            size="small"
            icon={<UserCog size={14} />}
            onClick={() => openRolesModal(u)}
          >
            角色
          </Button>
          <Switch
            size="small"
            checked={u.is_active}
            loading={activeLoadingId === u.id}
            disabled={!u.is_active && u.id === currentUser?.id}
            onChange={(checked) => toggleActive(u, checked)}
          />
          <Button
            type="link"
            size="small"
            icon={<KeyRound size={14} />}
            disabled={u.id === currentUser?.id}
            onClick={() => issueTempPassword(u)}
          >
            临时密码
          </Button>
          <Popconfirm
            title="删除用户"
            description={`确定删除「${u.username}」？其计划与设置等关联数据将一并删除，且不可恢复。`}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            disabled={u.id === currentUser?.id}
            onConfirm={() => deleteUser(u)}
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<Trash2 size={14} />}
              disabled={u.id === currentUser?.id}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
            <Users className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">用户管理</h1>
            <p className="text-sm text-gray-500">
              新增用户、搜索、分配角色、启停账号、临时密码与删除
            </p>
          </div>
        </div>
        <Space wrap className="w-full sm:w-auto justify-end">
          <Button
            type="primary"
            icon={<UserPlus size={16} />}
            onClick={() => {
              resetCreateForm();
              setCreateOpen(true);
            }}
          >
            新增用户
          </Button>
          <Space.Compact className="w-full sm:w-auto sm:max-w-md">
          <Input
            placeholder="搜索用户名或邮箱"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onPressEnter={() => {
              setPage(1);
              setSearch(searchInput.trim());
            }}
            prefix={<Search size={16} className="text-gray-400" />}
            allowClear
          />
          <Button
            type="primary"
            onClick={() => {
              setPage(1);
              setSearch(searchInput.trim());
            }}
          >
            搜索
          </Button>
        </Space.Compact>
        </Space>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading && items.length === 0 ? (
          <div className="flex justify-center py-24 text-gray-500">
            <Loader2 className="animate-spin" size={28} />
          </div>
        ) : (
          <Table
            rowKey="id"
            columns={columns}
            dataSource={items}
            loading={loading}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              showTotal: (t) => `共 ${t} 人`,
              onChange: (p, ps) => {
                setPage(p);
                setPageSize(ps || 20);
              },
            }}
          />
        )}
      </div>

      <Modal
        title={
          <span className="flex items-center gap-2">
            <Shield size={18} />
            编辑角色
            {rolesModalUser ? ` — ${rolesModalUser.username}` : ""}
          </span>
        }
        open={!!rolesModalUser}
        onCancel={() => setRolesModalUser(null)}
        onOk={saveRoles}
        confirmLoading={savingRoles}
        okText="保存"
        destroyOnClose
      >
        <p className="text-sm text-gray-500 mb-3">
          保存后将替换该用户的全部角色。
        </p>
        <Select
          mode="multiple"
          allowClear
          placeholder="选择角色"
          className="w-full"
          options={roles.map((r) => ({
            value: r.id,
            label: r.description ? `${r.name}（${r.description}）` : r.name,
          }))}
          value={selectedRoleIds}
          onChange={(v) => setSelectedRoleIds(v)}
        />
      </Modal>

      <Modal
        title="临时密码（仅显示一次）"
        open={!!tempPassword}
        onCancel={() => setTempPassword(null)}
        footer={[
          <Button
            key="copy"
            type="primary"
            onClick={async () => {
              if (!tempPassword) return;
              try {
                await navigator.clipboard.writeText(tempPassword);
                message.success("已复制到剪贴板");
              } catch {
                message.warning("复制失败，请手动复制");
              }
            }}
          >
            复制
          </Button>,
          <Button key="close" onClick={() => setTempPassword(null)}>
            关闭
          </Button>,
        ]}
      >
        <p className="text-sm text-gray-600 mb-2">
          请将以下密码安全地交给用户，页面关闭后无法再次查看。
        </p>
        <Text copyable className="text-base font-mono block p-3 bg-gray-50 rounded-lg">
          {tempPassword}
        </Text>
      </Modal>

      <Modal
        title={
          <span className="flex items-center gap-2">
            <UserPlus size={18} />
            新增用户
          </span>
        }
        open={createOpen}
        onCancel={() => {
          setCreateOpen(false);
          resetCreateForm();
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setCreateOpen(false);
              resetCreateForm();
            }}
          >
            取消
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={createSubmitting}
            onClick={submitCreateUser}
          >
            创建
          </Button>,
        ]}
        width={520}
        destroyOnClose
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              用户名
            </label>
            <Input
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="字母、数字、下划线、连字符"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              邮箱
            </label>
            <Input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="user@example.com"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              昵称（可选）
            </label>
            <Input
              value={newFullName}
              onChange={(e) => setNewFullName(e.target.value)}
              placeholder="显示名称"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              初始密码
            </label>
            <Input.Password
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="至少 8 位"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              确认密码
            </label>
            <Input.Password
              value={newPassword2}
              onChange={(e) => setNewPassword2(e.target.value)}
              placeholder="再次输入"
              autoComplete="new-password"
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-gray-700">账号启用</span>
            <Switch checked={newIsActive} onChange={setNewIsActive} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              角色
            </label>
            <Select
              mode="multiple"
              allowClear
              placeholder="可选，创建后也可再编辑"
              className="w-full"
              options={roles.map((r) => ({
                value: r.id,
                label: r.description ? `${r.name}（${r.description}）` : r.name,
              }))}
              value={newRoleIds}
              onChange={(v) => setNewRoleIds(v)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
