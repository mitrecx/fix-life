#!/bin/bash

# Fix Life Backend 一键启动脚本
# 使用 uv 管理 Python 依赖和虚拟环境

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Fix Life Backend 启动脚本${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 检查 uv 是否安装
if ! command -v uv &> /dev/null; then
    echo -e "${RED}❌ 未找到 uv${NC}"
    echo -e "${YELLOW}正在安装 uv...${NC}"
    curl -LsSf https://astral.sh/uv/install.sh | sh
    # 重新加载 PATH
    export PATH="$HOME/.local/bin:$PATH"
    if ! command -v uv &> /dev/null; then
        echo -e "${RED}❌ uv 安装失败，请手动安装${NC}"
        echo "安装命令: curl -LsSf https://astral.sh/uv/install.sh | sh"
        exit 1
    fi
    echo -e "${GREEN}✓ uv 安装完成${NC}"
fi

# 检查 .env 文件
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  未找到 .env 文件${NC}"
    echo -e "${YELLOW}正在从 .env.example 创建 .env...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ .env 文件已创建${NC}"
    echo -e "${YELLOW}请根据需要修改 .env 中的配置${NC}"
fi

# 同步依赖
echo -e "${YELLOW}同步依赖...${NC}"
uv sync
echo -e "${GREEN}✓ 依赖同步完成${NC}"

echo ""
echo -e "${BLUE}----------------------------------------${NC}"
echo -e "${BLUE}数据库操作${NC}"
echo -e "${BLUE}----------------------------------------${NC}"

# 检查数据库连接并运行迁移
echo -e "${YELLOW}检查数据库并运行迁移...${NC}"

# 临时禁用错误退出，因为 alembic 在没有迁移时会报错
set +e
DB_OUTPUT=$(uv run alembic upgrade head 2>&1)
DB_EXIT_CODE=$?
set -e

if [ $DB_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ 数据库迁移成功${NC}"
else
    echo -e "${RED}❌ 数据库连接失败${NC}"
    echo -e "${YELLOW}请检查以下配置：${NC}"
    echo "  1. PostgreSQL 是否运行: brew services list | grep postgresql"
    echo "  2. 启动 PostgreSQL: brew services start postgresql"
    echo "  3. 数据库是否创建: psql -l | grep fix_life_db"
    echo "  4. .env 文件配置是否正确"
    echo ""
    echo -e "${RED}错误信息:${NC}"
    echo "$DB_OUTPUT"
    exit 1
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  启动开发服务器${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}API 文档: http://localhost:8000/docs${NC}"
echo -e "${GREEN}ReDoc: http://localhost:8000/redoc${NC}"
echo ""

# 启动开发服务器
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
