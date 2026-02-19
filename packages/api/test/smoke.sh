#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# XO Companion API — Comprehensive Smoke Test
# Tests every endpoint group against the seeded database.
# Requires: curl, jq, a running API at BASE_URL
# ─────────────────────────────────────────────────────────────────────
set -uo pipefail  # no -e: we handle errors ourselves

BASE_URL="${API_URL:-http://localhost:3000/api/v1}"
PASS=0
FAIL=0
FAILURES=()

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ─── Helpers ─────────────────────────────────────────────────────────

# assert <test_name> <expected_http_code> <jq_assertion_on_body>
# Body is available in $BODY, HTTP code in $HTTP_CODE
assert() {
  local name="$1"
  local expected_code="$2"
  local jq_check="${3:-true}"  # jq expression that should return "true"

  if [[ "$HTTP_CODE" != "$expected_code" ]]; then
    FAIL=$((FAIL + 1))
    FAILURES+=("$name")
    echo -e "  ${RED}[FAIL]${NC} $name — expected HTTP $expected_code, got $HTTP_CODE"
    echo "         Body: $(echo "$BODY" | head -c 200)"
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

# Safe jq extract — returns "null" string on failure instead of crashing
jq_extract() {
  echo "$BODY" | jq -r "$1" 2>/dev/null || echo "null"
}

# GET <path> [token]
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

# POST <path> <json_body> [token]
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

# PUT <path> <json_body> [token]
do_put() {
  local path="$1"
  local data="$2"
  local token="${3:-}"
  local headers=(-s -w '\n%{http_code}' -H 'Content-Type: application/json')
  [[ -n "$token" ]] && headers+=(-H "Authorization: Bearer $token")

  local response
  response=$(curl -X PUT "${headers[@]}" -d "$data" "$BASE_URL$path")
  HTTP_CODE=$(echo "$response" | tail -1)
  BODY=$(echo "$response" | sed '$d')
}

# PATCH <path> <json_body> [token]
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

# DELETE <path> [token]
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
echo -e "\n${BOLD}${CYAN}XO Companion API Smoke Test${NC}"
echo -e "${CYAN}Base URL: $BASE_URL${NC}\n"

# ═════════════════════════════════════════════════════════════════════
echo -e "${BOLD}1. Health Endpoints${NC}"
# ═════════════════════════════════════════════════════════════════════

do_get "/health"
assert "GET /health returns ok" "200" '.status == "ok"'

do_get "/health/ready"
assert "GET /health/ready shows database connected" "200" '.database == "connected"'

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}2. Auth Endpoints${NC}"
# ═════════════════════════════════════════════════════════════════════

# Login as admin
do_post "/auth/login" '{"email":"admin@realelite.com","password":"password123"}'
assert "POST /auth/login succeeds" "200" '(.accessToken != null) and (.refreshToken != null) and (.user.email == "admin@realelite.com")'
ADMIN_TOKEN=$(jq_extract '.accessToken')
ADMIN_REFRESH=$(jq_extract '.refreshToken')

# Get current user
do_get "/auth/me" "$ADMIN_TOKEN"
assert "GET /auth/me returns admin user" "200" '.email == "admin@realelite.com"'

# Refresh token
do_post "/auth/refresh" "{\"refreshToken\":\"$ADMIN_REFRESH\"}"
assert "POST /auth/refresh returns new tokens" "200" '(.accessToken != null) and (.refreshToken != null)'
# Update tokens after refresh
ADMIN_TOKEN=$(jq_extract '.accessToken')
ADMIN_REFRESH=$(jq_extract '.refreshToken')

# 401 without token
do_get "/auth/me"
assert "GET /auth/me without token returns 401" "401" "true"

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}3. Users Endpoints${NC}"
# ═════════════════════════════════════════════════════════════════════

do_get "/users" "$ADMIN_TOKEN"
assert "GET /users returns array with users" "200" '(type == "array") and (length >= 6)'

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}4. Projects Endpoints${NC}"
# ═════════════════════════════════════════════════════════════════════

do_get "/projects" "$ADMIN_TOKEN"
assert "GET /projects returns array with seeded projects" "200" '(type == "array") and (length >= 2)'
# Extract the Riverside Medical Center project by code
PROJECT_ID=$(jq_extract 'map(select(.code == "REC-2026-001")) | .[0].id')
if [[ "$PROJECT_ID" == "null" || -z "$PROJECT_ID" ]]; then
  echo -e "  ${RED}[FATAL] Could not find project REC-2026-001 — aborting${NC}"
  echo "         Available projects: $(echo "$BODY" | jq '[.[].code]' 2>/dev/null)"
  exit 1
fi

do_get "/projects/$PROJECT_ID" "$ADMIN_TOKEN"
assert "GET /projects/:id returns project with members" "200" '(.name == "Riverside Medical Center") and (.members | type == "array")'

do_get "/projects/$PROJECT_ID/members" "$ADMIN_TOKEN"
assert "GET /projects/:id/members returns members" "200" '(type == "array") and (length >= 5)'

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}5. Daily Logs — Read Existing${NC}"
# ═════════════════════════════════════════════════════════════════════

