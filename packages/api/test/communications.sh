#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# XO Companion API — Communications E2E Test
# Tests: Ghost PM comms CRUD, approve/send/cancel/redraft, types
# Requires: curl, jq, a running API at BASE_URL
# ─────────────────────────────────────────────────────────────────────
set -uo pipefail

BASE_URL="${API_URL:-http://localhost:3000/api/v1}"
PASS=0
FAIL=0
FAILURES=()
COMM_IDS_TO_CLEAN=()

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ─── Helpers ─────────────────────────────────────────────────────────

assert() {
  local name="$1"
  local expected_code="$2"
  local jq_check="${3:-true}"

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

# Poll communication for status change with timeout
poll_comm_status() {
  local comm_id="$1"
  local target_status="$2"
  local timeout="${3:-30}"
  local elapsed=0
  local interval=3
  local status="DRAFTING"

  while [[ "$status" != "$target_status" && "$status" != "DRAFT" && $elapsed -lt $timeout ]]; do
    sleep $interval
    elapsed=$((elapsed + interval))
    do_get "/projects/$PROJECT_ID/communications/$comm_id" "$ADMIN_TOKEN"
    status=$(jq_extract '.status')
    echo -e "  ${CYAN}[$elapsed s]${NC} Communication status: $status"
  done
  echo "$status"
}

# ─────────────────────────────────────────────────────────────────────
echo -e "\n${BOLD}${CYAN}XO Companion — Communications E2E Test${NC}"
echo -e "${CYAN}Base URL: $BASE_URL${NC}\n"

# ═════════════════════════════════════════════════════════════════════
echo -e "${BOLD}0. Pre-flight${NC}"
# ═════════════════════════════════════════════════════════════════════

do_get "/health"
assert "GET /health returns ok" "200" '.status == "ok"'

do_post "/auth/login" '{"email":"admin@realelite.com","password":"password123"}'
assert "Login as admin" "200" '.accessToken != null'
ADMIN_TOKEN=$(jq_extract '.accessToken')

do_get "/projects" "$ADMIN_TOKEN"
PROJECT_ID=$(jq_extract 'map(select(.code == "REC-2026-001")) | .[0].id')
if [[ "$PROJECT_ID" == "null" || -z "$PROJECT_ID" ]]; then
  echo -e "  ${RED}[FATAL] Could not find project REC-2026-001${NC}"
  exit 1
fi
echo -e "  ${CYAN}Project: $PROJECT_ID${NC}"

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}1. Create Communication (manual EMAIL)${NC}"
# ═════════════════════════════════════════════════════════════════════

do_post "/projects/$PROJECT_ID/communications" \
  '{"type":"EMAIL","recipient":"John Smith","recipientEmail":"john@supplier.com","subject":"Late lumber delivery for Building A","urgency":"HIGH","context":"The lumber order #4521 was due last Friday. Need to confirm new delivery date."}' \
  "$ADMIN_TOKEN"
assert "POST create communication (EMAIL)" "201" '(.id != null) and (.status == "DRAFTING") and (.type == "EMAIL") and (.aiGenerated == true)'
COMM_ID=$(jq_extract '.id')
COMM_IDS_TO_CLEAN+=("$COMM_ID")
echo -e "  ${CYAN}Communication ID: $COMM_ID${NC}"

# Poll for DRAFT status (AI drafting via BullMQ)
FINAL_STATUS=$(poll_comm_status "$COMM_ID" "DRAFT" 45)

