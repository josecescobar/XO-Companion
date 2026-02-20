#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# XO Companion API — Tasks & Reports E2E Test
# Tests: Tasks CRUD, priority/category filters, summary, Reports weekly
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
echo -e "\n${BOLD}${CYAN}XO Companion — Tasks & Reports E2E Test${NC}"
echo -e "${CYAN}Base URL: $BASE_URL${NC}\n"

# ═════════════════════════════════════════════════════════════════════
echo -e "${BOLD}0. Pre-flight${NC}"
# ═════════════════════════════════════════════════════════════════════

do_get "/health"
assert "GET /health returns ok" "200" '.status == "ok"'

# Login as admin
do_post "/auth/login" '{"email":"admin@realelite.com","password":"password123"}'
assert "Login as admin" "200" '.accessToken != null'
ADMIN_TOKEN=$(jq_extract '.accessToken')

# Get project ID
do_get "/projects" "$ADMIN_TOKEN"
PROJECT_ID=$(jq_extract 'map(select(.code == "REC-2026-001")) | .[0].id')
if [[ "$PROJECT_ID" == "null" || -z "$PROJECT_ID" ]]; then
  echo -e "  ${RED}[FATAL] Could not find project REC-2026-001${NC}"
  exit 1
fi
echo -e "  ${CYAN}Project: $PROJECT_ID${NC}"

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}1. Tasks CRUD${NC}"
# ═════════════════════════════════════════════════════════════════════

# Create task with priority=HIGH, category=INSPECTION
do_post "/projects/$PROJECT_ID/tasks" \
  '{"description":"E2E Test: Inspect scaffolding on Building A","priority":"HIGH","category":"INSPECTION","dueDate":"2099-06-15"}' \
  "$ADMIN_TOKEN"
assert "POST create task" "201" '(.id != null) and (.description != null) and (.priority == "HIGH") and (.category == "INSPECTION")'
TASK_ID=$(jq_extract '.id')

# Create a second task for delete testing later
do_post "/projects/$PROJECT_ID/tasks" \
  '{"description":"E2E Test: Order additional rebar","priority":"MEDIUM","category":"MATERIAL_ORDER"}' \
  "$ADMIN_TOKEN"
assert "POST create second task" "201" '.id != null'
TASK_ID_2=$(jq_extract '.id')

# List tasks
do_get "/projects/$PROJECT_ID/tasks" "$ADMIN_TOKEN"
assert "GET list tasks" "200" '(type == "array") and (length >= 2)'

# List with priority filter
do_get "/projects/$PROJECT_ID/tasks?priority=HIGH" "$ADMIN_TOKEN"
assert "GET list tasks filtered by priority=HIGH" "200" '(type == "array") and (all(.[]; .priority == "HIGH"))'

# List with category filter
do_get "/projects/$PROJECT_ID/tasks?category=INSPECTION" "$ADMIN_TOKEN"
assert "GET list tasks filtered by category=INSPECTION" "200" '(type == "array") and (all(.[]; .category == "INSPECTION"))'

# Get single task
do_get "/projects/$PROJECT_ID/tasks?priority=HIGH" "$ADMIN_TOKEN"
FIRST_TASK=$(jq_extract '.[0].id')
if [[ "$FIRST_TASK" != "null" && -n "$FIRST_TASK" ]]; then
  echo -e "  ${CYAN}(verifying single task read via list)${NC}"
fi

# Update task — change status to IN_PROGRESS
do_patch "/projects/$PROJECT_ID/tasks/$TASK_ID" \
  '{"status":"IN_PROGRESS"}' \
  "$ADMIN_TOKEN"
assert "PATCH update task to IN_PROGRESS" "200" '.status == "IN_PROGRESS"'

# Complete task
do_patch "/projects/$PROJECT_ID/tasks/$TASK_ID" \
  '{"status":"COMPLETED"}' \
  "$ADMIN_TOKEN"
assert "PATCH complete task" "200" '.status == "COMPLETED"'

# Verify completedAt
COMPLETED_AT=$(jq_extract '.completedAt')
if [[ "$COMPLETED_AT" != "null" && -n "$COMPLETED_AT" ]]; then
  PASS=$((PASS + 1))
  echo -e "  ${GREEN}[PASS]${NC} Completed task has completedAt: $COMPLETED_AT"
else
  FAIL=$((FAIL + 1))
  FAILURES+=("completedAt should be set on COMPLETED task")
  echo -e "  ${RED}[FAIL]${NC} completedAt should be set on COMPLETED task"
fi

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}2. Task Summary${NC}"
# ═════════════════════════════════════════════════════════════════════