do_get "/projects/$PROJECT_ID/daily-logs" "$ADMIN_TOKEN"
assert "GET daily-logs returns array with seeded logs" "200" '(type == "array") and (length >= 2)'
# Extract the DRAFT log (Feb 17) for reading — it has AI data
DRAFT_LOG_ID=$(jq_extract 'map(select(.status == "DRAFT")) | .[0].id')
if [[ "$DRAFT_LOG_ID" == "null" || -z "$DRAFT_LOG_ID" ]]; then
  echo -e "  ${YELLOW}[WARN] No DRAFT log found — will skip some tests${NC}"
fi

if [[ "$DRAFT_LOG_ID" != "null" && -n "$DRAFT_LOG_ID" ]]; then
  do_get "/projects/$PROJECT_ID/daily-logs/$DRAFT_LOG_ID" "$ADMIN_TOKEN"
  assert "GET daily-log detail has all sub-entry fields" "200" \
    '(.weather != null) and (.workforce | type == "array") and (.equipment | type == "array") and (.workCompleted | type == "array") and (.delays | type == "array") and (.safety != null)'
fi

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}6. Daily Logs — Create + Sub-Entries${NC}"
# ═════════════════════════════════════════════════════════════════════

# Generate a unique far-future date per run to avoid conflicts
# Each run picks a random day in 2099 so reruns never collide
SMOKE_MONTH=$(( (RANDOM % 12) + 1 ))
SMOKE_DAY=$(( (RANDOM % 28) + 1 ))
SMOKE_DATE=$(printf "2099-%02d-%02d" $SMOKE_MONTH $SMOKE_DAY)

do_post "/projects/$PROJECT_ID/daily-logs" \
  "{\"logDate\":\"$SMOKE_DATE\",\"notes\":\"Smoke test log\"}" \
  "$ADMIN_TOKEN"
assert "POST create daily log" "201" '(.id != null) and (.status == "DRAFT")'
NEW_LOG_ID=$(jq_extract '.id')
if [[ "$NEW_LOG_ID" == "null" || -z "$NEW_LOG_ID" ]]; then
  echo -e "  ${RED}[FATAL] Could not create daily log — aborting remaining tests${NC}"
  echo ""
  echo -e "${BOLD}═══════════════════════════════════════${NC}"
  echo -e "${BOLD}  Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"
  echo -e "${BOLD}═══════════════════════════════════════${NC}"
  exit 1
fi

# Upsert weather
do_put "/projects/$PROJECT_ID/daily-logs/$NEW_LOG_ID/weather" \
  '{"conditions":["CLEAR"],"tempHigh":75,"tempLow":55,"windSpeed":10}' \
  "$ADMIN_TOKEN"
assert "PUT upsert weather entry" "200" '.conditions[0] == "CLEAR"'

# Upsert safety
do_put "/projects/$PROJECT_ID/daily-logs/$NEW_LOG_ID/safety" \
  '{"toolboxTalks":["Fall Protection"],"inspections":["Scaffold check"],"incidents":[],"oshaRecordable":false,"nearMisses":0}' \
  "$ADMIN_TOKEN"
assert "PUT upsert safety entry" "200" '.toolboxTalks[0] == "Fall Protection"'

# Add workforce
do_post "/projects/$PROJECT_ID/daily-logs/$NEW_LOG_ID/workforce" \
  '{"trade":"Electrician","company":"Spark Electric","workerCount":4,"hoursWorked":8}' \
  "$ADMIN_TOKEN"
assert "POST add workforce entry" "201" '(.trade == "Electrician") and (.id != null)'
WF_ENTRY_ID=$(jq_extract '.id')

# Add equipment
do_post "/projects/$PROJECT_ID/daily-logs/$NEW_LOG_ID/equipment" \
  '{"equipmentType":"Crane","operatingHours":6,"condition":"OPERATIONAL"}' \
  "$ADMIN_TOKEN"
assert "POST add equipment entry" "201" '(.equipmentType == "Crane") and (.id != null)'
EQ_ENTRY_ID=$(jq_extract '.id')

# Add work completed
do_post "/projects/$PROJECT_ID/daily-logs/$NEW_LOG_ID/work-completed" \
  '{"location":"Building B - Roof","description":"Installed roofing membrane section 1-4","percentComplete":40}' \
  "$ADMIN_TOKEN"
assert "POST add work-completed entry" "201" '.location == "Building B - Roof"'

# Add material
do_post "/projects/$PROJECT_ID/daily-logs/$NEW_LOG_ID/materials" \
  '{"material":"Copper Wire 12 AWG","quantity":500,"unit":"FT","supplier":"Metro Supply","condition":"GOOD"}' \
  "$ADMIN_TOKEN"
assert "POST add material entry" "201" '.material == "Copper Wire 12 AWG"'

# Add delay
do_post "/projects/$PROJECT_ID/daily-logs/$NEW_LOG_ID/delays" \
  '{"cause":"WEATHER","description":"Rain delay 1hr in morning","durationMinutes":60,"impactedTrades":["Electrician","General Labor"]}' \
  "$ADMIN_TOKEN"
