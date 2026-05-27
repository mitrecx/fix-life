# 每日进度命名统一 — 分阶段迁移说明

**日期：** 2026-05-24  
**状态：** Phase 1–4 已完成（Phase 5 默认跳过）  
**关联文档：**

- [待办与每日进度统一模型](./2026-05-24-backlog-daily-plan-unification-design.md) — 领域模型与「每日进度」产品语义
- [Fix Life MCP Server 设计](./2026-05-24-fixlife-mcp-servers-design.md) — 现有 `daily` Tool 定义

---

## 1. 背景与问题

Fix Life 在**产品层**已统一使用 **「每日进度」**（导航、页面标题、用户文案），但**技术层**仍大量使用 **daily plan / DailyPlan / daily_plans** 命名。二者语义不一致：

| 用户/产品理解 | 技术层现状 | 偏差 |
|---------------|------------|------|
| 按天查看待办的**执行与推进** | `DailyPlan`、`daily_plans` | 「Plan」暗示事前规划 |
| 某待办在**某一自然日**的出现 | `DailyTask` | 易被理解为第二个待办库 |
| MCP 查今日做了什么 | Tool 名 `daily` | 过短；与 `reflect.get_daily`（日总结）混淆 |

统一模型文档已明确：

> **每日进度** = 待办在某自然日的执行/进度切面（Occurrence），**不是**第二个任务收件箱。  
> DB/API 路径 `daily_plans` **可暂保留**，但对外命名应逐步对齐。

本 spec 定义 **分阶段、可回滚、兼容优先** 的迁移路线，避免一次性大重构。

---

## 2. 目标与非目标

### 2.1 目标

- **G1 语义一致**：用户可见文案、MCP Tool、API 文档统一使用「每日进度 / daily progress」。
- **G2 Agent 可发现**：MCP Tool 名与 action 名能让 Agent 区分「每日进度」「日总结」「月计划」。
- **G3 零停机迁移**：旧路径/旧 Tool 名在 deprecate 窗口内仍可用。
- **G4 分阶段交付**：每阶段独立可测、可部署，不阻塞业务功能开发。
- **G5 单一来源不变**：命名变更**不改变** backlog 为唯一任务来源的领域规则。

### 2.2 非目标

- **不**在本迁移中重命名 PostgreSQL 表（`daily_plans`、`daily_tasks`）——成本高、收益低，列为远期可选。
- **不**合并 `daily_progress` 与 `reflect`（日总结仍是独立能力）。
- **不**合并 `daily_progress` 与 `plan`（年/月长期规划）。
- **不**要求一次性改完所有 Python/TS 文件名（通过 alias 渐进过渡）。

---

## 3. 规范词汇表（Canonical Glossary）

迁移完成后，文档与对外接口**必须**使用左列术语；右列为当前实现名（内部可暂留）。

| 规范名（中文） | 规范名（英文 / API） | 当前实现名 | 含义 |
|----------------|----------------------|------------|------|
| 每日进度 | `daily_progress` | `daily_plan` / `daily` | 某用户在某自然日的进度视图（容器） |
| 进度条目 / 当日出现 | `entry` / `occurrence` | `daily_task` | 某待办在该日的一条出现记录 |
| 日总结 | `daily_summary` | `DailySummary` | 反思文本，属 `reflect` |
| 待办 | `todo` / `backlog` | `backlog_task` | 唯一任务来源 |
| 月计划 / 年目标 | `plan` | `monthly_plan` / `yearly_goal` | 长期规划，与每日进度无关 |

**禁止在对外文案中使用的词**（除非标注 deprecated）：

- 「每日计划」「日计划」（产品已废弃）
- MCP Tool 单独叫 `daily`（与总结混淆）

---

## 4. 现状清单（As-Is）

### 4.1 已对齐「每日进度」

| 位置 | 现状 |
|------|------|
| 侧边栏 / 移动底栏 | `每日进度` / `每日` |
| 前端路由 | `/daily-progress` |
| REST API | `/api/v1/daily-progress/*` |
| MCP Tool | **`daily_progress`**（`daily` deprecated） |
| MCP reflect | `get_daily_summary` 等别名 |
| 设置 / 分析 / 批量创建等 UI 文案 | 已改为「每日进度」 |
| MCP Settings + 导入指南 | 已说明 Tool 清单与弃用项 |

### 4.2 仍使用 daily plan 命名（Phase 3–4 范围）

| 层级 | 代表路径 / 符号 |
|------|-----------------|
| DB | `daily_plans`, `daily_tasks`, `daily_plan_id` |
| 后端模型 / Service | `DailyPlan`, `DailyTask`, `DailyPlanService`, `daily_plans.py` |
| 前端模块 | `dailyPlanService.ts`, `DailyPlansList.tsx`, `DailyPlanCard.tsx` |
| 分析 JSON 字段 | `total_daily_plans`（Phase 4 加别名） |
| MCP deprecated | Tool `daily`；reflect `get_daily` 等（90 天后移除） |

