#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

cd "$BACKEND_DIR"

# Check if localstack is running
if curl -s http://localhost:4566 > /dev/null 2>&1; then
  echo "✅ localstack is running"
else
  echo "🐳 localstack is not running — starting..."
  docker-compose up -d

  echo "⏳ Waiting for localstack to be ready..."
  until aws dynamodb list-tables --endpoint-url http://localhost:4566 --region local --no-cli-pager 2>/dev/null; do
    sleep 1
  done
  echo "✅ localstack is ready"
fi

# Ensure LMS table exists
if aws dynamodb describe-table --endpoint-url http://localhost:4566 --region local --table-name LMS --no-cli-pager 2>/dev/null; then
  echo "✅ LMS table exists"
else
  echo "📦 Creating LMS table..."
  "$SCRIPT_DIR/setup-local.sh"
fi
