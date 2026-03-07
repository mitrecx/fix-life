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

## 添加新功能流程

### 后端添加新功能
1. **创建数据模型** (`app/models/`):
2. **创建 Pydantic Schemas** (`app/schemas/`):
3. **创建服务层** (`app/services/`):
4. **创建 API 端点** (`app/api/v1/endpoints/`):
5. **注册路由** (`app/api/v1/api.py`):
6. **创建数据库迁移**:
  

### 前端添加新功能
1. **定义类型** (`src/types/`):
2. **创建 API 服务** (`src/services/`):
3. **创建组件** (`src/components/`):
4. **添加路由** (`src/App.tsx` 或路由配置文件)

