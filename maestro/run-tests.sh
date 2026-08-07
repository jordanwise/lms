#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LMS_DIR="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$LMS_DIR/backend"

echo "🏗️  LMS Maestro UI Test Runner"
echo "=============================="

echo ""
echo "📦 [1/3] Starting localstack..."
cd "$BACKEND_DIR"
if ! docker ps --format '{{.Names}}' | grep -q lms-localstack; then
  docker-compose up -d
  echo "   Waiting for localstack..."
  sleep 10
fi

echo ""
echo "🌱 [2/3] Setting up database..."
npm run local:setup 2>/dev/null || true
npm run local:seed 2>/dev/null || true

echo ""
echo "🧪 [3/3] Running Maestro UI tests..."
cd "$SCRIPT_DIR"

for flow in flows/*.yaml; do
  if [ -f "$flow" ]; then
    echo ""
    echo "▶️  Running: $(basename "$flow")"
    maestro test "$flow"
  fi
done

echo ""
echo "✅ All Maestro UI tests passed!"