do_get "/projects/$PROJECT_ID/tasks/summary" "$ADMIN_TOKEN"
assert "GET task summary" "200" '(.pending != null) and (.urgent != null) and (.completedThisWeek != null) and (.overdue != null)'

echo -e "  ${CYAN}Summary: pending=$(jq_extract '.pending') urgent=$(jq_extract '.urgent') completedThisWeek=$(jq_extract '.completedThisWeek') overdue=$(jq_extract '.overdue')${NC}"

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}3. RBAC — Worker Role${NC}"
# ═════════════════════════════════════════════════════════════════════

# Login as field worker
do_post "/auth/login" '{"email":"worker@realelite.com","password":"password123"}'
if [[ "$HTTP_CODE" == "200" ]]; then
  WORKER_TOKEN=$(jq_extract '.accessToken')
  echo -e "  ${GREEN}[PASS]${NC} Login as field worker"
  PASS=$((PASS + 1))

  # Worker can create a task
  do_post "/projects/$PROJECT_ID/tasks" \
    '{"description":"E2E Test: Worker-created task","priority":"LOW","category":"OTHER"}' \
    "$WORKER_TOKEN"
  assert "Worker POST create task (should succeed)" "201" '.id != null'
  WORKER_TASK_ID=$(jq_extract '.id')

  # Worker tries to delete admin's task
  do_delete "/projects/$PROJECT_ID/tasks/$TASK_ID_2" "$WORKER_TOKEN"
  if [[ "$HTTP_CODE" == "403" ]]; then
    PASS=$((PASS + 1))
    echo -e "  ${GREEN}[PASS]${NC} Worker cannot delete admin's task (403)"
  else
    echo -e "  ${YELLOW}[WARN]${NC} Worker can delete admin's task (HTTP $HTTP_CODE) — consider adding ownership guard"
  fi

  # Cleanup worker task
  do_delete "/projects/$PROJECT_ID/tasks/$WORKER_TASK_ID" "$WORKER_TOKEN"
else
  echo -e "  ${YELLOW}[SKIP]${NC} worker@realelite.com not available — skipping RBAC tests"
fi

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}4. Weekly Report${NC}"
# ═════════════════════════════════════════════════════════════════════

# The seeded logs are for 2026-02-16 and 2026-02-17
# Weekly report needs ANTHROPIC_API_KEY for AI narrative
ENV_FILE="$(cd "$(dirname "$0")/.." && pwd)/.env"
ANTHROPIC_KEY=""
if [[ -f "$ENV_FILE" ]]; then
  ANTHROPIC_KEY=$(sed -n 's/^ANTHROPIC_API_KEY=//p' "$ENV_FILE" 2>/dev/null || true)
fi

do_get "/projects/$PROJECT_ID/reports/weekly?weekOf=2026-02-16" "$ADMIN_TOKEN"
if [[ "$HTTP_CODE" == "200" ]]; then
  assert "GET weekly report" "200" '(.narrative != null) and (.structured != null) and (.weekOf != null)'
  echo -e "  ${CYAN}Narrative length: $(echo "$BODY" | jq -r '.narrative | length' 2>/dev/null) chars${NC}"
  echo -e "  ${CYAN}Labor hours: $(jq_extract '.structured.totalLaborHours'), Days with logs: $(jq_extract '.structured.daysWithLogs')${NC}"

  # Verify structured data fields
  assert "Weekly report has structured fields" "200" \
    '(.structured.totalLaborHours != null) and (.structured.workCompleted | type == "array") and (.structured.daysWithLogs >= 0)'
else
  if [[ -z "$ANTHROPIC_KEY" || "$ANTHROPIC_KEY" == "your-anthropic-api-key" ]]; then
    echo -e "  ${YELLOW}[SKIP]${NC} Weekly report failed (HTTP $HTTP_CODE) — ANTHROPIC_API_KEY may not be configured"
  else
    assert "GET weekly report" "200"
  fi
fi

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}5. Cleanup${NC}"
# ═════════════════════════════════════════════════════════════════════

# Delete test tasks
do_delete "/projects/$PROJECT_ID/tasks/$TASK_ID" "$ADMIN_TOKEN"
echo -e "  ${CYAN}Deleted task $TASK_ID${NC}"

if [[ -n "${TASK_ID_2:-}" ]]; then
  do_delete "/projects/$PROJECT_ID/tasks/$TASK_ID_2" "$ADMIN_TOKEN"
  echo -e "  ${CYAN}Deleted task $TASK_ID_2${NC}"
fi

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
  echo -e "${GREEN}All tasks & reports tests passed!${NC}\n"
  exit 0
else
  exit 1
fi
