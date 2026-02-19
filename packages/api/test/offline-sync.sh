#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# XO Companion — Offline Sync / PowerSync Readiness Test
# Tests: PostgreSQL replication, PowerSync JWT, offline queue,
#        conflict resolution, sync status, voice upload-queued
# ─────────────────────────────────────────────────────────────────────
set -uo pipefail

BASE_URL="${API_URL:-http://localhost:3000/api/v1}"
PSQL="$(brew --prefix postgresql@16)/bin/psql"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

PASS=0
FAIL=0
FAILURES=()

# ─── Helpers ─────────────────────────────────────────────────────────

assert() {
  local name="$1"
  local expected_code="$2"
  local jq_check="${3:-true}"

  if [[ "$HTTP_CODE" != "$expected_code" ]]; then
    FAIL=$((FAIL + 1))
    FAILURES+=("$name")
    echo -e "  ${RED}[FAIL]${NC} $name — expected HTTP $expected_code, got $HTTP_CODE"
    echo "         Body: $(echo "$BODY" | head -c 300)"
    return 1
  fi

  if [[ "$jq_check" != "true" ]]; then
    local result
    result=$(echo "$BODY" | jq -r "$jq_check" 2>/dev/null || echo "jq_error")
    if [[ "$result" != "true" ]]; then
      FAIL=$((FAIL + 1))
      FAILURES+=("$name")
      echo -e "  ${RED}[FAIL]${NC} $name — assertion failed: $jq_check → $result"
      echo "         Body: $(echo "$BODY" | head -c 300)"
      return 1
    fi
  fi

  PASS=$((PASS + 1))
  echo -e "  ${GREEN}[PASS]${NC} $name"
  return 0
}

jq_extract() {
  echo "$BODY" | jq -r "$1" 2>/dev/null || echo "null"
}

do_get() {
  local path="$1"
  local token="${2:-}"
  local headers=(-s -w '\n%{http_code}')
  [[ -n "$token" ]] && headers+=(-H "Authorization: Bearer $token")
  local response
  response=$(curl "${headers[@]}" "$BASE_URL$path")
  HTTP_CODE=$(echo "$response" | tail -1)
  BODY=$(echo "$response" | sed '$d')
}

do_post() {
  local path="$1"
  local data="$2"
  local token="${3:-}"
  local headers=(-s -w '\n%{http_code}' -H 'Content-Type: application/json')
  [[ -n "$token" ]] && headers+=(-H "Authorization: Bearer $token")
  local response
  response=$(curl -X POST "${headers[@]}" -d "$data" "$BASE_URL$path")
  HTTP_CODE=$(echo "$response" | tail -1)
  BODY=$(echo "$response" | sed '$d')
}

do_patch() {
  local path="$1"
  local data="$2"
  local token="${3:-}"
  local headers=(-s -w '\n%{http_code}' -H 'Content-Type: application/json')
  [[ -n "$token" ]] && headers+=(-H "Authorization: Bearer $token")
  local response
  response=$(curl -X PATCH "${headers[@]}" -d "$data" "$BASE_URL$path")
  HTTP_CODE=$(echo "$response" | tail -1)
  BODY=$(echo "$response" | sed '$d')
}

do_delete() {
  local path="$1"
  local token="${2:-}"
  local headers=(-s -w '\n%{http_code}')
  [[ -n "$token" ]] && headers+=(-H "Authorization: Bearer $token")
  local response
  response=$(curl -X DELETE "${headers[@]}" "$BASE_URL$path")
  HTTP_CODE=$(echo "$response" | tail -1)
  BODY=$(echo "$response" | sed '$d')
}

# ─────────────────────────────────────────────────────────────────────
echo -e "\n${BOLD}${CYAN}XO Companion — Offline Sync / PowerSync Readiness Test${NC}"
echo -e "${CYAN}Base URL: $BASE_URL${NC}\n"

