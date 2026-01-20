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

echo "=========================================="
echo "Fix Life Deployment Script"
echo "Server: ${SERVER_HOST}"
echo "=========================================="

# Parse arguments
COMMAND=${1:-"deploy"}

case $COMMAND in
  "init")
    echo "Initializing server..."
    ssh $SERVER "sudo mkdir -p $DEPLOY_PATH && sudo chown \$USER:\$USER $DEPLOY_PATH"
    ssh $SERVER "mkdir -p ${BACKEND_DEPLOY_PATH} ${FRONTEND_DEPLOY_PATH}"
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
      "${BACKEND_LOCAL}/" "${SERVER}:${BACKEND_DEPLOY_PATH}/"

    # Deploy frontend to server
    echo "Uploading frontend to ${SERVER}..."
    rsync -avz --delete \
      "${FRONTEND_LOCAL}/dist/" "${SERVER}:${FRONTEND_DEPLOY_PATH}/"

    # Setup backend
    echo "Setting up backend..."
    ssh $SERVER << ENDSSH
      cd ${BACKEND_DEPLOY_PATH}

      # Create virtual environment if not exists
      if [ ! -d "venv" ]; then
        echo "Creating virtual environment..."
        python3 -m venv venv
      fi

      # Activate venv and install dependencies
      echo "Installing dependencies..."
      source venv/bin/activate
      pip install --upgrade pip
      pip install -r requirements.txt

      # Run migrations
      echo "Running database migrations..."
      alembic upgrade head
ENDSSH

    # Restart backend service
    echo "Restarting backend service..."
    ssh $SERVER "sudo systemctl restart ${BACKEND_SERVICE_NAME}"

    echo "Deployment complete!"
    echo "Access your app at: https://fixlife.mitrecx.top"
    ;;

  "restart")
    echo "Restarting services..."
    ssh $SERVER "sudo systemctl restart ${BACKEND_SERVICE_NAME}"
    echo "Backend service restarted"
    ;;

  "status")
    echo "Checking service status..."
    ssh $SERVER "systemctl status ${BACKEND_SERVICE_NAME}"
    ;;

  "logs")
    echo "Following backend logs (Ctrl+C to exit)..."
    ssh $SERVER "journalctl -u ${BACKEND_SERVICE_NAME} -f"
    ;;

  "stop")
    echo "Stopping services..."
    ssh $SERVER "sudo systemctl stop ${BACKEND_SERVICE_NAME}"
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
      "${BACKEND_LOCAL}/" "${SERVER}:${BACKEND_DEPLOY_PATH}/"

    ssh $SERVER << ENDSSH
      cd ${BACKEND_DEPLOY_PATH}
      source venv/bin/activate
      pip install -r requirements.txt
      alembic upgrade head
ENDSSH

    ssh $SERVER "sudo systemctl restart ${BACKEND_SERVICE_NAME}"
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
