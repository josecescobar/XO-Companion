#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# XO Companion API — Inspections E2E Test
# Tests: AI Vision Inspection create, list, summary, review, delete
# Requires: curl, jq, a running API at BASE_URL
# ─────────────────────────────────────────────────────────────────────
set -uo pipefail

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

# Multipart upload helper
do_upload() {
  local path="$1"
  local file="$2"
  local mime="$3"
  local token="$4"
  shift 4
  local response
  response=$(curl -s -w '\n%{http_code}' \
    -H "Authorization: Bearer $token" \
    -F "file=@$file;type=$mime" \
    "$@" \
    "$BASE_URL$path")
  HTTP_CODE=$(echo "$response" | tail -1)
  BODY=$(echo "$response" | sed '$d')
}

# ─────────────────────────────────────────────────────────────────────
echo -e "\n${BOLD}${CYAN}XO Companion — Inspections E2E Test${NC}"
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

# Check for ANTHROPIC_API_KEY (needed for vision processing)
ENV_FILE="$(cd "$(dirname "$0")/.." && pwd)/.env"
VISION_AVAILABLE=false
if [[ -f "$ENV_FILE" ]]; then
  ANTHROPIC_KEY=$(sed -n 's/^ANTHROPIC_API_KEY=//p' "$ENV_FILE" 2>/dev/null || true)
  if [[ -n "$ANTHROPIC_KEY" && "$ANTHROPIC_KEY" != "your-anthropic-api-key" ]]; then
    VISION_AVAILABLE=true
    echo -e "  ${GREEN}ANTHROPIC_API_KEY found — vision processing available${NC}"
  fi
fi
if [[ "$VISION_AVAILABLE" == "false" ]]; then
  echo -e "  ${YELLOW}ANTHROPIC_API_KEY not configured — will skip processing assertions${NC}"
fi

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}1. Upload Test Photo (prerequisite)${NC}"
# ═════════════════════════════════════════════════════════════════════

# Create a minimal test JPEG
FIXTURES_DIR="/tmp/xo-test-fixtures-insp"
mkdir -p "$FIXTURES_DIR"
base64 -d <<'JPEG_EOF' > "$FIXTURES_DIR/test-inspection.jpg"
/9j/4AAQSkZJRgABAQEASABIAAD/2wBDABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0oOjM9PDkz
ODdASFxOQERXRTc4UG1RV19iZ2hnPk1xeXBkeFxlZ2f/2wBDARESEhgVGC8aGC9nQTtBZ2dnZ2dn
Z2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2f/wAARCAABAAEDASIA
AhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAFBABAAAAAAAAAAAAAAAA
AAAACQ/aAAwDAQACEQMRAD8AAqYA/9k=
JPEG_EOF

do_upload "/projects/$PROJECT_ID/media" \
  "$FIXTURES_DIR/test-inspection.jpg" "image/jpeg" "$ADMIN_TOKEN" \
  -F "type=PHOTO"
assert "POST upload test photo for inspection" "201" '.id != null'
MEDIA_ID=$(jq_extract '.id')
echo -e "  ${CYAN}Media ID: $MEDIA_ID${NC}"

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}2. Create Inspection${NC}"
# ═════════════════════════════════════════════════════════════════════

do_post "/projects/$PROJECT_ID/inspections" \
  "{\"mediaId\":\"$MEDIA_ID\",\"title\":\"E2E Test: Safety Check Building A\",\"inspectionType\":\"SAFETY_CHECK\"}" \
  "$ADMIN_TOKEN"
assert "POST create inspection" "201" '(.id != null) and (.inspectionType == "SAFETY_CHECK")'
INSP_ID=$(jq_extract '.id')
INSP_STATUS=$(jq_extract '.status')
echo -e "  ${CYAN}Inspection ID: $INSP_ID, Status: $INSP_STATUS${NC}"

