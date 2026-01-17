#!/bin/bash

# Fix Life Frontend 一键启动脚本

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
echo -e "${BLUE}  Fix Life Frontend 启动脚本${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ 未找到 Node.js${NC}"
    echo -e "${YELLOW}请安装 Node.js 18+${NC}"
    echo "推荐使用 nvm 安装: https://github.com/nvm-sh/nvm"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js 版本: $NODE_VERSION${NC}"

# 检查 pnpm 或 npm
PACKAGE_MANAGER=""
if command -v pnpm &> /dev/null; then
    PACKAGE_MANAGER="pnpm"
    echo -e "${GREEN}✓ 使用 pnpm 作为包管理器${NC}"
elif command -v npm &> /dev/null; then
    PACKAGE_MANAGER="npm"
    echo -e "${GREEN}✓ 使用 npm 作为包管理器${NC}"
else
    echo -e "${RED}❌ 未找到 pnpm 或 npm${NC}"
    exit 1
fi

# 检查 .env 文件
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  未找到 .env 文件${NC}"
    echo -e "${YELLOW}正在创建 .env...${NC}"
    cat > .env << EOF
VITE_API_URL=http://localhost:8000/api/v1
EOF
    echo -e "${GREEN}✓ .env 文件已创建${NC}"
else
    echo -e "${GREEN}✓ .env 文件已存在${NC}"
fi

# 检查 node_modules
if [ ! -d "node_modules" ]; then
    echo ""
    echo -e "${YELLOW}首次启动，正在安装依赖...${NC}"
    $PACKAGE_MANAGER install
    echo -e "${GREEN}✓ 依赖安装完成${NC}"
else
    echo -e "${GREEN}✓ node_modules 已存在${NC}"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  启动开发服务器${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}前端地址: http://localhost:5173${NC}"
echo -e "${GREEN}后端地址: http://localhost:8000/docs${NC}"
echo ""

# 启动开发服务器（pnpm 和 npm 命令不同）
if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
    $PACKAGE_MANAGER dev
else
    $PACKAGE_MANAGER run dev
fi
