#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# XO Companion — Compliance Module Test
# Tests: OSHA incidents, Form 300/300A/301, documents, dashboard,
#        alerts, training records, expiring certs, RBAC
# ─────────────────────────────────────────────────────────────────────
set -uo pipefail

BASE_URL="${API_URL:-http://localhost:3000/api/v1}"

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
echo -e "\n${BOLD}${CYAN}XO Companion — Compliance Module Test${NC}"
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
echo -e "\n${BOLD}1. Setup — Login${NC}"
# ═════════════════════════════════════════════════════════════════════

do_post "/auth/login" '{"email":"admin@realelite.com","password":"password123"}'
assert "Login as admin" "200"
ADMIN_TOKEN=$(jq_extract '.accessToken')

# Get a project ID for incidents
do_get "/projects" "$ADMIN_TOKEN"
PROJECT_ID=$(echo "$BODY" | jq -r '.[0].id')
echo -e "  ${GREEN}Project: $PROJECT_ID${NC}"

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}2. OSHA Incidents — CRUD${NC}"
# ═════════════════════════════════════════════════════════════════════

do_post "/compliance/incidents" \
  "{\"projectId\":\"$PROJECT_ID\",\"employeeName\":\"John Smith\",\"incidentDate\":\"2026-02-15\",\"description\":\"Worker slipped on wet concrete\",\"injuryType\":\"Sprain\",\"bodyPart\":\"Left ankle\",\"isRecordable\":true,\"caseType\":\"DAYS_AWAY\",\"daysAwayFromWork\":3}" \
  "$ADMIN_TOKEN"
assert "POST create OSHA incident" "201" '(.employeeName == "John Smith")'
INCIDENT_ID=$(jq_extract '.id')
echo -e "  ${CYAN}Incident ID: $INCIDENT_ID${NC}"

do_get "/compliance/incidents" "$ADMIN_TOKEN"
assert "GET list incidents" "200" '(type == "array" and length >= 1)'

do_get "/compliance/incidents/$INCIDENT_ID" "$ADMIN_TOKEN"
assert "GET incident detail" "200" '(.description == "Worker slipped on wet concrete")'

do_patch "/compliance/incidents/$INCIDENT_ID" \
  '{"location":"Building A, Floor 2","daysAwayFromWork":5}' \
  "$ADMIN_TOKEN"
assert "PATCH update incident" "200" '(.location == "Building A, Floor 2" and .daysAwayFromWork == 5)'

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}3. OSHA Forms${NC}"
# ═════════════════════════════════════════════════════════════════════

do_get "/compliance/osha/form-300?year=2026" "$ADMIN_TOKEN"
assert "GET Form 300" "200" '(.form == "OSHA-300" and (.entries | type) == "array" and (.totals | type) == "object")'
FORM300_CASES=$(jq_extract '.totals.totalCases')
echo -e "  ${CYAN}Form 300: $FORM300_CASES recordable cases for 2026${NC}"

do_get "/compliance/osha/form-300a?year=2026" "$ADMIN_TOKEN"
assert "GET Form 300A" "200" '(.form == "OSHA-300A" and .totalCases >= 1)'

do_get "/compliance/osha/form-301/$INCIDENT_ID" "$ADMIN_TOKEN"
assert "GET Form 301" "200" '(.form == "OSHA-301" and .employee.name == "John Smith")'

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}4. Compliance Documents${NC}"
# ═════════════════════════════════════════════════════════════════════

# Create document expiring in 25 days (should appear in alerts)
EXPIRE_SOON=$(date -v+25d +%Y-%m-%d 2>/dev/null || date -d "+25 days" +%Y-%m-%d)
do_post "/compliance/documents" \
  "{\"documentType\":\"CONTRACTOR_LICENSE\",\"name\":\"WV Contractor License\",\"licenseNumber\":\"WV-2026-1234\",\"issuingAuthority\":\"WV Division of Labor\",\"state\":\"WV\",\"issueDate\":\"2025-03-01\",\"expirationDate\":\"$EXPIRE_SOON\"}" \
  "$ADMIN_TOKEN"
assert "POST create license (expires in 25 days)" "201" '(.name == "WV Contractor License")'
DOC1_ID=$(jq_extract '.id')

# Create document expiring in 100 days (should NOT appear in 30-day alerts)
EXPIRE_LATER=$(date -v+100d +%Y-%m-%d 2>/dev/null || date -d "+100 days" +%Y-%m-%d)
do_post "/compliance/documents" \
  "{\"documentType\":\"GENERAL_LIABILITY\",\"name\":\"General Liability Insurance\",\"issuingAuthority\":\"ABC Insurance Co\",\"issueDate\":\"2026-01-01\",\"expirationDate\":\"$EXPIRE_LATER\"}" \
  "$ADMIN_TOKEN"
assert "POST create insurance (expires in 100 days)" "201"
DOC2_ID=$(jq_extract '.id')

do_get "/compliance/documents" "$ADMIN_TOKEN"
assert "GET list documents" "200" '(type == "array" and length >= 2)'

do_get "/compliance/documents/$DOC1_ID" "$ADMIN_TOKEN"
assert "GET document detail" "200" '(.licenseNumber == "WV-2026-1234")'

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}5. Dashboard & Alerts${NC}"
# ═════════════════════════════════════════════════════════════════════

