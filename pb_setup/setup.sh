#!/usr/bin/env bash
# Run once after first `docker compose up` to provision the admin account
# and create the files collection. Idempotent — safe to re-run.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"

if [ -f "$ENV_FILE" ]; then
  export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

PB_URL="${PB_URL:-http://localhost:8090}"

echo "Waiting for PocketBase at $PB_URL ..."
until curl -sf "$PB_URL/api/health" > /dev/null 2>&1; do
  sleep 2
done
echo "PocketBase is up."

# ── Create first superuser (bootstrap — only works when none exist) ──────────
echo "Creating admin account..."
HTTP_CODE=$(curl -s -o /tmp/pb_admin.json -w "%{http_code}" \
  -X POST "$PB_URL/api/collections/_superusers/records" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$PB_ADMIN_EMAIL\",\"password\":\"$PB_ADMIN_PASSWORD\",\"passwordConfirm\":\"$PB_ADMIN_PASSWORD\"}")

if [ "$HTTP_CODE" = "200" ]; then
  echo "Admin account created."
elif [ "$HTTP_CODE" = "400" ]; then
  echo "Admin already exists — skipping."
else
  echo "Unexpected response $HTTP_CODE when creating admin:"
  cat /tmp/pb_admin.json
  echo ""
fi

# ── Authenticate ─────────────────────────────────────────────────────────────
echo "Authenticating..."
AUTH_RESPONSE=$(curl -s -X POST "$PB_URL/api/collections/_superusers/auth-with-password" \
  -H "Content-Type: application/json" \
  -d "{\"identity\":\"$PB_ADMIN_EMAIL\",\"password\":\"$PB_ADMIN_PASSWORD\"}")

TOKEN=$(echo "$AUTH_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('token',''))" 2>/dev/null || true)

if [ -z "$TOKEN" ]; then
  echo "Error: Failed to authenticate. Check PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD in .env"
  echo "Response: $AUTH_RESPONSE"
  exit 1
fi
echo "Authenticated."

# ── Create files collection ───────────────────────────────────────────────────
echo "Creating 'files' collection..."
HTTP_CODE=$(curl -s -o /tmp/pb_collection.json -w "%{http_code}" \
  -X POST "$PB_URL/api/collections" \
  -H "Content-Type: application/json" \
  -H "Authorization: $TOKEN" \
  -d "{
    \"name\": \"files\",
    \"type\": \"base\",
    \"listRule\": \"@request.auth.id = owner.id\",
    \"viewRule\": \"@request.auth.id = owner.id\",
    \"createRule\": \"@request.auth.id != ''\",
    \"updateRule\": null,
    \"deleteRule\": \"@request.auth.id = owner.id\",
    \"fields\": [
      {
        \"type\": \"file\",
        \"name\": \"file\",
        \"required\": true,
        \"maxSelect\": 1,
        \"maxSize\": $MAX_FILE_SIZE_BYTES,
        \"protected\": false
      },
      {
        \"type\": \"relation\",
        \"name\": \"owner\",
        \"required\": true,
        \"collectionId\": \"_pb_users_auth_\",
        \"cascadeDelete\": true,
        \"maxSelect\": 1
      },
      {
        \"type\": \"number\",
        \"name\": \"file_size\",
        \"required\": false
      },
      {
        \"type\": \"text\",
        \"name\": \"file_name\",
        \"required\": false
      }
    ]
  }")

if [ "$HTTP_CODE" = "200" ]; then
  echo "Files collection created."
elif [ "$HTTP_CODE" = "400" ]; then
  echo "Files collection may already exist:"
  cat /tmp/pb_collection.json
  echo ""
else
  echo "Error $HTTP_CODE creating collection:"
  cat /tmp/pb_collection.json
  echo ""
  exit 1
fi

echo ""
echo "Setup complete!"
echo "  Admin UI: $PB_URL/_/"
echo "  Admin email: $PB_ADMIN_EMAIL"
