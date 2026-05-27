# Fix Life MCP Server — 设计说明

**日期：** 2026-05-24  
**状态：** 已定稿（M3 已实现；每日进度 Tool 见 [命名迁移 spec](./2026-05-24-daily-progress-naming-migration-design.md)）  
**分支：** `docs/mcp-server-spec`

## 1. 背景与动机

Fix Life 是一套个人生活规划应用，核心能力包括：

- **待办（Backlog）**：唯一任务来源，支持看板、进度、安排到某天
- **每日进度（Daily Plan）**：按自然日查看/推进待办出现记录
- **长期规划**：年目标、月计划
- **反思总结**：日总结、周总结（含邮件/飞书推送）

当前这些能力通过 **REST API**（`/api/v1/*`）和 Web 前端暴露。随着 AI Agent 工作流普及，需要让外部 Agent（Cursor、Claude Desktop、自建编排）能以 **MCP（Model Context Protocol）** 方式调用 Fix Life，实现例如：

> 「帮我看看今天有哪些待办，把「写 MCP 设计文档」安排到今天并标记 30% 进度，晚上生成日总结。」

本设计讨论：**Fix Life 后端本身作为 MCP Server 对外提供服务**（Streamable HTTP），并将业务能力抽象为 **若干 MCP Tools**——粒度既不过细，也不过粗。

---

## 2. 目标与非目标

### 2.1 目标

- **G1 可发现性**：Agent 能从 tool 名称与 description 推断用途，无需记忆 REST 路径。
- **G2 意图对齐**：每个 Tool 对应一个 **用户/Agent 工作流意图**，而非 HTTP 动词。
- **G3 复用 Service 层**：MCP Tool 直接调用现有 `*Service`，不复制业务逻辑，也不 HTTP 自调用。
- **G4 安全边界清晰**：MCP 凭证（API Key）与 Web JWT 分离；管理类 Tool 受 RBAC 约束。
- **G5 远程就绪**：通过 **Streamable HTTP** 暴露，生产环境 `https://fixlife.mitrecx.top/mcp` 即可接入。

### 2.2 非目标

- **不**单独部署 `fixlife-mcp` sidecar 或 stdio 代理进程。
- 不替代 Web UI；MCP 是 **并行接入层**。
- 不在 MCP Tool 中暴露 **API Key 的创建/撤销**（仅 Web 系统设置管理，避免凭证套娃）。
- 不在 v1 暴露 **Celery 任务管理**（周总结自动生成仍由服务端定时触发）。
- `/analytics/*` 不纳入 MCP（见 §7）。

---

## 3. 总体架构

```mermaid
flowchart LR
  subgraph clients [MCP Clients]
    C1[Cursor]
    C2[Claude Desktop]
    C3[自建 Agent]
  end

  subgraph fixlife [Fix Life Backend — 同一 FastAPI 进程]
    MCP["/mcp<br/>Streamable HTTP"]
    REST["/api/v1/*<br/>REST"]
    T1[todo]
    T2[daily]
    T3[reflect]
    T4[plan]
    T5[account]
    T6[admin]
    SVC[Services]
    MCP --> T1 & T2 & T3 & T4 & T5 & T6
    T1 & T2 & T3 & T4 & T5 & T6 --> SVC
    REST --> SVC
  end

  clients -->|"POST/GET + Bearer API Key"| MCP
  clients -.->|"浏览器 JWT"| REST
```

### 3.1 传输：Streamable HTTP

Fix Life **内嵌 MCP Server**，遵循 MCP [Streamable HTTP](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports) 传输规范：

| 项 | 约定 |
|----|------|
| **Endpoint** | `POST` + `GET` 同一 URL：`/mcp`（Nginx 反代至 FastAPI） |
| **协议** | JSON-RPC 2.0 over HTTP |
| **Accept** | Client 发送 `Accept: application/json, text/event-stream` |
| **响应** | 支持 `application/json`（单次）或 `text/event-stream`（流式多消息） |
| **协议版本** | 请求头 `MCP-Protocol-Version`（实现时对齐 SDK 支持的版本，建议 `2025-06-18` 或 `2025-11-25`） |
| **Session** | 按所选 MCP 版本实现 Session 管理（`Mcp-Session-Id` 等）；与现有无状态 REST 并存 |