# ═════════════════════════════════════════════════════════════════════
echo -e "${BOLD}0. Pre-flight${NC}"
# ═════════════════════════════════════════════════════════════════════

do_get "/health"
if [[ "$HTTP_CODE" != "200" ]]; then
  echo -e "  ${RED}API is not running at $BASE_URL${NC}"
  exit 1
fi
echo -e "  ${GREEN}API is running${NC}"

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}1. PostgreSQL Logical Replication${NC}"
# ═════════════════════════════════════════════════════════════════════

WAL_LEVEL=$($PSQL -d xo_companion -t -A -c "SHOW wal_level;" 2>/dev/null)
if [[ "$WAL_LEVEL" == "logical" ]]; then
  PASS=$((PASS + 1))
  echo -e "  ${GREEN}[PASS]${NC} wal_level = logical"
else
  FAIL=$((FAIL + 1))
  FAILURES+=("wal_level check")
  echo -e "  ${RED}[FAIL]${NC} wal_level = '$WAL_LEVEL' (expected 'logical')"
fi

PUB_EXISTS=$($PSQL -d xo_companion -t -A -c "SELECT count(*) FROM pg_publication WHERE pubname = 'powersync_pub';" 2>/dev/null)
if [[ "$PUB_EXISTS" == "1" ]]; then
  PASS=$((PASS + 1))
  echo -e "  ${GREEN}[PASS]${NC} powersync_pub publication exists"
else
  FAIL=$((FAIL + 1))
  FAILURES+=("publication check")
  echo -e "  ${RED}[FAIL]${NC} powersync_pub publication not found"
fi

PUB_TABLES=$($PSQL -d xo_companion -t -A -c "SELECT count(*) FROM pg_publication_tables WHERE pubname = 'powersync_pub';" 2>/dev/null)
if [[ "$PUB_TABLES" -ge 10 ]]; then
  PASS=$((PASS + 1))
  echo -e "  ${GREEN}[PASS]${NC} Publication has $PUB_TABLES tables"
else
  FAIL=$((FAIL + 1))
  FAILURES+=("publication tables count")
  echo -e "  ${RED}[FAIL]${NC} Publication has $PUB_TABLES tables (expected >= 10)"
fi

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}2. Setup — Login${NC}"
# ═════════════════════════════════════════════════════════════════════

do_post "/auth/login" '{"email":"foreman@realelite.com","password":"password123"}'
assert "Login as foreman" "200"
FOREMAN_TOKEN=$(jq_extract '.accessToken')
FOREMAN_ID=$(jq_extract '.user.id')

# Get a project ID
do_get "/projects" "$FOREMAN_TOKEN"
PROJECT_ID=$(echo "$BODY" | jq -r '.[0].id')
echo -e "  ${CYAN}Project: $PROJECT_ID${NC}"

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}3. PowerSync JWT Token${NC}"
# ═════════════════════════════════════════════════════════════════════

do_get "/auth/powersync/token" "$FOREMAN_TOKEN"
assert "GET PowerSync token" "200" '(.token != null and .token != "")'

PS_TOKEN=$(jq_extract '.token')
PS_USER_ID=$(jq_extract '.user_id')
PS_ORG_ID=$(jq_extract '.org_id')

if [[ "$PS_USER_ID" == "$FOREMAN_ID" ]]; then
  PASS=$((PASS + 1))
  echo -e "  ${GREEN}[PASS]${NC} Token contains correct user_id"
else
  FAIL=$((FAIL + 1))
  FAILURES+=("Token user_id")
  echo -e "  ${RED}[FAIL]${NC} Token user_id mismatch: $PS_USER_ID != $FOREMAN_ID"
fi

if [[ -n "$PS_ORG_ID" && "$PS_ORG_ID" != "null" ]]; then
  PASS=$((PASS + 1))
  echo -e "  ${GREEN}[PASS]${NC} Token contains org_id"
