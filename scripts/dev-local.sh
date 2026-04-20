#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$ROOT_DIR/backend"

# ─── Tracks child PIDs so Ctrl-C tears everything down ───
PIDS=()

cleanup() {
  echo ""
  echo "🛑 Shutting down..."
  for pid in "${PIDS[@]+"${PIDS[@]}"}"; do
    kill "$pid" 2>/dev/null && echo "   Stopped PID $pid"
  done
  cd "$BACKEND_DIR" && docker-compose down 2>/dev/null && echo "   Stopped DynamoDB Local"
  exit 0
}
trap cleanup SIGINT SIGTERM

# ─── Usage ───
usage() {
  cat <<EOF
Usage: $(basename "$0") <platform>

Platforms:
  ios       Run Expo on iOS Simulator
  android   Run Expo on Android Emulator
  web       Run Expo for web
  all       Start backend only (run Expo yourself)

Starts the full Docker backend stack (DynamoDB Local + SAM API)
then launches the Expo app pointed at the local API.
EOF
  exit 1
}

PLATFORM="${1:-}"
if [[ -z "$PLATFORM" ]]; then
  usage
fi

# ─── Preflight checks ───
echo "🔍 Preflight checks..."

for cmd in docker aws sam; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "   ❌ $cmd is not installed. See README for prerequisites."
    exit 1
  fi
done

DOCKER_OK=false
docker info &>/dev/null &
DPID=$!
for i in $(seq 1 5); do
  if ! kill -0 "$DPID" 2>/dev/null; then
    wait "$DPID" 2>/dev/null && DOCKER_OK=true
    break
  fi
  sleep 1
done
kill "$DPID" 2>/dev/null || true

if [[ "$DOCKER_OK" != "true" ]]; then
  echo "   ⏳ Docker daemon not running — starting Docker Desktop..."
  open -a Docker
  for i in $(seq 1 60); do
    if docker info &>/dev/null; then
      DOCKER_OK=true
      break
    fi
    sleep 2
  done
  if [[ "$DOCKER_OK" != "true" ]]; then
    echo "   ❌ Docker Desktop failed to start after 120s. Start it manually and try again."
    exit 1
  fi
  echo "   ✅ Docker Desktop started"
fi

echo "   ✅ All prerequisites found"
echo ""

echo "╔══════════════════════════════════════════════╗"
echo "║   🏈 LMS Full-Stack Local Dev               ║"
echo "║   Platform: $PLATFORM                              ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ──────────────────────────────────────────────
# 1. DynamoDB Local
# ──────────────────────────────────────────────
echo "🐳 [1/4] Starting DynamoDB Local..."
cd "$BACKEND_DIR"
docker-compose up -d

echo "   Waiting for DynamoDB Local..."
for i in $(seq 1 30); do
  if aws dynamodb list-tables --endpoint-url http://localhost:8000 --region local --no-cli-pager 2>/dev/null | grep -q "TableNames"; then
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "   ❌ DynamoDB Local failed to start after 30s"
    exit 1
  fi
  sleep 1
done
echo "   ✅ DynamoDB Local running on http://localhost:8000"

# ──────────────────────────────────────────────
# 2. Create table + seed
# ──────────────────────────────────────────────
echo ""
echo "📦 [2/4] Setting up database..."
aws dynamodb create-table \
  --endpoint-url http://localhost:8000 \
  --region local \
  --table-name LMS \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
    AttributeName=GSI1PK,AttributeType=S \
    AttributeName=GSI2PK,AttributeType=S \
    AttributeName=GSI2SK,AttributeType=S \
  --key-schema \
    AttributeName=PK,KeyType=HASH \
    AttributeName=SK,KeyType=RANGE \
  --global-secondary-indexes \
    '[
      {"IndexName":"GSI1","KeySchema":[{"AttributeName":"GSI1PK","KeyType":"HASH"}],"Projection":{"ProjectionType":"ALL"}},
      {"IndexName":"GSI2","KeySchema":[{"AttributeName":"GSI2PK","KeyType":"HASH"},{"AttributeName":"GSI2SK","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}
    ]' \
  --billing-mode PAY_PER_REQUEST \
  --no-cli-pager 2>/dev/null && echo "   ✅ LMS table created" || echo "   ℹ️  LMS table already exists"

echo "   Seeding sample data..."
"$BACKEND_DIR/scripts/seed-data.sh" 2>/dev/null
echo "   ✅ Sample data seeded"

# ──────────────────────────────────────────────
# 3. SAM Local API
# ──────────────────────────────────────────────
echo ""
echo "🚀 [3/4] Starting SAM local API on :3000..."
cd "$BACKEND_DIR"
sam build --quiet 2>&1 | sed 's/^/   [SAM Build] /'
sam local start-api \
  --docker-network lms-net \
  --env-vars env.local.json \
  --warm-containers EAGER \
  --port 3000 \
  2>&1 | sed 's/^/   [SAM] /' &
PIDS+=($!)

echo "   Waiting for SAM API to be ready..."
for i in $(seq 1 60); do
  if curl -sf http://localhost:3000/users/user-alice >/dev/null 2>&1; then
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo "   ⚠️  SAM API not responding yet — it may still be cold-starting."
    echo "   Continuing anyway; first request will trigger container spin-up."
    break
  fi
  sleep 2
done
echo "   ✅ SAM local API on http://localhost:3000"

# ──────────────────────────────────────────────
# 4. Expo app
# ──────────────────────────────────────────────
echo ""
echo "📱 [4/4] Starting Expo app (${PLATFORM})..."
cd "$ROOT_DIR"

export EXPO_PUBLIC_API_URL="http://localhost:3000"

case "$PLATFORM" in
  ios)
    npx expo run:ios 2>&1 | sed 's/^/   [Expo] /' &
    PIDS+=($!)
    ;;
  android)
    npx expo run:android 2>&1 | sed 's/^/   [Expo] /' &
    PIDS+=($!)
    ;;
  web)
    npx expo start --web 2>&1 | sed 's/^/   [Expo] /' &
    PIDS+=($!)
    ;;
  all)
    echo "   Backend-only mode. Run Expo yourself:"
    echo "   EXPO_PUBLIC_API_URL=http://localhost:3000 npx expo start"
    ;;
  *)
    echo "   ❌ Unknown platform: $PLATFORM"
    usage
    ;;
esac

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   ✅ All services running!                   ║"
echo "║                                              ║"
echo "║   DynamoDB Local : http://localhost:8000      ║"
echo "║   SAM API        : http://localhost:3000      ║"
echo "║   Platform       : $PLATFORM                        ║"
echo "║                                              ║"
echo "║   Press Ctrl+C to stop all services           ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

wait
