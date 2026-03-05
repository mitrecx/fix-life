#!/bin/bash
# Celery Worker and Beat startup script for Fix Life

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Fix Life Celery Services Startup Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${YELLOW}Checking Redis connection...${NC}"
if redis-cli -h ${REDIS_HOST:-localhost} -p ${REDIS_PORT:-6379} ping > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Redis is running${NC}"
else
    echo -e "${RED}✗ Redis is not running${NC}"
    echo -e "${RED}Please start Redis first:${NC}"
    echo -e "  ${YELLOW}redis-server${NC} or ${YELLOW}sudo systemctl start redis${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Checking for existing Celery processes...${NC}"

# Find and kill existing Celery Worker processes
WORKER_PIDS=$(ps aux | grep "celery.*worker" | grep -v grep | awk '{print $2}')
if [ -n "$WORKER_PIDS" ]; then
    echo -e "${YELLOW}Stopping existing Celery Worker processes...${NC}"
    echo "$WORKER_PIDS" | xargs kill -9 2>/dev/null || true
    echo -e "${GREEN}✓ Stopped old Worker processes${NC}"
fi

# Find and kill existing Celery Beat processes
BEAT_PIDS=$(ps aux | grep "celery.*beat" | grep -v grep | awk '{print $2}')
if [ -n "$BEAT_PIDS" ]; then
    echo -e "${YELLOW}Stopping existing Celery Beat processes...${NC}"
    echo "$BEAT_PIDS" | xargs kill -9 2>/dev/null || true
    echo -e "${GREEN}✓ Stopped old Beat processes${NC}"
fi

# Wait for processes to fully stop
sleep 2

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Starting Celery Services${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Activate virtual environment if it exists
if [ -f "venv/bin/activate" ]; then
    echo -e "${YELLOW}Activating virtual environment...${NC}"
    source venv/bin/activate
elif [ -f ".venv/bin/activate" ]; then
    echo -e "${YELLOW}Activating virtual environment...${NC}"
    source .venv/bin/activate
fi

# Log files
LOG_DIR="${SCRIPT_DIR}/logs"
mkdir -p "$LOG_DIR"
WORKER_LOG="${LOG_DIR}/celery_worker.log"
BEAT_LOG="${LOG_DIR}/celery_beat.log"

echo -e "${GREEN}Log directory: ${LOG_DIR}${NC}"
echo ""

# Start Celery Worker
echo -e "${YELLOW}Starting Celery Worker...${NC}"
nohup celery -A app.core.celery worker \
    --loglevel=info \
    --logfile="$WORKER_LOG" \
    --pidfile="${LOG_DIR}/celery_worker.pid" \
    > /dev/null 2>&1 &

# Wait for worker to start
sleep 3

if [ -f "${LOG_DIR}/celery_worker.pid" ]; then
    WORKER_PID=$(cat "${LOG_DIR}/celery_worker.pid")
    if ps -p $WORKER_PID > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Celery Worker started (PID: $WORKER_PID)${NC}"
        echo -e "  Log file: ${WORKER_LOG}"
    else
        echo -e "${YELLOW}⚠ Worker PID file created but process not running${NC}"
        echo -e "${YELLOW}Checking for any celery worker processes...${NC}"
        ps aux | grep "celery.*worker" | grep -v grep || echo -e "${RED}No worker processes found${NC}"
    fi
else
    echo -e "${RED}✗ Failed to start Celery Worker${NC}"
    exit 1
fi

echo ""

# Start Celery Beat
echo -e "${YELLOW}Starting Celery Beat...${NC}"
nohup celery -A app.core.celery beat \
    --loglevel=info \
    --logfile="$BEAT_LOG" \
    --pidfile="${LOG_DIR}/celery_beat.pid" \
    > /dev/null 2>&1 &

# Wait for beat to start
sleep 3

if [ -f "${LOG_DIR}/celery_beat.pid" ]; then
    BEAT_PID=$(cat "${LOG_DIR}/celery_beat.pid")
    if ps -p $BEAT_PID > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Celery Beat started (PID: $BEAT_PID)${NC}"
        echo -e "  Log file: ${BEAT_LOG}"
    else
        echo -e "${YELLOW}⚠ Beat PID file created but process not running${NC}"
        echo -e "${YELLOW}Checking for any celery beat processes...${NC}"
        ps aux | grep "celery.*beat" | grep -v grep || echo -e "${RED}No beat processes found${NC}"
    fi
else
    echo -e "${RED}✗ Failed to start Celery Beat${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ Celery services started successfully!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Worker PID: $(cat ${LOG_DIR}/celery_worker.pid)"
echo -e "Beat PID:  $(cat ${LOG_DIR}/celery_beat.pid)"
echo ""
echo -e "${YELLOW}To view logs:${NC}"
echo -e "  ${BLUE}tail -f $WORKER_LOG${NC}"
echo -e "  ${BLUE}tail -f $BEAT_LOG${NC}"
echo ""
echo -e "${YELLOW}To stop services:${NC}"
echo -e "  ${BLUE}./stop-celery.sh${NC}"
echo ""
echo -e "${YELLOW}Next scheduled task:${NC}"
echo -e "  ${GREEN}Weekly summary generation: Every Monday at 5:00 AM (Beijing Time)${NC}"
echo ""
