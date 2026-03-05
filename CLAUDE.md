# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 测试用户
用户名: test
密码: test12345
前后端项目启动后, 你必须打开浏览器, 使用 test 用户在前端登录, 测试一下登录功能是否正常

## 重要：启动前后端必须使用 start.sh

### 前端启动
- **必须使用**: `frontend/start.sh`
- **端口**: 5173
- **脚本功能**:
  - 自动检测并清理占用 5173 端口的旧进程
  - 检查 Node.js 版本
  - 自动选择 pnpm 或 npm 包管理器
  - 自动检查并创建 .env 文件
  - 首次启动时自动安装依赖

### 后端启动
- **必须使用**: `backend/start.sh`
- **端口**: 8000
- **脚本功能**:
  - 自动检测并清理占用 8000 端口的旧进程
  - 使用 uv 管理 Python 依赖和虚拟环境
  - 自动同步依赖（uv sync）
  - 自动运行数据库迁移（alembic upgrade head）
  - 检查 .env 文件是否存在

### 注意
- 前后端项目启动都很快, 一般在 5 秒之内, 请你不要长时间的等待
- 数据库服务不在本地, 需要通过 `ssh -f -N  -L 5432:127.0.0.1:5432  josie@jo.mitrecx.top` 开启隧道后才能连接
- 通过 `ssh josie@jo.mitrecx.top` 连接服务器, 前后端应用都部署在这个服务器上

## 项目架构

### 后端架构 (FastAPI)

**目录结构**:
```
backend/app/
├── api/v1/
│   ├── endpoints/      # API 路由处理
│   └── api.py          # 路由聚合器
├── core/
│   ├── config.py       # 配置管理 (Pydantic Settings)
│   ├── deps.py         # 依赖注入 (get_db, get_current_user)
│   └── security.py     # JWT 认证、密码哈希
├── db/
│   └── session.py      # 数据库会话
├── models/             # SQLAlchemy ORM 模型
├── schemas/            # Pydantic 请求/响应模型
└── services/           # 业务逻辑层
```

**认证流程**:
- JWT 认证，token 有效期 7 天
- 前端存储在 `localStorage` (key: `auth_token`)
- HTTP Bearer 认证，通过 `get_current_user` 依赖注入
- 认证失败自动返回 401，前端拦截器自动跳转登录页

**API 路由结构**:
- `/api/v1/auth` - 无需认证（登录、注册）
- `/api/v1/users` - 用户管理
- `/api/v1/yearly-goals` - 年度目标
- `/api/v1/monthly-plans` - 月度计划
- `/api/v1/daily-plans` - 日计划
- `/api/v1/daily-summaries` - 每日总结
- `/api/v1/analytics` - 数据统计
- `/api/v1/system-settings` - 系统设置

### 前端架构 (React + TypeScript)

**目录结构**:
```
frontend/src/
├── components/     # React 组件
├── services/       # API 调用封装
├── store/          # Zustand 状态管理
├── types/          # TypeScript 类型定义
└── main.tsx        # 应用入口
```

**状态管理**:
- `authStore` - 用户认证状态（持久化到 localStorage）
- `yearlyGoalStore` - 年度目标状态

**API 通信**:
- Axios 实例，baseURL 从 `VITE_API_URL` 读取
- 请求拦截器自动添加 JWT token
- 响应拦截器处理 401 错误，自动清除认证信息

## 开发命令

### 后端

```bash
cd backend

# 同步依赖
uv sync

# 运行数据库迁移
uv run alembic upgrade head

# 创建新迁移
uv run alembic revision --autogenerate -m "描述迁移内容"

# 回滚迁移
uv run alembic downgrade -1

# 代码格式化
uv run black app/
uv run ruff check app/

# 运行测试
uv run pytest
```

### 前端

```bash
cd frontend

# 安装依赖
pnpm install

# 开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 代码检查
pnpm lint
```

## 添加新功能流程

### 后端添加新功能

1. **创建数据模型** (`app/models/`):
   ```python
   class NewFeature(Base):
       __tablename__ = "new_features"
       id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
       # ... 其他字段
   ```

2. **创建 Pydantic Schemas** (`app/schemas/`):
   ```python
   class NewFeatureBase(BaseModel):
       # 基础字段
       pass

   class NewFeatureCreate(NewFeatureBase):
       # 创建专用字段
       pass

   class NewFeatureResponse(NewFeatureBase):
       id: UUID
       created_at: datetime
       # ... 其他响应字段
   ```

3. **创建服务层** (`app/services/`):
   ```python
   def create_new_feature(db: Session, data: NewFeatureCreate, user_id: str):
       # 业务逻辑
       pass
   ```

4. **创建 API 端点** (`app/api/v1/endpoints/`):
   ```python
   from app.api.v1.deps import get_db, get_current_user

   router = APIRouter()

   @router.post("/", response_model=NewFeatureResponse)
   def create(
       data: NewFeatureCreate,
       db: Session = Depends(get_db),
       current_user: User = Depends(get_current_user)
   ):
       return service_create_new_feature(db, data, current_user.id)
   ```

5. **注册路由** (`app/api/v1/api.py`):
   ```python
   from app.api.v1.endpoints import new_features
   api_router.include_router(new_features.router, prefix="/new-features", tags=["new-features"])
   ```

6. **创建数据库迁移**:
   ```bash
   uv run alembic revision --autogenerate -m "add new features table"
   uv run alembic upgrade head
   ```

### 前端添加新功能

1. **定义类型** (`src/types/`):
   ```typescript
   export interface NewFeature {
     id: string;
     // ... 其他字段
   }

   export interface NewFeatureCreate {
     // 创建字段
   }
   ```

2. **创建 API 服务** (`src/services/`):
   ```typescript
   import api from "./api";

   export const newFeatureService = {
     create: (data: NewFeatureCreate) =>
       api.post<NewFeature>("/new-features", data),
     getAll: () =>
       api.get<NewFeature[]>("/new-features"),
   };
   ```

3. **创建组件** (`src/components/`):
   ```typescript
   export function NewFeatureComponent() {
     // 组件逻辑
   }
   ```

4. **添加路由** (`src/App.tsx` 或路由配置文件)

## 环境变量

### 后端 (.env)
```
DATABASE_URL=postgresql://user:password@localhost:5432/fix_life_db
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
CORS_ORIGINS=["http://localhost:5173"]
```

### 前端 (.env)
```
VITE_API_URL=http://localhost:8000/api/v1
```

## 数据库模型关系

- **User** - 用户表
- **YearlyGoal** - 年度目标 (user_id → User)
- **MonthlyMilestone** - 月度里程碑 (yearly_goal_id → YearlyGoal)
- **MonthlyPlan** - 月度计划 (user_id → User)
- **DailyPlan** - 日计划 (user_id → User, monthly_plan_id → MonthlyPlan)
- **DailyTask** - 每日任务 (daily_plan_id → DailyPlan)
- **DailySummary** - 每日总结 (daily_plan_id → DailyPlan, user_id → User)
- **SystemSettings** - 系统设置 (user_id → User)

所有外键关系使用 CASCADE 或 SET NULL 删除策略。

## API 文档
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