**与 REST 的关系：**

- **REST**（`/api/v1/*`）：Web SPA、移动端；认证为 **JWT**（login/register）。
- **MCP**（`/mcp`）：Agent；认证为 **API Key**（系统设置生成）。
- 两者共享 Service 层与数据库，**不**经 HTTP 互相调用。

### 3.2 认证：API Key（系统设置）

MCP Client **不使用** login/register 或 JWT。用户在 Web **系统设置** 中生成 **MCP API Key**，配置到 Cursor 等客户端。

**请求头：**

```http
Authorization: Bearer fl_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

（前缀 `fl_live_` 仅作示例，实现时固定以便日志脱敏识别。）

| 环节 | 行为 |
|------|------|
| **生成** | 登录 Web → 系统设置 → 「MCP 集成」→ 创建 API Key（可命名，如 `cursor-macbook`） |
| **展示** | **明文仅显示一次**；之后列表只显示前缀 + 末 4 位 |
| **存储** | DB 存 **SHA-256 哈希** + `key_prefix`；不存明文 |
| **校验** | MCP 每个请求解析 Bearer → 查表 → 绑定 `user_id` → 加载 RBAC `permissions` |
| **撤销** | 系统设置中删除 Key；立即失效 |
| **审计** | 可选记录 `last_used_at` |

**API Key 与 JWT 权限一致：** Key 绑定用户；`admin` Tool 是否注册取决于该用户的 `permissions`（见 §6.6）。

**不在 MCP 暴露的能力：** `account` Tool **不包含** `create_api_key` / `revoke_api_key`——凭证管理仅 Web + JWT，防止 Agent 在已泄露会话中再签发 Key。

### 3.3 数据模型：MCP API Key

新增表 `mcp_api_keys`（或 `user_api_keys`）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID PK | |
| `user_id` | UUID FK → users | 所属用户 |
| `name` | string | 用户备注，如「Cursor 办公室」 |
| `key_prefix` | string | 明文前缀，如 `fl_live_abcd` |
| `key_hash` | string | 完整 Key 的哈希 |
| `created_at` | timestamptz | |
| `last_used_at` | timestamptz nullable | 可选 |
| `revoked_at` | timestamptz nullable | 软删除/撤销 |

**REST 管理端点**（JWT 认证，挂在系统设置域）：

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/v1/system-settings/mcp-keys` | 列出 Key（掩码） |
| `POST` | `/api/v1/system-settings/mcp-keys` | 创建；响应含 **一次性** `api_key` 明文 |
| `DELETE` | `/api/v1/system-settings/mcp-keys/{id}` | 撤销 |

前端：在现有系统设置页增加 **「MCP / API Key」** 区块（创建、复制、撤销、Cursor 配置 snippet）。

---

## 4. Tool 抽象原则

### 4.1 粒度判据

| 过细 ❌ | 合适 ✅ | 过粗 ❌ |
|---------|---------|---------|
| `list_todos` / `create_todo` / `complete_todo` 各一个 tool | `todo` 一个 tool，`action` 区分操作 | 单个 `fixlife` tool 含 50+ action |
| `get_yearly_goal` / `patch_yearly_progress` 分开 | `plan` 合并年目标 + 月计划 | 把所有 CRUD 合成 `manage_data` |
| daily plan 与 daily task 各一套 tool | `daily` 覆盖「某日进度」完整工作流 | `tasks` 合并待办+日进度+月任务+数据修复 |

### 4.2 每个 Tool 的内部结构

统一采用 **「action + 业务参数」** 模式：

```json
{
  "action": "schedule",
  "task_id": "uuid",
  "plan_date": "2026-05-24"
}
```

- **action**：枚举，对应该 tool 支持的操作子集
- 返回：**结构化 JSON**（与现有 Pydantic schema 对齐），错误时含 `code` / `message` / `details`

### 4.3 与 Service 层的映射

