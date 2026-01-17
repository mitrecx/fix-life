# Fix Life - 生活计划管理系统

一个帮助追踪年度、月度、每日目标的个人计划管理应用。

## 技术栈

### 后端
- **FastAPI** - Python Web 框架
- **uv** - 快速 Python 包管理器
- **PostgreSQL** - 数据库
- **SQLAlchemy** - ORM
- **Alembic** - 数据库迁移

### 前端
- **React 18** + **TypeScript**
- **Vite** - 构建工具
- **Ant Design** - UI 组件库
- **Zustand** - 状态管理
- **Axios** - HTTP 客户端

## 项目结构

```
fix-life/
├── backend/                 # FastAPI 后端
│   ├── app/
│   │   ├── api/            # API 路由
│   │   ├── core/           # 核心配置
│   │   ├── db/             # 数据库连接
│   │   ├── models/         # SQLAlchemy 模型
│   │   ├── schemas/        # Pydantic schemas
│   │   └── services/       # 业务逻辑
│   ├── alembic/            # 数据库迁移
│   ├── pyproject.toml      # uv 项目配置
│   ├── start.sh            # 一键启动脚本
│   └── .env
│
└── frontend/                # React 前端
    ├── src/
    │   ├── components/     # React 组件
    │   ├── services/       # API 调用
    │   ├── store/          # Zustand 状态管理
    │   └── types/          # TypeScript 类型
    ├── package.json
    └── vite.config.ts
```

## 快速开始

### 前置要求

- **uv** - Python 包管理器 (安装: `curl -LsSf https://astral.sh/uv/install.sh | sh`)
- Node.js 18+
- PostgreSQL 15+
- pnpm/npm

### 1. 数据库设置

首先确保 PostgreSQL 已安装并运行：

```bash
# 启动 PostgreSQL 服务 (macOS)
brew services start postgresql

# 创建数据库
createdb fix_life_db
```

### 2. 后端设置

**一键启动（推荐）**

```bash
# 进入后端目录
cd backend

# 确保已创建 .env 文件
cp .env.example .env

# 一键启动（自动安装 uv、同步依赖、运行迁移、启动服务）
./start.sh
```

启动脚本会自动完成以下操作：
1. 检查并安装 uv（如果未安装）
2. 安装 Python 3.11（如果未安装）
3. 同步项目依赖
4. 运行数据库迁移
5. 启动开发服务器

**手动启动（可选）**

```bash
cd backend

# 同步依赖
uv sync

# 运行数据库迁移
uv run alembic upgrade head

# 启动服务
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

后端将在 `http://localhost:8000` 启动

- API 文档: `http://localhost:8000/docs`
- ReDoc 文档: `http://localhost:8000/redoc`

### 3. 前端设置

**一键启动（推荐）**

```bash
# 进入前端目录
cd frontend

# 一键启动（自动检查 Node.js、安装依赖、启动服务）
./start.sh
```

**手动启动（可选）**

```bash
# 打开新终端，进入前端目录
cd frontend

# 安装依赖
pnpm install
# 或
npm install

# 启动开发服务器
pnpm dev
# 或
npm run dev
```

前端将在 `http://localhost:5173` 启动

## 数据库连接

数据库配置在 `backend/.env` 中：

```
DATABASE_URL=postgresql://josie:bills_password_2024@localhost:5432/fix_life_db
```

## 当前功能

### 年度目标管理

- [x] 创建年度目标
- [x] 查看目标列表（按年份、类别筛选）
- [x] 编辑目标
- [x] 删除目标
- [x] 更新进度
- [x] 自动生成月度里程碑
- [x] 可视化进度展示

### API 端点

```
GET    /api/v1/yearly-goals              # 获取所有年度目标
POST   /api/v1/yearly-goals              # 创建新目标
GET    /api/v1/yearly-goals/{id}         # 获取单个目标
PUT    /api/v1/yearly-goals/{id}         # 更新目标
PATCH  /api/v1/yearly-goals/{id}/progress # 更新进度
DELETE /api/v1/yearly-goals/{id}         # 删除目标
```

## 开发指南

### 添加新的 API 端点

1. 在 `backend/app/models/` 创建 SQLAlchemy 模型
2. 在 `backend/app/schemas/` 创建 Pydantic schemas
3. 在 `backend/app/services/` 创建业务逻辑
4. 在 `backend/app/api/v1/endpoints/` 创建路由

### 运行数据库迁移

```bash
cd backend

# 创建新迁移
uv run alembic revision --autogenerate -m "描述迁移内容"

# 执行迁移
uv run alembic upgrade head

# 回滚迁移
uv run alembic downgrade -1
```

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

## 常见问题

### 数据库连接失败

检查 PostgreSQL 服务是否运行：
```bash
# macOS
brew services list

# 启动服务
brew services start postgresql
```

### 后端启动失败

确保已安装 uv 并运行一键启动脚本：
```bash
cd backend
./start.sh
```

### 前端无法连接后端

确保后端服务在 `http://localhost:8000` 运行，检查 `frontend/.env` 中的 `VITE_API_URL`。

## 后续计划

- [ ] 月度计划功能
- [ ] 每日任务管理
- [ ] 习惯追踪
- [ ] 用户认证 (JWT)
- [ ] 数据统计仪表盘
- [ ] 导出功能