### 4.3 MCP `daily_progress` Tool action

| action | 用途 |
|--------|------|
| `get_by_date` | 按日期查进度 + 任务（含聚合字段） |
| `list` / `list_by_range` | 日期范围内列表；支持 `context` |
| `get` / `create` / `update` / `delete` | 进度 CRUD |
| `list_tasks` / `list_entries` | 当日条目 |
| `add_task` / `link_entry` 等 | 条目操作 |

---

## 5. 总体策略

```mermaid
flowchart LR
  P0[Phase 0<br/>Spec 定稿]
  P1[Phase 1<br/>对外语义 + MCP]
  P2[Phase 2<br/>REST 别名层]
  P3[Phase 3<br/>前端路由与服务]
  P4[Phase 4<br/>后端模块别名]
  P5[Phase 5<br/>可选 DB 重命名]

  P0 --> P1 --> P2 --> P3 --> P4
  P4 -.->|远期| P5
```

**原则：**

1. **对外先改、对内后改** — MCP 与 UI 文案优先。
2. **新增优于修改** — 新 Tool 名 / 新 URL 并行，旧名 deprecated。
3. **别名而非大爆炸** — Python/TS 用 re-export / wrapper，避免单次 mega-diff。
4. **Deprecate 窗口 ≥ 90 天** — 旧 MCP Tool 与旧 REST 路径在窗口内仍工作。

---

## 6. Phase 0 — 规范定稿（无代码）

**交付物：**

- [x] 本 spec 评审通过
- [x] 团队确认规范词汇表（§3）
- [x] 确认 MCP 新 Tool 名：`daily_progress`
- [x] 确认 REST 前缀：`/api/v1/daily-progress`

**验收：**

- [x] 相关 spec（MCP 设计 §6.2、统一模型 §3.4）增加交叉引用

**工期估计：** 0.5 天（评审）

---

## 7. Phase 1 — 对外语义 + MCP（优先实施）

**目标：** Agent 与用户从 MCP 层面能准确理解「每日进度」，且不与日总结混淆。

### 7.1 MCP Tool 重命名

| 项 | 变更 |
|----|------|
| 新 Tool | **`daily_progress`** — 与 `handle_daily` 共用实现 |
| 旧 Tool | **`daily`** — 保留，注册为 thin wrapper 调用同一 handler；description 首行标注 **Deprecated: use daily_progress** |
| Server instructions | 全文改用 *daily progress*；明确「not a separate task inbox」 |

**新 Tool description 建议（英文，供 Agent）：**

> Manage **daily progress** (execution view by calendar date): list/link backlog tasks for a day, update same-day progress. Not for creating standalone tasks (use `todo`). Not for daily reflection text (use `reflect` summary actions).

### 7.2 MCP action 别名（可选，Phase 1 或 1.5）

在 **不改变旧 action 行为** 的前提下，新增更清晰别名；旧 action 继续支持。

| 旧 action | 新别名（推荐） | 说明 |
|-----------|----------------|------|
| `list` | `list_by_range` | 按日期范围列进度 |
| `create` | `ensure_day` | 创建/合并某日容器 |
| `list_tasks` | `list_entries` | 当日条目 |
| `add_task` | `link_entry` | 从待办关联 |
| `remove_task` | `unlink_entry` | 移除当日出现 |

Phase 1 **至少**完成 Tool 重命名；action 别名可放到 **Phase 1.5**（小版本）。

### 7.3 MCP `reflect` 消歧

| 旧 action | 新别名 | 说明 |
|-----------|--------|------|
| `get_daily` | `get_daily_summary` | 获取日总结 |
| `create_daily` | `create_daily_summary` | 创建日总结 |
| `update_daily` | `update_daily_summary` | 更新日总结 |
| `delete_daily` | `delete_daily_summary` | 删除日总结 |

旧 action 保留 ≥90 天；文档与 error hint 指向新名。

### 7.4 MCP 查询能力补齐（建议纳入 Phase 1）

与 REST `GET /daily-plans` 对齐：

- `list` / `list_by_range` 支持 `context`: `work` \| `learning` \| `life` \| `all`
- 返回结构使用 `DailyPlanService.to_plan_response`（含 `total_tasks`、`completion_rate`、过滤后任务）

### 7.5 用户可见文案清扫（Phase 1 范围内）

扫描并替换**仍暴露给用户**的「日计划 / daily plan」字符串（不含代码符号名）：