else
  FAIL=$((FAIL + 1))
  FAILURES+=("Token org_id")
  echo -e "  ${RED}[FAIL]${NC} Token missing org_id"
fi

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}4. Offline Queue — Create Operations${NC}"
# ═════════════════════════════════════════════════════════════════════

# Use a unique date to avoid conflicts
SYNC_DATE=$(date -v+200d +%Y-%m-%d 2>/dev/null || date -d "+200 days" +%Y-%m-%d)
CLIENT_ID_LOG=$(uuidgen | tr '[:upper:]' '[:lower:]')
CLIENT_ID_WF=$(uuidgen | tr '[:upper:]' '[:lower:]')
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)

do_post "/sync/queue" \
  "{\"operations\":[{\"type\":\"CREATE\",\"table\":\"daily_logs\",\"data\":{\"projectId\":\"$PROJECT_ID\",\"logDate\":\"$SYNC_DATE\",\"notes\":\"Offline sync test log\"},\"clientId\":\"$CLIENT_ID_LOG\",\"timestamp\":\"$NOW\"}]}" \
  "$FOREMAN_TOKEN"
assert "POST sync/queue — create daily log" "200" '(.processed == 1)'

CREATED_STATUS=$(jq_extract '.results[0].status')
CREATED_LOG_ID=$(jq_extract '.results[0].id')
if [[ "$CREATED_STATUS" == "created" ]]; then
  PASS=$((PASS + 1))
  echo -e "  ${GREEN}[PASS]${NC} Daily log created via sync queue (id: $CREATED_LOG_ID)"
else
  FAIL=$((FAIL + 1))
  FAILURES+=("Sync queue create status")
  echo -e "  ${RED}[FAIL]${NC} Expected status 'created', got '$CREATED_STATUS'"
fi

# Verify the record exists via normal API
do_get "/projects/$PROJECT_ID/daily-logs/$CREATED_LOG_ID" "$FOREMAN_TOKEN"
assert "GET created daily log via normal API" "200" '(.notes == "Offline sync test log")'

# Create a workforce entry for that log
do_post "/sync/queue" \
  "{\"operations\":[{\"type\":\"CREATE\",\"table\":\"workforce_entries\",\"data\":{\"dailyLogId\":\"$CREATED_LOG_ID\",\"trade\":\"Electricians\",\"company\":\"Offline Electric Co\",\"workerCount\":4,\"hoursWorked\":8},\"clientId\":\"$CLIENT_ID_WF\",\"timestamp\":\"$NOW\"}]}" \
  "$FOREMAN_TOKEN"
assert "POST sync/queue — create workforce entry" "200" '(.results[0].status == "created")'
WF_ENTRY_ID=$(jq_extract '.results[0].id')

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}5. Offline Queue — Conflict Resolution${NC}"
# ═════════════════════════════════════════════════════════════════════

# First, update via normal API to set a server timestamp
sleep 1
do_patch "/projects/$PROJECT_ID/daily-logs/$CREATED_LOG_ID/workforce/$WF_ENTRY_ID" \
  '{"workerCount":6}' \
  "$FOREMAN_TOKEN"
assert "PATCH workforce entry (server update)" "200" '(.workerCount == 6)'

# Now send an offline update with an OLDER timestamp (should result in conflict)
OLD_TS="2026-01-01T00:00:00Z"
CLIENT_ID_CONFLICT=$(uuidgen | tr '[:upper:]' '[:lower:]')

do_post "/sync/queue" \
  "{\"operations\":[{\"type\":\"UPDATE\",\"table\":\"workforce_entries\",\"id\":\"$WF_ENTRY_ID\",\"data\":{\"workerCount\":3},\"clientId\":\"$CLIENT_ID_CONFLICT\",\"timestamp\":\"$OLD_TS\"}]}" \
  "$FOREMAN_TOKEN"
assert "POST sync/queue — conflict (old timestamp)" "200" '(.results[0].status == "conflict")'

