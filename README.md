# Fix Life - 生活计划管理系统

<p align="center">
  <img src="./fix-life.jpg" alt="Fix Life" />
</p>

一个帮助追踪年度、月度、每日目标的个人计划管理应用。可根据 每日计划 自动生成 周总结, 并发送到邮箱/飞书。

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

**一键启动**

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

后端将在 `http://localhost:8020` 启动

- API 文档: `http://localhost:8020/docs`
- ReDoc 文档: `http://localhost:8020/redoc`

### 3. 前端设置

**一键启动**

```bash
# 进入前端目录
cd frontend

# 一键启动（自动检查 Node.js、安装依赖、启动服务）
./start.sh
```

前端将在 `http://localhost:5277` 启动

## 数据库连接

数据库配置在 `backend/.env` 中：

```
DATABASE_URL=postgresql://josie:bills_password_2024@localhost:6432/fix_life_db
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
DATABASE_URL=postgresql://user:password@localhost:6432/fix_life_db
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
CORS_ORIGINS=["http://localhost:5277"]
```

### 前端 (.env)

```
VITE_API_URL=http://localhost:8020/api/v1
```