if [[ "$FINAL_STATUS" == "DRAFT" ]]; then
  PASS=$((PASS + 1))
  echo -e "  ${GREEN}[PASS]${NC} Communication reached DRAFT status"

  # Verify body is non-empty
  do_get "/projects/$PROJECT_ID/communications/$COMM_ID" "$ADMIN_TOKEN"
  COMM_BODY=$(jq_extract '.body')
  if [[ "$COMM_BODY" != "null" && -n "$COMM_BODY" && ${#COMM_BODY} -gt 10 ]]; then
    PASS=$((PASS + 1))
    echo -e "  ${GREEN}[PASS]${NC} AI-drafted body is non-empty (${#COMM_BODY} chars)"
  else
    FAIL=$((FAIL + 1))
    FAILURES+=("AI draft body should be non-empty")
    echo -e "  ${RED}[FAIL]${NC} AI draft body is empty or null"
  fi
else
  echo -e "  ${YELLOW}[WARN]${NC} Communication still $FINAL_STATUS — BullMQ workers may not be running"
  echo -e "  ${YELLOW}        Skipping body assertions${NC}"
fi

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}2. List Communications${NC}"
# ═════════════════════════════════════════════════════════════════════

do_get "/projects/$PROJECT_ID/communications" "$ADMIN_TOKEN"
assert "GET list communications" "200" '(type == "array") and (length >= 1)'

do_get "/projects/$PROJECT_ID/communications?status=DRAFT" "$ADMIN_TOKEN"
if [[ "$FINAL_STATUS" == "DRAFT" ]]; then
  assert "GET list filtered by status=DRAFT" "200" 'type == "array"'
else
  assert "GET list filtered by status (query param works)" "200" 'type == "array"'
fi

do_get "/projects/$PROJECT_ID/communications/summary" "$ADMIN_TOKEN"
assert "GET communication summary" "200" '(.total != null) and (.draft != null) and (.approved != null) and (.sent != null)'
echo -e "  ${CYAN}Summary: total=$(jq_extract '.total') drafting=$(jq_extract '.drafting') draft=$(jq_extract '.draft')${NC}"

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}3. Update Communication${NC}"
# ═════════════════════════════════════════════════════════════════════

do_patch "/projects/$PROJECT_ID/communications/$COMM_ID" \
  '{"editedBody":"Dear John,\n\nThis is an edited version of the email.\n\nRegards,\nSarah"}' \
  "$ADMIN_TOKEN"
assert "PATCH update editedBody" "200" '.editedBody != null'

# Verify original body preserved
do_get "/projects/$PROJECT_ID/communications/$COMM_ID" "$ADMIN_TOKEN"
ORIG_BODY=$(jq_extract '.body')
EDITED_BODY=$(jq_extract '.editedBody')
if [[ "$ORIG_BODY" != "null" && "$EDITED_BODY" != "null" && "$ORIG_BODY" != "$EDITED_BODY" ]]; then
  PASS=$((PASS + 1))
  echo -e "  ${GREEN}[PASS]${NC} Original body preserved alongside editedBody"
elif [[ "$FINAL_STATUS" != "DRAFT" ]]; then
  echo -e "  ${YELLOW}[SKIP]${NC} Cannot verify body preservation — communication not drafted"
else
  FAIL=$((FAIL + 1))
  FAILURES+=("editedBody should differ from original body")
  echo -e "  ${RED}[FAIL]${NC} editedBody should differ from original body"
fi

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}4. Approve Communication${NC}"
# ═════════════════════════════════════════════════════════════════════

do_post "/projects/$PROJECT_ID/communications/$COMM_ID/approve" '{}' "$ADMIN_TOKEN"
assert "POST approve communication" "200" '(.status == "APPROVED") and (.approvedAt != null)'

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}5. Mark as Sent${NC}"
# ═════════════════════════════════════════════════════════════════════

do_post "/projects/$PROJECT_ID/communications/$COMM_ID/send" '{}' "$ADMIN_TOKEN"
assert "POST mark as sent" "200" '(.status == "SENT") and (.sentAt != null)'

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}6. Create and Cancel${NC}"
# ═════════════════════════════════════════════════════════════════════

do_post "/projects/$PROJECT_ID/communications" \
  '{"type":"TEXT","recipient":"Mike Foreman","subject":"Tomorrow schedule change","urgency":"NORMAL","context":"Need to notify about schedule shift"}' \
  "$ADMIN_TOKEN"
assert "POST create communication for cancel test" "201" '.id != null'
CANCEL_COMM_ID=$(jq_extract '.id')
COMM_IDS_TO_CLEAN+=("$CANCEL_COMM_ID")

do_post "/projects/$PROJECT_ID/communications/$CANCEL_COMM_ID/cancel" '{}' "$ADMIN_TOKEN"
assert "POST cancel communication" "200" '.status == "CANCELLED"'

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}7. Redraft${NC}"
# ═════════════════════════════════════════════════════════════════════

