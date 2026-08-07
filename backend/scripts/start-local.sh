#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
LMS_DIR="$(dirname "$BACKEND_DIR")"
DOJO_DIR="$LMS_DIR/dojo"

API_PID=""
DOJO_PID=""

cleanup() {
  echo ""
  echo "🛑 Shutting down..."
  [[ -n "$DOJO_PID" ]] && kill "$DOJO_PID" 2>/dev/null && echo "   Stopped dojo dev server"
  [[ -n "$API_PID" ]] && kill "$API_PID" 2>/dev/null && echo "   Stopped API server"
  exit 0
}
trap cleanup SIGINT SIGTERM

echo "╔══════════════════════════════════════════╗"
echo "║   🏈 LMS Local Development Environment   ║"
echo "╚══════════════════════════════════════════╝"
echo ""

if [[ "${1:-}" == "--full" ]]; then
  # ─── Full stack: Docker + localstack + SAM + Dojo ───
  echo "🐳 Starting full stack (Docker + localstack + SAM)..."
  echo ""

  echo "🐳 [1/4] Starting localstack..."
  cd "$BACKEND_DIR"
  docker-compose up -d

  echo "   Waiting for localstack to be ready..."
  for i in $(seq 1 60); do
    if aws dynamodb list-tables --endpoint-url http://localhost:4566 --region local --no-cli-pager 2>/dev/null | grep -q "TableNames"; then
      break
    fi
    if [ "$i" -eq 60 ]; then
      echo "   ❌ localstack failed to start after 60s"
      exit 1
    fi
    sleep 1
  done
  echo "   ✅ localstack running on http://localhost:4566"

  echo ""
  echo "📦 [2/4] Setting up database..."
  aws dynamodb create-table \
    --endpoint-url http://localhost:4566 \
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
  "$SCRIPT_DIR/seed-data.sh" 2>/dev/null
  echo "   ✅ Sample data seeded"

  echo ""
  echo "🚀 [3/4] Starting SAM local API..."
  cd "$BACKEND_DIR"
  sam local start-api \
    --docker-network lms-net \
    --env-vars env.local.json \
    --warm-containers EAGER \
    --port 3000 \
    2>&1 | sed 's/^/   [SAM] /' &
  API_PID=$!

  echo "   Waiting for SAM API..."
  for i in $(seq 1 60); do
    if curl -s http://localhost:3000/games/game-001 >/dev/null 2>&1; then
      break
    fi
    if ! kill -0 "$API_PID" 2>/dev/null; then
      echo "   ❌ SAM local API failed to start"
      exit 1
    fi
    sleep 2
  done
  echo "   ✅ SAM local API running on http://localhost:3000"

  echo ""
  echo "🥋 [4/4] Starting dojo dev server..."
  cd "$DOJO_DIR"
  npm run dev 2>&1 | sed 's/^/   [Dojo] /' &
  DOJO_PID=$!
  sleep 3
  echo "   ✅ Dojo dev server starting on http://localhost:5173"

  echo ""
  echo "╔══════════════════════════════════════════╗"
  echo "║   ✅ All services running! (full stack)   ║"
  echo "║                                          ║"
  echo "║   localstack      : http://localhost:4566 ║"
  echo "║   SAM API         : http://localhost:3000 ║"
  echo "║   Dojo            : http://localhost:5173 ║"
  echo "║                                          ║"
  echo "║   Press Ctrl+C to stop all services       ║"
  echo "╚══════════════════════════════════════════╝"
  echo ""
  wait
  exit 0
fi

# ─── Default: Lightweight dev-server + dojo (no Docker required) ───
echo "⚡ Lightweight mode (no Docker required)"
echo "   Use --full for Docker + localstack + SAM stack"
echo ""

echo "🚀 [1/2] Starting API dev server..."
cd "$BACKEND_DIR"
npx tsx scripts/dev-server.ts 2>&1 | sed 's/^/   [API] /' &
API_PID=$!
sleep 2

if ! kill -0 "$API_PID" 2>/dev/null; then
  echo "   ❌ Dev server failed to start"
  exit 1
fi
echo "   ✅ API dev server running on http://localhost:3000"

echo ""
echo "🥋 [2/2] Starting dojo dev server..."
cd "$DOJO_DIR"
npm run dev 2>&1 | sed 's/^/   [Dojo] /' &
DOJO_PID=$!
sleep 3
echo "   ✅ Dojo dev server starting on http://localhost:5173"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   ✅ All services running!                ║"
echo "║                                          ║"
echo "║   API (dev)  : http://localhost:3000      ║"
echo "║   Dojo       : http://localhost:5173      ║"
echo "║                                          ║"
echo "║   Press Ctrl+C to stop all services       ║"
echo "╚══════════════════════════════════════════╝"
echo ""

wait
