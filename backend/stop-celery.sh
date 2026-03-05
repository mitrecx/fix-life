#!/bin/bash
# Stop Celery Worker and Beat services

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Stopping Celery Services${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Log directory
LOG_DIR="${SCRIPT_DIR}/logs"
mkdir -p "$LOG_DIR"

# Stop Celery Worker
if [ -f "${LOG_DIR}/celery_worker.pid" ]; then
    WORKER_PID=$(cat "${LOG_DIR}/celery_worker.pid")
    echo -e "${YELLOW}Stopping Celery Worker (PID: $WORKER_PID)...${NC}"

    if ps -p $WORKER_PID > /dev/null 2>&1; then
        kill $WORKER_PID
        sleep 1
        if ps -p $WORKER_PID > /dev/null 2>&1; then
            echo -e "${YELLOW}Force killing Celery Worker...${NC}"
            kill -9 $WORKER_PID
        fi
    fi

    rm -f "${LOG_DIR}/celery_worker.pid"
    echo -e "${GREEN}✓ Celery Worker stopped${NC}"
else
    # Try to find and kill any celery worker processes
    WORKER_PIDS=$(ps aux | grep "celery.*worker" | grep -v grep | awk '{print $2}')
    if [ -n "$WORKER_PIDS" ]; then
        echo -e "${YELLOW}Stopping Celery Worker processes...${NC}"
        echo "$WORKER_PIDS" | xargs kill -9 2>/dev/null || true
        echo -e "${GREEN}✓ Celery Worker stopped${NC}"
    else
        echo -e "${YELLOW}No Celery Worker processes found${NC}"
    fi
fi

echo ""

# Stop Celery Beat
if [ -f "${LOG_DIR}/celery_beat.pid" ]; then
    BEAT_PID=$(cat "${LOG_DIR}/celery_beat.pid")
    echo -e "${YELLOW}Stopping Celery Beat (PID: $BEAT_PID)...${NC}"

    if ps -p $BEAT_PID > /dev/null 2>&1; then
        kill $BEAT_PID
        sleep 1
        if ps -p $BEAT_PID > /dev/null 2>&1; then
            echo -e "${YELLOW}Force killing Celery Beat...${NC}"
            kill -9 $BEAT_PID
        fi
    fi

    rm -f "${LOG_DIR}/celery_beat.pid"
    echo -e "${GREEN}✓ Celery Beat stopped${NC}"
else
    # Try to find and kill any celery beat processes
    BEAT_PIDS=$(ps aux | grep "celery.*beat" | grep -v grep | awk '{print $2}')
    if [ -n "$BEAT_PIDS" ]; then
        echo -e "${YELLOW}Stopping Celery Beat processes...${NC}"
        echo "$BEAT_PIDS" | xargs kill -9 2>/dev/null || true
        echo -e "${GREEN}✓ Celery Beat stopped${NC}"
    else
        echo -e "${YELLOW}No Celery Beat processes found${NC}"
    fi
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ All Celery services stopped${NC}"
echo -e "${BLUE}========================================${NC}"
