#!/usr/bin/env bash
set -euo pipefail

ENDPOINT="http://localhost:8000"
REGION="local"
TABLE="LMS"

echo "🗑️  Deleting LMS table..."
aws dynamodb delete-table \
  --endpoint-url "$ENDPOINT" \
  --region "$REGION" \
  --table-name "$TABLE" \
  --no-cli-pager 2>/dev/null || echo "  (table did not exist)"

echo "⏳ Waiting for table deletion..."
sleep 2

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
"$SCRIPT_DIR/setup-local.sh"