MCP Tool 是 **意图层**；实现上 **直接调用** 现有 Service（如 `BacklogTaskService`），与 REST endpoint 调用同一套方法：

```
MCP tools/call → mcp/tools/todo.py → BacklogTaskService → DB
REST POST      → endpoints/backlog_tasks.py → BacklogTaskService → DB
```

复杂意图（如「创建待办并安排到今天」）可在 MCP 层 **编排 2 次 Service 调用**，对 Agent 仍呈现为 1 次 tool 结果。

---

## 5. MCP Server 与 Tool 清单

**Server 名称：** `fixlife`  
**Tool 数量：** **6**（5 个用户向 + 1 个管理向）

```
fixlife (MCP Server @ /mcp)
├── todo        待办 inbox / 看板 / 生命周期
├── daily       每日进度（按日执行）
├── reflect     日总结 + 周总结
├── plan        年目标 + 月计划
├── account     个人资料与通知设置
└── admin       RBAC 管理与系统状态（需权限）
```

---

## 6. Tool 详细设计

> 下列「Service 映射」列给出等价 REST 路径，便于对照；**实现走 Service，不走 HTTP**。

### 6.1 `todo` — 待办管理

**意图：** 管理 Backlog 中的「一件事」——创建、查询、更新、完成、安排到某天、退回 inbox。

| action | 说明 | Service / REST 等价 |
|--------|------|---------------------|
| `list` | 列表/搜索/看板 tab | `BacklogTaskService.get_user_tasks` |
| `get` | 详情（含按日时间线） | `BacklogTaskService.get_task_detail` |
| `create` | 新建待办 | `BacklogTaskService.create_task` |
| `update` | 更新字段/进度 | `BacklogTaskService.update_task` |
| `delete` | 删除 | `BacklogTaskService.delete_task` |
| `complete` | 标记完成 | `BacklogTaskService.complete_task` |
| `schedule` | 安排到指定日期 | `BacklogTaskService.schedule_task` |
| `revert` | 退回 inbox | `BacklogTaskService.revert_to_inbox` |

**list 主要参数：** `tab`, `context`, `priority`, `q`, `time_field`, `date_from`, `date_to`, `limit`, `offset`

---

### 6.2 `daily_progress` — 每日进度

> **命名迁移：** 原 Tool 名 `daily` 已 deprecated，请使用 **`daily_progress`**。详见 [命名迁移 spec](./2026-05-24-daily-progress-naming-migration-design.md)。

**意图：** 围绕 **某一自然日** 查看执行进度、关联待办、更新当日推进（不是独立任务收件箱）。

| action | 别名 | 说明 | Service 等价 |
|--------|------|------|--------------|
| `get_by_date` | — | 按日期取进度（含任务、聚合字段） | `DailyPlanService.to_plan_response` |
| `list` | `list_by_range` | 日期范围内进度；支持 `context` 筛选 | `DailyPlanService.get_user_plans` |
| `create` | `ensure_day` | 创建/合并某日进度容器 | `DailyPlanService.create_or_merge_plan` |
| `get` / `update` / `delete` | — | 进度 CRUD | 对应 Service |
| `list_tasks` | `list_entries` | 列出当日条目 | `DailyPlanService.get_plan_tasks` |
| `add_task` | `link_entry` | 从待办关联 | `BacklogTaskService.add_to_daily_plan` |
| `update_task` / `set_task_status` / `remove_task` | `unlink_entry`（remove） | 条目操作 | 对应 Service |

**list / get / get_by_date 参数：** `start_date`, `end_date`, `context` (`work` \| `learning` \| `life` \| `all`)

**REST 等价路径：** `/api/v1/daily-progress/*`（旧 `/daily-plans` 已移除）

**Deprecated：** Tool `daily`（wrapper，计划移除）

---

### 6.3 `reflect` — 反思与总结

