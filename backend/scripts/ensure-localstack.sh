#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

cd "$BACKEND_DIR"

# Set dummy AWS credentials for localstack
export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-test}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-test}"
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-local}"

# Check if localstack is running
if curl -s http://localhost:4566 > /dev/null 2>&1; then
  echo "✅ localstack is running"
else
  echo "🐳 localstack is not running — starting..."
  docker run -d --name lms-localstack -p 4566:4566 \
    -e SERVICES=dynamodb,events,lambda,apigateway,sqs,sns \
    -e DEBUG=0 \
    localstack/localstack:3.8 2>/dev/null || true

  echo "⏳ Waiting for localstack to be ready..."
  for i in $(seq 1 30); do
    if aws dynamodb list-tables --endpoint-url http://localhost:4566 --region local 2>/dev/null; then
      break
    fi
    sleep 1
  done
  echo "✅ localstack is ready"
fi

# Ensure LMS table exists
if aws dynamodb describe-table --endpoint-url http://localhost:4566 --region local --table-name LMS 2>/dev/null; then
  echo "✅ LMS table exists"
else
  echo "📦 Creating LMS table..."
  "$SCRIPT_DIR/setup-local.sh"
fi
