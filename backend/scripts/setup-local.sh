#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

cd "$BACKEND_DIR"

# Set dummy AWS credentials for localstack
export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-test}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-test}"
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-local}"

echo "🐳 Starting localstack..."
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

echo "📦 Creating LMS table..."
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
      {
        "IndexName": "GSI1",
        "KeySchema": [{"AttributeName":"GSI1PK","KeyType":"HASH"}],
        "Projection": {"ProjectionType":"ALL"}
      },
      {
        "IndexName": "GSI2",
        "KeySchema": [{"AttributeName":"GSI2PK","KeyType":"HASH"},{"AttributeName":"GSI2SK","KeyType":"RANGE"}],
        "Projection": {"ProjectionType":"ALL"}
      }
    ]' \
  --billing-mode PAY_PER_REQUEST 2>/dev/null || echo "  (table may already exist)"

echo "🌱 Seeding sample data..."
"$SCRIPT_DIR/seed-data.sh"

echo ""
echo "✅ Local setup complete!"
echo "   localstack: http://localhost:4566"
echo ""
echo "   Next steps:"
echo "   npm run local:api    # Start SAM local API"
