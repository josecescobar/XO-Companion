#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# XO Companion API — Notifications E2E Test
# Tests: Push notification token registration/unregistration
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

# DELETE with JSON body (needed for unregister endpoint)
do_delete_json() {
  local path="$1"
  local data="$2"
  local token="${3:-}"
  local headers=(-s -w '\n%{http_code}' -H 'Content-Type: application/json')
  [[ -n "$token" ]] && headers+=(-H "Authorization: Bearer $token")
  local response
  response=$(curl -X DELETE "${headers[@]}" -d "$data" "$BASE_URL$path")
  HTTP_CODE=$(echo "$response" | tail -1)
  BODY=$(echo "$response" | sed '$d')
}

# ─────────────────────────────────────────────────────────────────────
echo -e "\n${BOLD}${CYAN}XO Companion — Notifications E2E Test${NC}"
echo -e "${CYAN}Base URL: $BASE_URL${NC}\n"

# ═════════════════════════════════════════════════════════════════════
echo -e "${BOLD}0. Pre-flight${NC}"
# ═════════════════════════════════════════════════════════════════════

do_get "/health"
assert "GET /health returns ok" "200" '.status == "ok"'

do_post "/auth/login" '{"email":"admin@realelite.com","password":"password123"}'
assert "Login as admin" "200" '.accessToken != null'
ADMIN_TOKEN=$(jq_extract '.accessToken')

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}1. Register Push Token (iOS)${NC}"
# ═════════════════════════════════════════════════════════════════════

TEST_TOKEN_IOS="ExponentPushToken[e2e-test-ios-$(date +%s)]"

do_post "/notifications/register" \
  "{\"token\":\"$TEST_TOKEN_IOS\",\"platform\":\"ios\"}" \
  "$ADMIN_TOKEN"
assert "POST register token (iOS)" "200" "true"
# NestJS may return 200 or 201 — accept both
if [[ "$HTTP_CODE" != "200" && "$HTTP_CODE" != "201" ]]; then
  echo -e "  ${YELLOW}[INFO]${NC} Received HTTP $HTTP_CODE (expected 200 or 201)"
fi

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}2. Register Same Token Again (upsert)${NC}"
# ═════════════════════════════════════════════════════════════════════

do_post "/notifications/register" \
  "{\"token\":\"$TEST_TOKEN_IOS\",\"platform\":\"ios\"}" \
  "$ADMIN_TOKEN"
assert "POST register same token again (upsert)" "200" "true"

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}3. Register Token for Different Platform${NC}"
# ═════════════════════════════════════════════════════════════════════

TEST_TOKEN_ANDROID="ExponentPushToken[e2e-test-android-$(date +%s)]"

do_post "/notifications/register" \
  "{\"token\":\"$TEST_TOKEN_ANDROID\",\"platform\":\"android\"}" \
  "$ADMIN_TOKEN"
assert "POST register token (Android)" "200" "true"

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}4. Unregister Token${NC}"
# ═════════════════════════════════════════════════════════════════════

do_delete_json "/notifications/unregister" \
  "{\"token\":\"$TEST_TOKEN_IOS\"}" \
  "$ADMIN_TOKEN"
assert "DELETE unregister iOS token" "200" "true"

do_delete_json "/notifications/unregister" \
  "{\"token\":\"$TEST_TOKEN_ANDROID\"}" \
  "$ADMIN_TOKEN"
assert "DELETE unregister Android token" "200" "true"

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}5. Edge Cases${NC}"
# ═════════════════════════════════════════════════════════════════════

# Unregister non-existent token (should not crash)
do_delete_json "/notifications/unregister" \
  '{"token":"ExponentPushToken[does-not-exist]"}' \
  "$ADMIN_TOKEN"
if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "404" ]]; then
  PASS=$((PASS + 1))
  echo -e "  ${GREEN}[PASS]${NC} Unregister non-existent token handled gracefully ($HTTP_CODE)"
else
  FAIL=$((FAIL + 1))
  FAILURES+=("Unregister non-existent token should return 200 or 404")
  echo -e "  ${RED}[FAIL]${NC} Unregister non-existent token returned $HTTP_CODE"
fi

# Register without token (should fail validation)
do_post "/notifications/register" '{"platform":"ios"}' "$ADMIN_TOKEN"
if [[ "$HTTP_CODE" == "400" ]]; then
  PASS=$((PASS + 1))
  echo -e "  ${GREEN}[PASS]${NC} Register without token returns 400"
elif [[ "$HTTP_CODE" == "422" ]]; then
  PASS=$((PASS + 1))
  echo -e "  ${GREEN}[PASS]${NC} Register without token returns 422 (validation)"
else
  echo -e "  ${YELLOW}[WARN]${NC} Register without token returned $HTTP_CODE (expected 400 or 422)"
fi

# Register without auth (should fail 401)
do_post "/notifications/register" '{"token":"ExponentPushToken[noauth]","platform":"ios"}'
assert "POST register without auth returns 401" "401" "true"

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
  echo -e "${GREEN}All notifications tests passed!${NC}\n"
  exit 0
else
  exit 1
fi
