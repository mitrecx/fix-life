#!/bin/bash
# Celery Worker and Beat management script for Fix Life
# Usage: ./celery.sh {start|stop|restart|status|logs}

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Log directory
LOG_DIR="${SCRIPT_DIR}/logs"
mkdir -p "$LOG_DIR"
WORKER_LOG="${LOG_DIR}/celery_worker.log"
BEAT_LOG="${LOG_DIR}/celery_beat.log"

# Activate virtual environment if it exists
activate_venv() {
    if [ -f ".venv/bin/activate" ]; then
        echo -e "${YELLOW}Activating virtual environment...${NC}"
        source .venv/bin/activate
    elif [ -f "venv/bin/activate" ]; then
        echo -e "${YELLOW}Activating virtual environment...${NC}"
        source venv/bin/activate
    fi
}

# Check Redis connection
check_redis() {
    echo -e "${YELLOW}Checking Redis connection...${NC}"
    if redis-cli -h ${REDIS_HOST:-localhost} -p ${REDIS_PORT:-6379} ping > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Redis is running${NC}"
    else
        echo -e "${RED}✗ Redis is not running${NC}"
        echo -e "${RED}Please start Redis first:${NC}"
        echo -e "  ${YELLOW}redis-server${NC} or ${YELLOW}sudo systemctl start redis${NC}"
        exit 1
    fi
}

# Stop Celery services
stop_services() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  Stopping Celery Services${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""

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
    echo -e "${GREEN}✓ All Celery services stopped${NC}"
}

# Start Celery services
start_services() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  Fix Life Celery Services${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""

    check_redis
    activate_venv

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
    echo -e "Worker PID: $(cat ${LOG_DIR}/celery_worker.pid 2>/dev/null || echo 'N/A')"
    echo -e "Beat PID:  $(cat ${LOG_DIR}/celery_beat.pid 2>/dev/null || echo 'N/A')"
    echo ""
    echo -e "${YELLOW}Next scheduled task:${NC}"
    echo -e "  ${GREEN}Weekly summary generation: Every Monday at 5:00 AM (Beijing Time)${NC}"
    echo ""
    echo -e "${YELLOW}Useful commands:${NC}"
    echo -e "  ${BLUE}./celery.sh logs${NC} - View logs"
    echo -e "  ${BLUE}./celery.sh status${NC} - Check status"
    echo -e "  ${BLUE}./celery.sh stop${NC} - Stop services"
    echo ""
}

# Show service status
show_status() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  Celery Services Status${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""

    # Check Worker
    if [ -f "${LOG_DIR}/celery_worker.pid" ]; then
        WORKER_PID=$(cat "${LOG_DIR}/celery_worker.pid")
        if ps -p $WORKER_PID > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Celery Worker${NC} is running (PID: $WORKER_PID)"
        else
            echo -e "${RED}✗ Celery Worker${NC} is not running (stale PID file)"
        fi
    else
        # Check for worker processes
        WORKER_PIDS=$(ps aux | grep "celery.*worker" | grep -v grep | awk '{print $2}')
        if [ -n "$WORKER_PIDS" ]; then
            echo -e "${YELLOW}⚠ Celery Worker${NC} running without PID file (PIDs: $WORKER_PIDS)"
        else
            echo -e "${RED}✗ Celery Worker${NC} is not running"
        fi
    fi

    # Check Beat
    if [ -f "${LOG_DIR}/celery_beat.pid" ]; then
        BEAT_PID=$(cat "${LOG_DIR}/celery_beat.pid")
        if ps -p $BEAT_PID > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Celery Beat${NC} is running (PID: $BEAT_PID)"
        else
            echo -e "${RED}✗ Celery Beat${NC} is not running (stale PID file)"
        fi
    else
        # Check for beat processes
        BEAT_PIDS=$(ps aux | grep "celery.*beat" | grep -v grep | awk '{print $2}')
        if [ -n "$BEAT_PIDS" ]; then
            echo -e "${YELLOW}⚠ Celery Beat${NC} running without PID file (PIDs: $BEAT_PIDS)"
        else
            echo -e "${RED}✗ Celery Beat${NC} is not running"
        fi
    fi

    # Check Redis
    echo ""
    if redis-cli -h ${REDIS_HOST:-localhost} -p ${REDIS_PORT:-6379} ping > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Redis${NC} is running"
    else
        echo -e "${RED}✗ Redis${NC} is not running"
    fi

    echo ""
}