# Verify server value was kept (workerCount should still be 6)
do_get "/projects/$PROJECT_ID/daily-logs/$CREATED_LOG_ID" "$FOREMAN_TOKEN"
WF_COUNT=$(echo "$BODY" | jq '[.workforce[] | select(.id == "'"$WF_ENTRY_ID"'")] | .[0].workerCount' 2>/dev/null)
if [[ "$WF_COUNT" == "6" ]]; then
  PASS=$((PASS + 1))
  echo -e "  ${GREEN}[PASS]${NC} Server value preserved (workerCount=6, not 3)"
else
  FAIL=$((FAIL + 1))
  FAILURES+=("Conflict resolution server-wins")
  echo -e "  ${RED}[FAIL]${NC} Expected workerCount=6, got $WF_COUNT"
fi

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}6. Sync Status${NC}"
# ═════════════════════════════════════════════════════════════════════

do_get "/sync/status" "$FOREMAN_TOKEN"
assert "GET sync/status" "200" '(.conflictCount >= 1)'
echo -e "  ${CYAN}Conflicts: $(jq_extract '.conflictCount'), Pending uploads: $(jq_extract '.pendingUploads')${NC}"

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}7. Voice Upload-Queued (Offline Recording)${NC}"
# ═════════════════════════════════════════════════════════════════════

CLIENT_ID_VOICE=$(uuidgen | tr '[:upper:]' '[:lower:]')
RECORDED_AT="2026-02-19T08:30:00Z"

do_post "/sync/voice/upload-queued" \
  "{\"dailyLogId\":\"$CREATED_LOG_ID\",\"clientId\":\"$CLIENT_ID_VOICE\",\"recordedAt\":\"$RECORDED_AT\",\"mimeType\":\"audio/m4a\",\"durationSeconds\":45}" \
  "$FOREMAN_TOKEN"
assert "POST voice/upload-queued" "201" '(.syncStatus == "PENDING_UPLOAD")'
VOICE_ID=$(jq_extract '.id')
echo -e "  ${CYAN}Queued voice note: $VOICE_ID${NC}"

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}8. Pending Uploads${NC}"
# ═════════════════════════════════════════════════════════════════════

do_get "/sync/pending-uploads" "$FOREMAN_TOKEN"
assert "GET sync/pending-uploads" "200" '(type == "array" and length >= 1)'

HAS_VOICE=$(echo "$BODY" | jq '[.[] | select(.id == "'"$VOICE_ID"'")] | length' 2>/dev/null)
if [[ "$HAS_VOICE" -ge 1 ]]; then
  PASS=$((PASS + 1))
  echo -e "  ${GREEN}[PASS]${NC} Queued voice note appears in pending-uploads"
else
  FAIL=$((FAIL + 1))
  FAILURES+=("Pending uploads list")
  echo -e "  ${RED}[FAIL]${NC} Queued voice note not found in pending-uploads"
fi

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}9. Cleanup${NC}"
# ═════════════════════════════════════════════════════════════════════

do_delete "/projects/$PROJECT_ID/daily-logs/$CREATED_LOG_ID" "$FOREMAN_TOKEN"
assert "DELETE test daily log" "200"

# ═════════════════════════════════════════════════════════════════════
# Results
# ═════════════════════════════════════════════════════════════════════
echo ""
echo -e "${BOLD}═══════════════════════════════════════${NC}"
echo -e "${BOLD}  Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"
echo -e "${BOLD}═══════════════════════════════════════${NC}"

if [[ ${#FAILURES[@]} -gt 0 ]]; then
  echo -e "\n${RED}Failures:${NC}"
  for f in "${FAILURES[@]}"; do
    echo -e "  ${RED}✗${NC} $f"
  done
fi

echo ""
if [[ $FAIL -eq 0 ]]; then
  echo -e "${GREEN}Offline sync module is fully operational!${NC}"
else
  exit 1
fi
