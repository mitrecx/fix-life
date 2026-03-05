#!/bin/bash
# View Celery Worker and Beat logs

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="${SCRIPT_DIR}/logs"

# Color output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Celery Logs Viewer${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ ! -d "$LOG_DIR" ]; then
    echo -e "${YELLOW}Log directory not found: ${LOG_DIR}${NC}"
    exit 1
fi

# Menu for selecting which log to view
echo -e "${YELLOW}Select log to view:${NC}"
echo -e "  ${GREEN}1)${NC} Celery Worker log"
echo -e "  ${GREEN}2)${NC} Celery Beat log"
echo -e "  ${GREEN}3)${NC} Both logs (tail -f)"
echo -e "  ${GREEN}4)${NC} Recent Worker log (last 50 lines)"
echo -e "  ${GREEN}5)${NC} Recent Beat log (last 50 lines)"
echo ""
read -p "Enter choice (1-5): " choice

case $choice in
  1)
    echo -e "${BLUE}Following Worker log (Ctrl+C to exit)...${NC}"
    tail -f "$LOG_DIR/celery_worker.log"
    ;;
  2)
    echo -e "${BLUE}Following Beat log (Ctrl+C to exit)...${NC}"
    tail -f "$LOG_DIR/celery_beat.log"
    ;;
  3)
    echo -e "${BLUE}Following both logs (Ctrl+C to exit)...${NC}"
    tail -f "$LOG_DIR/celery_worker.log" "$LOG_DIR/celery_beat.log"
    ;;
  4)
    echo -e "${BLUE}Recent Worker log (last 50 lines):${NC}"
    echo ""
    tail -50 "$LOG_DIR/celery_worker.log"
    ;;
  5)
    echo -e "${BLUE}Recent Beat log (last 50 lines):${NC}"
    echo ""
    tail -50 "$LOG_DIR/celery_beat.log"
    ;;
  *)
    echo -e "${YELLOW}Invalid choice. Showing recent logs...${NC}"
    echo ""
    echo -e "${GREEN}=== Worker Log ===${NC}"
    tail -20 "$LOG_DIR/celery_worker.log" 2>/dev/null || echo "No worker log found"
    echo ""
    echo -e "${GREEN}=== Beat Log ===${NC}"
    tail -20 "$LOG_DIR/celery_beat.log" 2>/dev/null || echo "No beat log found"
    ;;
esac
