#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# XO Companion — Run All E2E Tests
# Master runner — executes all test scripts and provides combined summary
# ─────────────────────────────────────────────────────────────────────
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BOLD='\033[1m'
NC='\033[0m'

TOTAL_PASS=0
TOTAL_FAIL=0
RESULTS=()

run_test() {
  local name="$1"
  local script="$2"
  echo -e "\n${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}  Running: $name${NC}"
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

  if [[ ! -f "$SCRIPT_DIR/$script" ]]; then
    RESULTS+=("${YELLOW}⚠️  $name (script not found)${NC}")
    return
  fi

  if bash "$SCRIPT_DIR/$script"; then
    RESULTS+=("${GREEN}✅ $name${NC}")
    TOTAL_PASS=$((TOTAL_PASS + 1))
  else
    RESULTS+=("${RED}❌ $name${NC}")
    TOTAL_FAIL=$((TOTAL_FAIL + 1))
  fi
}

echo -e "\n${BOLD}XO Companion — Full E2E Test Suite${NC}"
echo -e "$(date)\n"

# ─── Core API tests ───
run_test "API Smoke Test" "smoke.sh"
run_test "Compliance Module" "compliance.sh"

# ─── New module tests ───
run_test "Tasks & Reports" "tasks-reports.sh"
run_test "Media & Documents" "media-documents.sh"
run_test "Communications" "communications.sh"
run_test "Inspections" "inspections.sh"
run_test "Notifications" "notifications.sh"

# ─── Tests requiring API keys (skip gracefully if missing) ───
run_test "Voice Pipeline" "voice-pipeline.sh"
run_test "Memory Pipeline" "memory-pipeline.sh"

# ─── Infrastructure tests ───
run_test "Analytics" "analytics.sh"
run_test "Offline Sync Readiness" "offline-sync.sh"

# ─── Summary ───
echo -e "\n${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}  TEST SUITE RESULTS${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
for result in "${RESULTS[@]}"; do
  echo -e "  $result"
done
echo ""

TOTAL=$((TOTAL_PASS + TOTAL_FAIL))
echo -e "${BOLD}  Total: $TOTAL suites — ${GREEN}$TOTAL_PASS passed${NC}, ${RED}$TOTAL_FAIL failed${NC}"
echo ""

if [[ $TOTAL_FAIL -gt 0 ]]; then
  echo -e "${RED}$TOTAL_FAIL test suite(s) failed${NC}"
  exit 1
else
  echo -e "${GREEN}All test suites passed!${NC}"
  exit 0
fi