| 区域 | 示例 |
|------|------|
| MCP 错误信息 | `"Daily plan not found"` → `"Daily progress not found for this date"` |
| 设置 → MCP 集成 | 说明文字列举 Tool 时用 `daily_progress` |
| `McpImportGuideModal` | Cursor 配置 snippet 注释 |
| 导出 Markdown 标题 | 已为「每日进度导出」则不动 |

**不在 Phase 1 改：** Python 类名、TS 文件名、DB、REST 路径。

### 7.7 Phase 1 额外交付（评审追加）

按 §16 评审结论，Phase 1 **同时**包含：

- REST 前缀 **`/api/v1/daily-progress`**（移除 `/daily-plans`，无 alias、无 redirect）
- 前端路由 **`/daily-progress`**（移除 `/daily-plans`，无 redirect）
- `dailyPlanService` baseUrl 指向新路径
- localStorage 筛选 key 迁移（读旧写新）

### 7.8 测试

- [x] `backend/tests/test_mcp_daily_progress.py` — 新 Tool 名 + 旧 Tool 兼容
- [x] `backend/tests/test_mcp_reflect.py` — reflect action 别名
- [x] `context` 筛选 list 行为与 REST 一致

### 7.9 部署与文档

- [x] 更新 `docs/superpowers/specs/2026-05-24-fixlife-mcp-servers-design.md` §6.2
- [x] Settings 页 + `McpImportGuideModal` 说明 `daily_progress`
- [x] 生产 deploy；`tools/list` 含 `daily_progress`

**验收标准：**

- Cursor 调用 `daily_progress.get_by_date` 成功
- 调用 `daily.get_by_date` 仍成功且返回相同结构
- Agent 从 `tools/list` description 能区分 daily progress vs daily summary

**工期估计：** 2–3 天

---

## 8. Phase 2 — REST 别名层（已并入 Phase 1）

> **状态：跳过。** 评审决定不做 `/daily-plans` 双挂载，Phase 1 已直接使用 `/daily-progress`。

---

## 9. Phase 3 — 前端路由与服务

**Phase 1 已完成：** 路由 `/daily-progress`、API baseUrl、localStorage key 迁移。

**Phase 3 已完成：** 组件/文件重命名 + 旧路径 deprecated re-export。

### 9.1 组件/文件重命名（渐进）

| 现名 | 目标名 | 状态 |
|------|--------|------|
| `DailyPlansPage.tsx` | `DailyProgressPage.tsx` | ✅ |
| `DailyPlansList.tsx` | `DailyProgressList.tsx` | ✅ |
| `DailyPlanCard.tsx` | `DailyProgressDayCard.tsx` | ✅ |
| `dailyPlanService.ts` | `dailyProgressService.ts` | ✅ |
| `dailyPlanFiltersStorage.ts` | `dailyProgressFiltersStorage.ts` | ✅ |
| `types/dailyPlan.ts` | `types/dailyProgress.ts` | ✅ |

**策略：** 新文件名 + 旧文件 `export { X from "./新文件" }` deprecated 一条线。

### 9.2 测试

- [x] `/daily-progress` 功能完整（`npm run build` 通过）
- [x] 筛选 localStorage 从旧 key 迁移（`readDailyProgressFilters` 读 legacy key 并写入新 key）

**验收标准：**

- 用户地址栏显示 `/daily-progress`
- 无功能回归

**工期估计：** 1–2 天（剩余组件重命名）— **已完成 2026-05-24**

---

## 10. Phase 4 — 后端模块与类型别名

**目标：** 代码阅读与新人 onboarding 语义一致；**仍不改 DB 表名**。

### 10.1 Python 模块（别名层）

| 现模块 | 新模块 | 策略 |
|--------|--------|------|
| `services/daily_plan_service.py` | `services/daily_progress_service.py` | 新文件 import 并 re-export `DailyPlanService as DailyProgressService` |
| `schemas/daily_plan.py` | `schemas/daily_progress.py` | 类型别名 `DailyProgressDayResponse = DailyPlanResponse` |
| `mcp/tools/daily.py` | `mcp/tools/daily_progress.py` | handler 重命名 `handle_daily_progress`；旧名 import 转发 |

模型层 **保留** `DailyPlan` ORM 类名，在类 docstring 注明：

> ORM name is historical. Represents a **daily progress day container**.

### 10.2 新代码规范

- 新 PR 禁止新增 `daily_plan` 字符串到**用户可见** error message
- 新 PR 优先 import `DailyProgressService`

### 10.3 分析 / Admin 字段

| 现字段 | 文档别名 |
|--------|----------|
| `total_daily_plans` | 响应 JSON 增加 `total_daily_progress_days`（同值），旧字段 deprecated |

### 10.4 测试

- [x] 全量 backend tests 通过
- [x] MCP / REST 均走新 import 路径

**工期估计：** 3–5 天（可拆多个 PR）

---

