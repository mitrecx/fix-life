#!/bin/bash
# Deployment script for Fix Life application

set -e

# =============================================================================
# Configuration
# =============================================================================

# Server connection details
SERVER_USER="josie"
SERVER_HOST="jo.mitrecx.top"
SERVER="${SERVER_USER}@${SERVER_HOST}"
# SSH/rsync: avoid interactive host-key prompts; fail fast on bad keys (BatchMode)
DEPLOY_SSH_OPTS="-o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=20"
export RSYNC_RSH="ssh ${DEPLOY_SSH_OPTS}"

# Deployment paths
DEPLOY_PATH="/opt/fix-life"
BACKEND_DEPLOY_PATH="${DEPLOY_PATH}/backend"
FRONTEND_DEPLOY_PATH="${DEPLOY_PATH}/frontend/dist"

# Service names
BACKEND_SERVICE_NAME="fix-life-backend"
FRONTEND_SERVICE_NAME="fix-life-frontend"

# Local paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_LOCAL="${SCRIPT_DIR}/backend"
FRONTEND_LOCAL="${SCRIPT_DIR}/frontend"

# Install/update Celery systemd units from deploy/*.service, enable, and restart.
# First run: if units were not loaded yet, stops legacy ./celery.sh processes only.
sync_celery_systemd_units_and_restart() {
  echo "Syncing Celery systemd units (fix-life-celery-worker / fix-life-celery-beat)..."
  rsync -avz \
    "${SCRIPT_DIR}/deploy/fix-life-celery-worker.service" \
    "${SCRIPT_DIR}/deploy/fix-life-celery-beat.service" \
    "${SERVER}:/tmp/"
  ssh ${DEPLOY_SSH_OPTS} $SERVER env BACKEND_DEPLOY_PATH="${BACKEND_DEPLOY_PATH}" bash -s <<'ENDSSH'
set -e
W=$(systemctl show -p LoadState --value fix-life-celery-worker.service 2>/dev/null || echo "not-found")
if [ "$W" != "loaded" ]; then
  echo "  → Stopping legacy Celery (celery.sh) before systemd takeover..."
  cd "$BACKEND_DEPLOY_PATH"
  if [ -x ./celery.sh ]; then
    ./celery.sh stop || true
  fi
fi
sudo cp /tmp/fix-life-celery-worker.service /tmp/fix-life-celery-beat.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable fix-life-celery-worker fix-life-celery-beat
sudo systemctl restart fix-life-celery-worker fix-life-celery-beat
ENDSSH
}

restart_celery_systemd_services() {
  echo "Restarting Celery (systemd)..."
  ssh ${DEPLOY_SSH_OPTS} $SERVER "sudo systemctl restart fix-life-celery-worker fix-life-celery-beat"
}

echo "=========================================="
echo "Fix Life Deployment Script"
echo "Server: ${SERVER_HOST}"
echo "=========================================="

# Parse arguments
COMMAND=${1:-"deploy"}