| action | 说明 |
|--------|------|
| `get_daily_summary` / `create_daily_summary` / `update_daily_summary` / `delete_daily_summary` | 日总结（推荐） |
| `get_daily` / `create_daily` / `update_daily` / `delete_daily` | 日总结（deprecated 别名） |
| `list_weekly` / `get_weekly` / `create_weekly` / `generate_weekly` / `update_weekly` / `delete_weekly` / `send_weekly` | 周总结 |

对应 `DailySummaryService`、`WeeklySummaryService`、`NotificationService`。

---

### 6.4 `plan` — 长期规划

年目标 + 月计划；对应 `YearlyGoalService`、`MonthlyPlanService`（16 个 action，同前版 §6.4 表格）。

---

### 6.5 `account` — 账户与设置

**意图：** 当前用户资料、密码、通知偏好。

| action | 说明 |
|--------|------|
| `get_profile` | 当前用户 |
| `update_profile` | 更新资料 |
| `change_password` | 修改密码 |
| `get_settings` | 通知/飞书设置 |
| `update_settings` | 更新设置 |

**刻意排除：** API Key 管理、头像上传（v1）。

---

### 6.6 `admin` — 管理与运维

**意图：** RBAC 保护下的用户管理、系统健康、待办数据修复。**无对应权限不得调用。**

#### 权限校验（必须实现）

Fix Life RBAC 权限码：

| 权限码 | 说明 |
|--------|------|
| `users:manage` | 用户/角色管理、data-repair |
| `system_status:read` | 系统依赖健康 |

**MCP 层校验流程（基于 API Key 解析出的用户）：**

1. **Initialize 后**：从 API Key 绑定用户加载 `permissions`（同 `get_permission_codes_for_user`）。
2. **注册 Tool**：仅当权限集含 `users:manage` 或 `system_status:read` 时，在 `tools/list` 响应中包含 `admin`；否则 **不列出**。
3. **调用时**：每个 action 执行前校验；无权限立即返回：

```json
{
  "isError": true,
  "code": "FORBIDDEN",
  "message": "admin action 'list_users' requires permission 'users:manage'",
  "required_permission": "users:manage"
}
```

**action → 所需权限：**

| action | 所需权限 |
|--------|----------|
| `list_users`, `create_user`, `update_user`, `delete_user`, `reset_temp_password`, `list_roles` | `users:manage` |
| `system_status` | `system_status:read` |
| `repair_preview`, `repair_run`, `repair_merge` | `users:manage` |

---

## 7. 未纳入 v1 的能力

| 能力 | 原因 |
|------|------|
| `/analytics/*` | Agent 场景少 |
| MCP 内 API Key CRUD | 仅 Web 系统设置 + JWT |
| `POST /auth/login` 等 | MCP 走 API Key，不走账号密码 |
| 头像上传 | 二进制；留 Web |
| stdio 独立 MCP 包 | 统一 Streamable HTTP |

---

## 8. 实现建议

### 8.1 后端目录结构

```
backend/app/
├── mcp/
│   ├── __init__.py
│   ├── server.py           # FastMCP / 官方 SDK，mount Streamable HTTP
│   ├── auth.py             # API Key 解析 → User + permissions
│   ├── session.py          # MCP session 上下文（user_id, permissions）
│   └── tools/
│       ├── todo.py
│       ├── daily.py
│       ├── reflect.py
│       ├── plan.py
│       ├── account.py
│       └── admin.py
├── models/mcp_api_key.py
├── services/mcp_api_key_service.py
├── api/v1/endpoints/
│   └── system_settings.py  # 扩展 mcp-keys CRUD
└── main.py                 # mount /mcp 路由
```

### 8.2 依赖与挂载

- 使用 **FastMCP** 或官方 Python MCP SDK 的 **Streamable HTTP** 模式。
- 在 `main.py` 将 MCP ASGI app 挂载到 `/mcp`（与 `/api/v1` 并列）。
- **Nginx**（`deploy/nginx.conf`）：`location /mcp` 反代至 uvicorn；允许较长超时以支持 SSE 流。

### 8.3 Cursor 配置示例

