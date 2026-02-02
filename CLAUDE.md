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
前后端项目启动很快, 一般在 5 秒之内, 请你不要长时间的等待