# View logs
view_logs() {
    if [ ! -d "$LOG_DIR" ]; then
        echo -e "${RED}Log directory not found: ${LOG_DIR}${NC}"
        exit 1
    fi

    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  Celery Logs Viewer${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    echo -e "${YELLOW}Select log to view:${NC}"
    echo -e "  ${GREEN}1)${NC} Celery Worker log (tail -f)"
    echo -e "  ${GREEN}2)${NC} Celery Beat log (tail -f)"
    echo -e "  ${GREEN}3)${NC} Both logs (tail -f)"
    echo -e "  ${GREEN}4)${NC} Recent Worker log (last 50 lines)"
    echo -e "  ${GREEN}5)${NC} Recent Beat log (last 50 lines)"
    echo ""
    read -p "Enter choice (1-5, default=1): " choice
    choice=${choice:-1}

    case $choice in
      1)
        echo -e "${BLUE}Following Worker log (Ctrl+C to exit)...${NC}"
        tail -f "$WORKER_LOG"
        ;;
      2)
        echo -e "${BLUE}Following Beat log (Ctrl+C to exit)...${NC}"
        tail -f "$BEAT_LOG"
        ;;
      3)
        echo -e "${BLUE}Following both logs (Ctrl+C to exit)...${NC}"
        tail -f "$WORKER_LOG" "$BEAT_LOG"
        ;;
      4)
        echo -e "${BLUE}Recent Worker log (last 50 lines):${NC}"
        echo ""
        tail -50 "$WORKER_LOG" 2>/dev/null || echo "No worker log found"
        ;;
      5)
        echo -e "${BLUE}Recent Beat log (last 50 lines):${NC}"
        echo ""
        tail -50 "$BEAT_LOG" 2>/dev/null || echo "No beat log found"
        ;;
      *)
        echo -e "${YELLOW}Invalid choice. Showing recent logs...${NC}"
        echo ""
        echo -e "${GREEN}=== Worker Log (last 20 lines) ===${NC}"
        tail -20 "$WORKER_LOG" 2>/dev/null || echo "No worker log found"
        echo ""
        echo -e "${GREEN}=== Beat Log (last 20 lines) ===${NC}"
        tail -20 "$BEAT_LOG" 2>/dev/null || echo "No beat log found"
        ;;
    esac
}

# Show usage
show_usage() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  Celery Management Script${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    echo -e "Usage: ${YELLOW}./celery.sh${NC} ${GREEN}{command}${NC}"
    echo ""
    echo -e "${GREEN}Commands:${NC}"
    echo -e "  ${GREEN}start${NC}     - Start Celery Worker and Beat services"
    echo -e "  ${GREEN}stop${NC}      - Stop Celery Worker and Beat services"
    echo -e "  ${GREEN}restart${NC}   - Restart Celery Worker and Beat services"
    echo -e "  ${GREEN}status${NC}    - Show status of Celery services"
    echo -e "  ${GREEN}logs${NC}      - View Celery logs (interactive menu)"
    echo ""
    echo -e "${GREEN}Examples:${NC}"
    echo -e "  ${YELLOW}./celery.sh start${NC}"
    echo -e "  ${YELLOW}./celery.sh stop${NC}"
    echo -e "  ${YELLOW}./celery.sh restart${NC}"
    echo -e "  ${YELLOW}./celery.sh status${NC}"
    echo -e "  ${YELLOW}./celery.sh logs${NC}"
    echo ""
}

# Main command router
case "${1:-}" in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        stop_services
        echo ""
        start_services
        ;;
    status)
        show_status
        ;;
    logs)
        view_logs
        ;;
    *)
        show_usage
        exit 1
        ;;
esac