```json
{
  "mcpServers": {
    "fixlife": {
      "url": "https://fixlife.mitrecx.top/mcp",
      "headers": {
        "Authorization": "Bearer fl_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

系统设置 UI 可提供 **「复制 Cursor 配置」** 按钮，填入当前生成的 Key。

### 8.4 错误处理

| 场景 | MCP 返回 |
|------|----------|
| 无效/撤销 API Key | 401，`INVALID_API_KEY` |
| 权限不足 | 403，`FORBIDDEN` |
| 业务校验失败 | 422，转发 Service/Schema 错误 |
| 资源不存在 | 404 |

### 8.5 测试策略

- **单元测试**：Tool handler mock Service；API Key 哈希与校验
- **集成测试**：创建 Key → Streamable HTTP `initialize` → `tools/list` → `tools/call` golden path
- **权限测试**：普通用户 Key 无 `admin`；admin 用户 Key 含 `admin` 且 action 级拦截

---

## 9. 典型 Agent 工作流

### 9.1 接入流程

```mermaid
sequenceDiagram
  participant U as 用户
  participant Web as Fix Life Web
  participant C as MCP Client
  participant MCP as /mcp
  participant SVC as Services

  U->>Web: 系统设置 → 生成 API Key
  Web-->>U: 明文 Key（仅此一次）
  U->>C: 配置 url + Authorization
  C->>MCP: POST initialize
  MCP->>MCP: 校验 API Key → user + permissions
  MCP-->>C: capabilities + tools/list

  C->>MCP: tools/call todo.list
  MCP->>SVC: BacklogTaskService.get_user_tasks
  SVC-->>MCP: tasks
  MCP-->>C: 结构化结果
```

### 9.2 「今日执行」

1. `daily_progress.get_by_date` — 今日进度  
2. `todo.update` — 更新进度  
3. `reflect.create_daily_summary` — 日总结  

### 9.3 「周回顾」

1. `reflect.generate_weekly`  
2. `reflect.update_weekly`（可选）  
3. `reflect.send_weekly`  

---

## 10. 备选方案与取舍

| 方案 | 说明 | 结论 |
|------|------|------|
| **A. 内嵌 Streamable HTTP + API Key** | Fix Life 即 MCP Server | **采用** |
| B. 独立 `fixlife-mcp` stdio 包 + JWT | 多进程、本地配置 token | 放弃：运维与凭证管理复杂 |
| C. MCP 复用 JWT login | Agent 需处理验证码/密码 | 放弃：体验差 |
| D. 6 Tools vs 合并 todo+daily | 见前版方案 B | 维持 6 Tools |

---

## 11. 里程碑

| 阶段 | 交付 |
|------|------|
| **M0** | 本文档定稿 |
| **M1** | `mcp_api_keys` 表 + 系统设置 REST/UI + Key 生成 |
| **M2** | `/mcp` Streamable HTTP 骨架 + API Key 认证 + `initialize` / `tools/list` |
| **M3** | `todo` + `daily` Tools |
| **M4** | `reflect` + `plan` + `account` |
| **M5** | `admin`（RBAC 条件注册 + action 校验）+ Nginx + 生产部署 |
| **M6** | Cursor 配置文档与 snippet |

---

## 12. 开放问题

1. **Key 数量上限**：每用户是否限制活跃 Key 数（如 10）？  
2. **Key 过期**：v1 永久有效 vs 可选 `expires_at`？  
3. **组合 action**：`todo.create_and_schedule` 是否在 v1 提供？  
4. **MCP 协议版本**：锁定 `2025-06-18` 还是跟进 `2025-11-25` / `2026-07-28` 无 Session 草案？  
5. **Rate limit**：是否对 `/mcp` 按 Key 限流？

---

## 附录 A：接入面速查

| 接入方式 | URL | 认证 |
|----------|-----|------|
| Web / REST | `/api/v1/*` | JWT（login） |
| MCP Agent | `/mcp` | API Key（系统设置生成） |
| 健康检查 | `/health` | 无 |

## 附录 B：Tool 数量对照

| 维度 | 数量 | 评价 |
|------|------|------|
| REST 端点模块 | 12 | 过细，不宜 1:1 |
| MCP Tools | 6 | 意图层，适中 |