assert "POST add delay entry" "201" '(.cause == "WEATHER") and (.durationMinutes == 60)'

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}7. Daily Logs — Status Workflow${NC}"
# ═════════════════════════════════════════════════════════════════════

# DRAFT → PENDING_REVIEW (NestJS POST defaults to 201)
do_post "/projects/$PROJECT_ID/daily-logs/$NEW_LOG_ID/submit" '{}' "$ADMIN_TOKEN"
assert "POST submit log (DRAFT → PENDING_REVIEW)" "201" '.status == "PENDING_REVIEW"'

# PENDING_REVIEW → APPROVED
do_post "/projects/$PROJECT_ID/daily-logs/$NEW_LOG_ID/approve" '{}' "$ADMIN_TOKEN"
assert "POST approve log (PENDING_REVIEW → APPROVED)" "201" '.status == "APPROVED"'

# APPROVED → AMENDED
do_post "/projects/$PROJECT_ID/daily-logs/$NEW_LOG_ID/amend" '{}' "$ADMIN_TOKEN"
assert "POST amend log (APPROVED → AMENDED)" "201" '.status == "AMENDED"'

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}8. Voice Notes${NC}"
# ═════════════════════════════════════════════════════════════════════

# Use the DRAFT log which is a seeded log; fall back to new log
VOICE_LOG_ID="${DRAFT_LOG_ID:-$NEW_LOG_ID}"
do_get "/projects/$PROJECT_ID/daily-logs/$VOICE_LOG_ID/voice" "$ADMIN_TOKEN"
assert "GET voice notes returns array" "200" 'type == "array"'

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}9. Reviews${NC}"
# ═════════════════════════════════════════════════════════════════════

# Use the DRAFT log which has AI data with varying confidence
REVIEW_LOG_ID="${DRAFT_LOG_ID:-$NEW_LOG_ID}"

# Pending reviews
do_get "/projects/$PROJECT_ID/daily-logs/$REVIEW_LOG_ID/reviews/pending" "$ADMIN_TOKEN"
assert "GET pending reviews has entries array" "200" '(.entries | type == "array") and (.confidenceThreshold != null)'

# Audit trail
do_get "/projects/$PROJECT_ID/daily-logs/$REVIEW_LOG_ID/reviews" "$ADMIN_TOKEN"
assert "GET review audit trail returns array" "200" 'type == "array"'

# Stats
do_get "/projects/$PROJECT_ID/reviews/stats" "$ADMIN_TOKEN"
assert "GET review stats has required fields" "200" '(.totalReviews != null) and (.approvalRate != null)'

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}10. RBAC Enforcement${NC}"
# ═════════════════════════════════════════════════════════════════════

# Login as foreman
do_post "/auth/login" '{"email":"foreman@realelite.com","password":"password123"}'
assert "POST login as foreman" "200" '.user.role == "FOREMAN"'
FOREMAN_TOKEN=$(jq_extract '.accessToken')

# Foreman cannot list users (requires SUPER_ADMIN or PROJECT_MANAGER)
do_get "/users" "$FOREMAN_TOKEN"
assert "GET /users as foreman returns 403" "403" "true"

# Re-submit the smoke test log so we can test foreman approve denial
# The log is AMENDED — submit it again
do_post "/projects/$PROJECT_ID/daily-logs/$NEW_LOG_ID/submit" '{}' "$ADMIN_TOKEN"
# Now try to approve as foreman (should fail — only SUPER_ADMIN, PM, SUPERINTENDENT, OWNER_REP can approve)
do_post "/projects/$PROJECT_ID/daily-logs/$NEW_LOG_ID/approve" '{}' "$FOREMAN_TOKEN"
assert "POST approve as foreman returns 403" "403" "true"

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}11. Cleanup${NC}"
# ═════════════════════════════════════════════════════════════════════

# The log is in PENDING_REVIEW after RBAC test. Approve and note it's left in DB.
# (Only DRAFT logs can be deleted via API, and there's no way to reset to DRAFT.)
do_post "/projects/$PROJECT_ID/daily-logs/$NEW_LOG_ID/approve" '{}' "$ADMIN_TOKEN"
echo -e "  ${YELLOW}Smoke test log $NEW_LOG_ID ($SMOKE_DATE) left in DB as APPROVED${NC}"
echo -e "  ${YELLOW}(Only DRAFT logs are deletable via API — no path back to DRAFT)${NC}"

# ═════════════════════════════════════════════════════════════════════
echo ""
echo -e "${BOLD}═══════════════════════════════════════${NC}"
echo -e "${BOLD}  Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"
echo -e "${BOLD}═══════════════════════════════════════${NC}"

if [[ $FAIL -gt 0 ]]; then
  echo -e "\n${RED}Failed tests:${NC}"
  for f in "${FAILURES[@]}"; do
    echo -e "  ${RED}- $f${NC}"
  done
  echo ""
  exit 1
fi

echo -e "\n${GREEN}All tests passed!${NC}\n"
exit 0