do_get "/compliance/dashboard" "$ADMIN_TOKEN"
assert "GET dashboard" "200" '(.summary | type) == "object"'
echo -e "  ${CYAN}Dashboard: expired=$(jq_extract '.summary.expired'), expiringSoon=$(jq_extract '.summary.expiringSoon'), upcoming=$(jq_extract '.summary.upcomingRenewals')${NC}"

do_get "/compliance/alerts" "$ADMIN_TOKEN"
assert "GET alerts" "200" '(type == "array")'
ALERT_COUNT=$(jq_extract 'length')
echo -e "  ${CYAN}Alerts: $ALERT_COUNT documents needing attention${NC}"

# Verify the 25-day doc appears in alerts
ALERT_HAS_LICENSE=$(echo "$BODY" | jq '[.[] | select(.name == "WV Contractor License")] | length' 2>/dev/null || echo "0")
if [[ "$ALERT_HAS_LICENSE" -ge 1 ]]; then
  PASS=$((PASS + 1))
  echo -e "  ${GREEN}[PASS]${NC} License appears in alerts (expiring in 25 days)"
else
  FAIL=$((FAIL + 1))
  FAILURES+=("License in alerts")
  echo -e "  ${RED}[FAIL]${NC} License should appear in alerts"
fi

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}6. Training Records${NC}"
# ═════════════════════════════════════════════════════════════════════

do_post "/compliance/training" \
  '{"employeeName":"Jane Doe","trainingType":"OSHA_10","topic":"OSHA 10-Hour Construction","completedDate":"2026-02-01","trainer":"Safety Solutions Inc"}' \
  "$ADMIN_TOKEN"
assert "POST create training record" "201" '(.topic == "OSHA 10-Hour Construction")'
TRAINING1_ID=$(jq_extract '.id')

# Create training with upcoming expiration (45 days)
TRAIN_EXPIRE=$(date -v+45d +%Y-%m-%d 2>/dev/null || date -d "+45 days" +%Y-%m-%d)
do_post "/compliance/training" \
  "{\"employeeName\":\"Bob Wilson\",\"trainingType\":\"FIRST_AID\",\"topic\":\"First Aid / CPR Certification\",\"completedDate\":\"2025-02-01\",\"expirationDate\":\"$TRAIN_EXPIRE\",\"certificationId\":\"FA-2025-789\"}" \
  "$ADMIN_TOKEN"
assert "POST create training with expiration" "201"
TRAINING2_ID=$(jq_extract '.id')

do_get "/compliance/training" "$ADMIN_TOKEN"
assert "GET list training records" "200" '(type == "array" and length >= 2)'

do_get "/compliance/training/$TRAINING1_ID" "$ADMIN_TOKEN"
assert "GET training detail" "200" '(.trainer == "Safety Solutions Inc")'

do_get "/compliance/training/expiring?days=60" "$ADMIN_TOKEN"
assert "GET expiring training (within 60 days)" "200" '(type == "array" and length >= 1)'
EXPIRING_COUNT=$(jq_extract 'length')
echo -e "  ${CYAN}Expiring within 60 days: $EXPIRING_COUNT records${NC}"

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}7. RBAC — Foreman Access${NC}"
# ═════════════════════════════════════════════════════════════════════

do_post "/auth/login" '{"email":"foreman@realelite.com","password":"password123"}'
assert "Login as foreman" "200"
FOREMAN_TOKEN=$(jq_extract '.accessToken')

# Foreman can read
do_get "/compliance/incidents" "$FOREMAN_TOKEN"
assert "Foreman GET incidents (allowed)" "200"

do_get "/compliance/documents" "$FOREMAN_TOKEN"
assert "Foreman GET documents (allowed)" "200"

do_get "/compliance/training" "$FOREMAN_TOKEN"
assert "Foreman GET training (allowed)" "200"

# Foreman cannot create
do_post "/compliance/incidents" \
  "{\"projectId\":\"$PROJECT_ID\",\"employeeName\":\"Test\",\"incidentDate\":\"2026-02-18\",\"description\":\"Test\"}" \
  "$FOREMAN_TOKEN"
assert "Foreman POST incident (forbidden)" "403"

do_post "/compliance/documents" \
  '{"documentType":"OTHER","name":"Test"}' \
  "$FOREMAN_TOKEN"
assert "Foreman POST document (forbidden)" "403"

do_post "/compliance/training" \
  '{"employeeName":"Test","trainingType":"TEST","topic":"Test","completedDate":"2026-02-01"}' \
  "$FOREMAN_TOKEN"
assert "Foreman POST training (forbidden)" "403"

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}8. Cleanup${NC}"
# ═════════════════════════════════════════════════════════════════════

do_delete "/compliance/documents/$DOC1_ID" "$ADMIN_TOKEN"
assert "DELETE document" "200"

do_delete "/compliance/documents/$DOC2_ID" "$ADMIN_TOKEN"
assert "DELETE second document" "200"

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
  echo -e "${GREEN}Compliance module is fully operational!${NC}"
else
  exit 1
fi