## 11. Phase 5 — 数据库重命名（远期，可选）

**仅在** Phase 1–4 完成且稳定 **6 个月+** 后评估。

| 现表/列 | 目标 |
|---------|------|
| `daily_plans` | `daily_progress_days` |
| `daily_tasks` | `daily_progress_entries` |
| `daily_plan_id` | `daily_progress_day_id` |

需要：Alembic 迁移 + 视图兼容层 + 长 deprecate 窗口。**默认不做**，除非有强合规/报表需求。

---

## 12. Deprecation 时间表（建议）

| 资产 | Deprecated 自 | 计划移除 |
|------|---------------|----------|
| MCP Tool `daily` | Phase 1 发布日 | +90 天 |
| MCP reflect `get_daily` 等 | Phase 1 发布日 | +90 天 |
| REST `/daily-plans` | — | **已移除**（Phase 1 直接替换） |
| 前端 `/daily-plans` 路由 | — | **已移除**（Phase 1 直接替换） |
| TS `dailyPlanService` | Phase 3 发布日 | +180 天 |
| Python `DailyPlanService` 直接 import | Phase 4 发布日 | +180 天 |

移除前：**CHANGELOG + Settings 页公告 + MCP instructions 警告** — ✅ 已完成（2026-05-24）。

---

## 13. 风险与缓解

| 风险 | 缓解 |
|------|------|
| Agent 仍调用旧 Tool `daily` | 保留 wrapper；instructions 强调新名 |
| 第三方集成硬编码 `/daily-plans` | Sunset 头 + 长窗口；redirect 路由 |
| 大 diff 难以 review | 严格分 Phase PR，每 PR < 500 行 |
| `reflect.get_daily` 与 progress 混淆 | Phase 1 即改 summary 别名 |
| 与「月计划 plan」混淆 | MCP 保持 `plan` = 年/月；文档 §3 词汇表 |

---

## 14. PR 拆分建议

| PR | Phase | 内容 |
|----|-------|------|
| PR-1 | 1 | MCP `daily_progress` + deprecated `daily` + tests |
| PR-2 | 1 | reflect summary action 别名 + MCP 文案 |
| PR-3 | 1 | MCP list `context` 筛选 + response 对齐 REST |
| PR-4 | 2 | REST `/daily-progress` 双挂载 + OpenAPI tag |
| PR-5 | 3 | 前端路由 redirect + dailyProgressService |
| PR-6 | 3 | localStorage key 迁移 |
| PR-7 | 4 | 后端 service/schema 别名模块 |
| PR-8 | 3–4 | 组件/文件重命名（可选，低优先级） |

---

## 15. 验收总 checklist

**Phase 1 完成：**

- [x] `daily_progress` Tool 可用，`daily` 仍可用
- [x] 日总结 action 有新别名
- [x] 无用户可见 "daily plan" / 「日计划」文案（内部符号名除外）

**Phase 2 完成：**

- [x] `/daily-progress` CRUD（旧 `/daily-plans` 已移除，无 redirect）

**Phase 3 完成：**

- [x] 主 URL 为 `/daily-progress`
- [x] 前端组件/文件重命名（canonical 新路径 + 旧路径 deprecated re-export）

**Phase 4 完成：**

- [x] 新 backend 代码使用 `daily_progress_*` 模块（REST / MCP / backlog 已切到 `DailyProgressService`）
- [x] ORM 表名未变，迁移无 DB downtime
- [x] 分析 JSON 增加 `total_daily_progress_days`（与 `total_daily_plans` 同值）

---

## 16. 评审结论（已定稿）

| # | 问题 | 决定 |
|---|------|------|
| 1 | MCP 新 Tool 名 | **`daily_progress`**（保留 `daily` 为 deprecated wrapper） |
| 2 | Phase 1 是否含 REST 查询 parity | **是** — MCP `list` / `get` / `get_by_date` 对齐 REST（`context` 筛选 + `to_plan_response` 聚合字段） |
| 3 | 前端组件文件重命名时机 | **Phase 3–4 渐进** — Phase 1 只改路由 `/daily-progress` 与 API baseUrl |
| 4 | `/daily-plans` 旧路径 | **全面替换，不做 redirect** — REST `/api/v1/daily-plans` 与前端 `/daily-plans` 均移除 |

---

## 17. 修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| 0.1 | 2026-05-24 | 初稿：Phase 0–5 分阶段命名迁移 |
| 0.2 | 2026-05-24 | 评审定稿：`daily_progress`、Phase 1 含 REST parity、`/daily-plans` 全面替换无 redirect |
| 0.3 | 2026-05-24 | Phase 1 实施完成 |
| 0.4 | 2026-05-24 | Phase 3–4 完成；§12 deprecation 公告（CHANGELOG / Settings / MCP） |