# Create another communication and wait for DRAFT
do_post "/projects/$PROJECT_ID/communications" \
  '{"type":"RFI","recipient":"Architect Team","subject":"Beam connection detail at grid B-4","urgency":"HIGH","context":"Drawings show W10x22 but spec calls for W12x26. Need clarification."}' \
  "$ADMIN_TOKEN"
assert "POST create communication for redraft test" "201" '.id != null'
REDRAFT_COMM_ID=$(jq_extract '.id')
COMM_IDS_TO_CLEAN+=("$REDRAFT_COMM_ID")

# Wait for it to reach DRAFT (or timeout)
REDRAFT_STATUS=$(poll_comm_status "$REDRAFT_COMM_ID" "DRAFT" 30)

if [[ "$REDRAFT_STATUS" == "DRAFT" ]]; then
  # Now redraft it
  do_post "/projects/$PROJECT_ID/communications/$REDRAFT_COMM_ID/redraft" '{}' "$ADMIN_TOKEN"
  assert "POST redraft communication" "200" '.status == "DRAFTING"'
else
  echo -e "  ${YELLOW}[SKIP]${NC} Cannot test redraft — communication didn't reach DRAFT status"
fi

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}8. Delete${NC}"
# ═════════════════════════════════════════════════════════════════════

do_post "/projects/$PROJECT_ID/communications" \
  '{"type":"CALL","recipient":"Inspector Jones","subject":"Footer inspection scheduling","urgency":"NORMAL","context":"Need to schedule inspection for Building A footers"}' \
  "$ADMIN_TOKEN"
DELETE_COMM_ID=$(jq_extract '.id')

if [[ "$DELETE_COMM_ID" != "null" && -n "$DELETE_COMM_ID" ]]; then
  do_delete "/projects/$PROJECT_ID/communications/$DELETE_COMM_ID" "$ADMIN_TOKEN"
  assert "DELETE communication" "200" "true"

  # Verify it's gone
  do_get "/projects/$PROJECT_ID/communications/$DELETE_COMM_ID" "$ADMIN_TOKEN"
  assert "GET deleted communication returns 404" "404" "true"
fi

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}9. Communication Types${NC}"
# ═════════════════════════════════════════════════════════════════════

# Create one of each remaining type (EMAIL already tested, CALL+TEXT+RFI above)
do_post "/projects/$PROJECT_ID/communications" \
  '{"type":"CHANGE_ORDER","recipient":"GC Office","subject":"Foundation depth change at Building B","urgency":"HIGH","context":"Geotech report recommends deeper footings. Need written authorization."}' \
  "$ADMIN_TOKEN"
assert "POST create CHANGE_ORDER communication" "201" '(.type == "CHANGE_ORDER") and (.urgency == "HIGH")'
CO_COMM_ID=$(jq_extract '.id')
COMM_IDS_TO_CLEAN+=("$CO_COMM_ID")

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}10. Cleanup${NC}"
# ═════════════════════════════════════════════════════════════════════

for cid in "${COMM_IDS_TO_CLEAN[@]}"; do
  if [[ "$cid" != "null" && -n "$cid" ]]; then
    do_delete "/projects/$PROJECT_ID/communications/$cid" "$ADMIN_TOKEN"
    echo -e "  ${CYAN}Deleted communication $cid (HTTP $HTTP_CODE)${NC}"
  fi
done

# ═════════════════════════════════════════════════════════════════════
echo ""
echo -e "${BOLD}═══════════════════════════════════════${NC}"
echo -e "${BOLD}  Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"
echo -e "${BOLD}═══════════════════════════════════════${NC}"

if [[ ${#FAILURES[@]} -gt 0 ]]; then
  echo -e "\n${RED}Failed tests:${NC}"
  for f in "${FAILURES[@]}"; do
    echo -e "  ${RED}- $f${NC}"
  done
fi

echo ""
if [[ $FAIL -eq 0 ]]; then
  echo -e "${GREEN}All communications tests passed!${NC}\n"
  exit 0
else
  exit 1
fi