case $COMMAND in
  "init")
    echo "Initializing server..."
    ssh ${DEPLOY_SSH_OPTS} $SERVER "sudo mkdir -p $DEPLOY_PATH && sudo chown \$USER:\$USER $DEPLOY_PATH"
    ssh ${DEPLOY_SSH_OPTS} $SERVER "mkdir -p ${BACKEND_DEPLOY_PATH} ${FRONTEND_DEPLOY_PATH}"
    echo "Server initialized at ${DEPLOY_PATH}"
    ;;

  "deploy")
    echo "Starting deployment..."

    # Build frontend locally
    echo "Building frontend..."
    cd "${FRONTEND_LOCAL}"
    npm run build
    cd "${SCRIPT_DIR}"

    # Deploy backend to server
    echo "Uploading backend to ${SERVER}..."
    rsync -avz --delete \
      --exclude 'venv' \
      --exclude '.venv' \
      --exclude '__pycache__' \
      --exclude '*.pyc' \
      --exclude '.pytest_cache' \
      --exclude 'logs' \
      --exclude '*.log' \
      --exclude '.env.local' \
      "${BACKEND_LOCAL}/" "${SERVER}:${BACKEND_DEPLOY_PATH}/"

    # Deploy frontend to server
    echo "Uploading frontend to ${SERVER}..."
    rsync -avz --delete \
      "${FRONTEND_LOCAL}/dist/" "${SERVER}:${FRONTEND_DEPLOY_PATH}/"

    # Setup backend
    echo "Setting up backend environment..."
    ssh ${DEPLOY_SSH_OPTS} $SERVER "bash -lc '
      cd ${BACKEND_DEPLOY_PATH}
      # Check if uv is installed, if not, install it
      if ! command -v uv &> /dev/null; then
        echo \"Installing uv...\"
        curl -LsSf https://astral.sh/uv/install.sh | sh
        export PATH=\"$HOME/.local/bin:$PATH\"
      fi
      # Remove old venv if it exists
      rm -rf venv
      # Sync dependencies using uv (creates .venv if needed)
      uv sync
      alembic upgrade head
    '"

    # Restart backend service
    echo "Restarting backend service..."
    ssh ${DEPLOY_SSH_OPTS} $SERVER "sudo systemctl restart ${BACKEND_SERVICE_NAME}"

    sync_celery_systemd_units_and_restart

    echo "Deployment complete!"
    echo "Access your app at: https://fixlife.mitrecx.top"
    ;;

  "restart")
    echo "Restarting services..."
    ssh ${DEPLOY_SSH_OPTS} $SERVER "sudo systemctl restart ${BACKEND_SERVICE_NAME}"
    restart_celery_systemd_services
    echo "Backend and Celery (systemd) restarted."
    ;;

  "status")
    echo "Checking service status..."
    ssh ${DEPLOY_SSH_OPTS} $SERVER "systemctl status ${BACKEND_SERVICE_NAME} fix-life-celery-worker fix-life-celery-beat --no-pager"
    ;;

  "logs")
    echo "Following backend logs (Ctrl+C to exit)..."
    ssh ${DEPLOY_SSH_OPTS} $SERVER "journalctl -u ${BACKEND_SERVICE_NAME} -f"
    ;;

  "stop")
    echo "Stopping services..."
    ssh ${DEPLOY_SSH_OPTS} $SERVER "sudo systemctl stop ${BACKEND_SERVICE_NAME}"
    echo "Backend service stopped"
    ;;

  "backend")
    echo "Deploying backend only..."
    rsync -avz --delete \
      --exclude 'venv' \
      --exclude '.venv' \
      --exclude '__pycache__' \
      --exclude '*.pyc' \
      --exclude '.pytest_cache' \
      --exclude 'logs' \
      --exclude '*.log' \
      --exclude '.env.local' \
      "${BACKEND_LOCAL}/" "${SERVER}:${BACKEND_DEPLOY_PATH}/"

    echo "Setting up backend environment..."
    ssh ${DEPLOY_SSH_OPTS} $SERVER "bash -lc '
      cd ${BACKEND_DEPLOY_PATH}
      # Check if uv is installed, if not, install it
      if ! command -v uv &> /dev/null; then
        echo \"Installing uv...\"
        curl -LsSf https://astral.sh/uv/install.sh | sh
        export PATH=\"$HOME/.local/bin:$PATH\"
      fi
      # Remove old venv if it exists
      rm -rf venv
      # Sync dependencies using uv (creates .venv if needed)
      uv sync
      alembic upgrade head
    '"

    ssh ${DEPLOY_SSH_OPTS} $SERVER "sudo systemctl restart ${BACKEND_SERVICE_NAME}"
    sync_celery_systemd_units_and_restart
    echo "Backend deployment complete!"
    ;;

  "frontend")
    echo "Deploying frontend only..."
    cd "${FRONTEND_LOCAL}"
    npm run build
    cd "${SCRIPT_DIR}"

    rsync -avz --delete \
      "${FRONTEND_LOCAL}/dist/" "${SERVER}:${FRONTEND_DEPLOY_PATH}/"
    echo "Frontend deployment complete!"
    ;;

  *)
    echo "Usage: $0 {init|deploy|backend|frontend|restart|status|logs|stop}"
    exit 1
    ;;
esac