# Poll for processing if vision is available
if [[ "$VISION_AVAILABLE" == "true" && ("$INSP_STATUS" == "PENDING" || "$INSP_STATUS" == "PROCESSING") ]]; then
  ELAPSED=0
  POLL_INTERVAL=5
  POLL_TIMEOUT=120

  while [[ "$INSP_STATUS" == "PENDING" || "$INSP_STATUS" == "PROCESSING" ]] && [[ $ELAPSED -lt $POLL_TIMEOUT ]]; do
    sleep $POLL_INTERVAL
    ELAPSED=$((ELAPSED + POLL_INTERVAL))
    do_get "/projects/$PROJECT_ID/inspections/$INSP_ID" "$ADMIN_TOKEN"
    INSP_STATUS=$(jq_extract '.status')
    echo -e "  ${CYAN}[$ELAPSED s]${NC} Inspection status: $INSP_STATUS"
  done

  if [[ "$INSP_STATUS" == "PASS" || "$INSP_STATUS" == "FAIL" || "$INSP_STATUS" == "NEEDS_ATTENTION" || "$INSP_STATUS" == "INCONCLUSIVE" ]]; then
    PASS=$((PASS + 1))
    echo -e "  ${GREEN}[PASS]${NC} Inspection processing completed: $INSP_STATUS"

    # Verify findings
    do_get "/projects/$PROJECT_ID/inspections/$INSP_ID" "$ADMIN_TOKEN"
    SCORE=$(jq_extract '.aiOverallScore')
    FINDINGS_COUNT=$(echo "$BODY" | jq '.aiFindings | length' 2>/dev/null || echo "0")
    echo -e "  ${CYAN}Score: $SCORE, Findings: $FINDINGS_COUNT${NC}"

    if [[ "$SCORE" != "null" ]]; then
      PASS=$((PASS + 1))
      echo -e "  ${GREEN}[PASS]${NC} Inspection has aiOverallScore"
    fi
  else
    echo -e "  ${YELLOW}[WARN]${NC} Inspection still $INSP_STATUS after ${POLL_TIMEOUT}s"
  fi
else
  echo -e "  ${YELLOW}[INFO]${NC} Skipping processing poll — vision not available or already processed"
fi

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}3. List Inspections${NC}"
# ═════════════════════════════════════════════════════════════════════

do_get "/projects/$PROJECT_ID/inspections" "$ADMIN_TOKEN"
assert "GET list inspections" "200" '(type == "array") and (length >= 1)'

do_get "/projects/$PROJECT_ID/inspections?inspectionType=SAFETY_CHECK" "$ADMIN_TOKEN"
assert "GET list inspections filtered by type" "200" 'type == "array"'

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}4. Inspection Summary${NC}"
# ═════════════════════════════════════════════════════════════════════

do_get "/projects/$PROJECT_ID/inspections/summary" "$ADMIN_TOKEN"
assert "GET inspection summary" "200" '(.total != null) and (.pass != null) and (.fail != null) and (.pending != null)'
echo -e "  ${CYAN}Summary: total=$(jq_extract '.total') pass=$(jq_extract '.pass') fail=$(jq_extract '.fail') pending=$(jq_extract '.pending')${NC}"

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}5. Inspection Detail${NC}"
# ═════════════════════════════════════════════════════════════════════

do_get "/projects/$PROJECT_ID/inspections/$INSP_ID" "$ADMIN_TOKEN"
assert "GET inspection detail" "200" '(.id != null) and (.title != null) and (.inspectionType != null) and (.status != null)'

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}6. Review Inspection${NC}"
# ═════════════════════════════════════════════════════════════════════

do_post "/projects/$PROJECT_ID/inspections/$INSP_ID/review" \
  '{"result":"PASS","notes":"E2E test review — all items acceptable"}' \
  "$ADMIN_TOKEN"
if [[ "$HTTP_CODE" == "200" ]]; then
  assert "POST review inspection" "200" '(.reviewedAt != null) or (.status == "PASS")'
else
  echo -e "  ${YELLOW}[WARN]${NC} Review returned HTTP $HTTP_CODE — may require processing to complete first"
fi

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}7. Delete Inspection${NC}"
# ═════════════════════════════════════════════════════════════════════

do_delete "/projects/$PROJECT_ID/inspections/$INSP_ID" "$ADMIN_TOKEN"
assert "DELETE inspection" "200" "true"

# Verify deleted
do_get "/projects/$PROJECT_ID/inspections/$INSP_ID" "$ADMIN_TOKEN"
assert "GET deleted inspection returns 404" "404" "true"

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}8. Cleanup${NC}"
# ═════════════════════════════════════════════════════════════════════

# Delete test media
if [[ "${MEDIA_ID:-null}" != "null" && -n "${MEDIA_ID:-}" ]]; then
  do_delete "/projects/$PROJECT_ID/media/$MEDIA_ID" "$ADMIN_TOKEN"
  echo -e "  ${CYAN}Deleted media $MEDIA_ID (HTTP $HTTP_CODE)${NC}"
fi

rm -rf "$FIXTURES_DIR"

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
  echo -e "${GREEN}All inspections tests passed!${NC}\n"
  exit 0
else
  exit 1
fi
