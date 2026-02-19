#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# XO Companion — E2E Voice Pipeline Test
# Tests the full voice-to-data pipeline:
#   Upload audio → Transcribe (AssemblyAI) → Extract (Claude) → Apply to daily log
#
# Requires: curl, jq, real API keys in .env
#   - ASSEMBLYAI_API_KEY
#   - ANTHROPIC_API_KEY (or OPENAI_API_KEY for fallback model)
# ─────────────────────────────────────────────────────────────────────
set -uo pipefail

BASE_URL="${API_URL:-http://localhost:3000/api/v1}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
AUDIO_FILE="$SCRIPT_DIR/test-audio/sample-daily-log.m4a"
POLL_INTERVAL=5
POLL_TIMEOUT=180

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

do_upload() {
  local path="$1"
  local file="$2"
  local token="$3"
  local response
  response=$(curl -s -w '\n%{http_code}' \
    -H "Authorization: Bearer $token" \
    -F "audio=@$file;type=audio/mp4" \
    "$BASE_URL$path")
  HTTP_CODE=$(echo "$response" | tail -1)
  BODY=$(echo "$response" | sed '$d')
}

# ─────────────────────────────────────────────────────────────────────
echo -e "\n${BOLD}${CYAN}XO Companion — Voice Pipeline E2E Test${NC}"
echo -e "${CYAN}Base URL: $BASE_URL${NC}\n"

# ═════════════════════════════════════════════════════════════════════
echo -e "${BOLD}0. Pre-flight Checks${NC}"
# ═════════════════════════════════════════════════════════════════════

# Check API is running
do_get "/health"
if [[ "$HTTP_CODE" != "200" ]]; then
  echo -e "  ${RED}API is not running at $BASE_URL${NC}"
  exit 1
fi
echo -e "  ${GREEN}API is running${NC}"

# Check audio file exists
if [[ ! -f "$AUDIO_FILE" ]]; then
  echo -e "  ${RED}Test audio file not found: $AUDIO_FILE${NC}"
  echo -e "  ${YELLOW}Generate it with:${NC}"
  echo "    say -o test-audio/sample-daily-log.aiff \"Today we had 4 carpenters...\""
  echo "    ffmpeg -i test-audio/sample-daily-log.aiff -c:a aac test-audio/sample-daily-log.m4a"
  exit 1
fi
echo -e "  ${GREEN}Test audio file found: $(du -h "$AUDIO_FILE" | cut -f1) ${NC}"

# Check API keys by reading .env
ENV_FILE="$SCRIPT_DIR/../.env"
if [[ -f "$ENV_FILE" ]]; then
  ASSEMBLYAI_KEY=$(sed -n 's/^ASSEMBLYAI_API_KEY=//p' "$ENV_FILE" 2>/dev/null)
  ANTHROPIC_KEY=$(sed -n 's/^ANTHROPIC_API_KEY=//p' "$ENV_FILE" 2>/dev/null)
else
  ASSEMBLYAI_KEY=""
  ANTHROPIC_KEY=""
fi

if [[ -z "$ASSEMBLYAI_KEY" || "$ASSEMBLYAI_KEY" == "placeholder" ]]; then
  echo -e "\n  ${YELLOW}ASSEMBLYAI_API_KEY not configured in .env${NC}"
  echo -e "  ${YELLOW}Skipping voice pipeline test (requires real API keys)${NC}"
  echo -e "  ${YELLOW}Sign up at https://assemblyai.com for \$50 free credit${NC}\n"
  exit 0
fi

if [[ -z "$ANTHROPIC_KEY" || "$ANTHROPIC_KEY" == "placeholder" ]]; then
  echo -e "\n  ${YELLOW}ANTHROPIC_API_KEY not configured in .env${NC}"
  echo -e "  ${YELLOW}Skipping voice pipeline test (requires real API keys)${NC}\n"
  exit 0
fi

echo -e "  ${GREEN}API keys configured${NC}"

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}1. Setup — Login & Get IDs${NC}"
# ═════════════════════════════════════════════════════════════════════

# Login as foreman (project member)
do_post "/auth/login" '{"email":"foreman@realelite.com","password":"password123"}'
assert "Login as foreman" "200" '.user.role == "FOREMAN"'
TOKEN=$(jq_extract '.accessToken')

# Get project ID
do_get "/projects" "$TOKEN"
PROJECT_ID=$(jq_extract 'map(select(.code == "REC-2026-001")) | .[0].id')
if [[ "$PROJECT_ID" == "null" || -z "$PROJECT_ID" ]]; then
  echo -e "  ${RED}[FATAL] Could not find project REC-2026-001${NC}"
  exit 1
fi
echo -e "  ${GREEN}Project: $PROJECT_ID${NC}"

# Create a fresh daily log for the voice test (unique date)
VOICE_DATE=$(printf "2098-%02d-%02d" $(( (RANDOM % 12) + 1 )) $(( (RANDOM % 28) + 1 )))
do_post "/projects/$PROJECT_ID/daily-logs" \
  "{\"logDate\":\"$VOICE_DATE\",\"notes\":\"Voice pipeline test log\"}" \
  "$TOKEN"
assert "Create test daily log" "201" '.status == "DRAFT"'
LOG_ID=$(jq_extract '.id')
echo -e "  ${GREEN}Daily Log: $LOG_ID ($VOICE_DATE)${NC}"

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}2. Upload Voice Note${NC}"
# ═════════════════════════════════════════════════════════════════════

do_upload "/projects/$PROJECT_ID/daily-logs/$LOG_ID/voice/upload" "$AUDIO_FILE" "$TOKEN"
assert "Upload voice note" "202" '(.id != null) and (.status != null)'
VOICE_ID=$(jq_extract '.id')
echo -e "  ${GREEN}Voice Note ID: $VOICE_ID${NC}"

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}3. Poll Processing Status${NC}"
# ═════════════════════════════════════════════════════════════════════

ELAPSED=0
STATUS="UPLOADING"
while [[ "$STATUS" != "REVIEW_READY" && "$STATUS" != "PROCESSED" && "$STATUS" != "FAILED" && $ELAPSED -lt $POLL_TIMEOUT ]]; do
  sleep $POLL_INTERVAL
  ELAPSED=$((ELAPSED + POLL_INTERVAL))
  do_get "/projects/$PROJECT_ID/daily-logs/$LOG_ID/voice/$VOICE_ID" "$TOKEN"
  STATUS=$(jq_extract '.status')
  echo -e "  ${CYAN}[$ELAPSED s]${NC} Status: $STATUS"
done

if [[ "$STATUS" == "FAILED" ]]; then
  ERROR=$(jq_extract '.processingError')
  echo -e "  ${RED}[FAIL] Pipeline FAILED: $ERROR${NC}"
  FAIL=$((FAIL + 1))
  FAILURES+=("Pipeline processing")
elif [[ $ELAPSED -ge $POLL_TIMEOUT ]]; then
  echo -e "  ${RED}[FAIL] Timed out after ${POLL_TIMEOUT}s (status: $STATUS)${NC}"
  FAIL=$((FAIL + 1))
  FAILURES+=("Pipeline timeout")
else
  PASS=$((PASS + 1))
  DURATION=$(jq_extract '.durationSeconds')
  echo -e "  ${GREEN}[PASS]${NC} Processing complete — status: $STATUS, duration: ${DURATION}s"
fi

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}4. Verify Extracted Data${NC}"
# ═════════════════════════════════════════════════════════════════════

if [[ "$STATUS" == "REVIEW_READY" || "$STATUS" == "PROCESSED" ]]; then
  do_get "/projects/$PROJECT_ID/daily-logs/$LOG_ID/voice/$VOICE_ID/extracted" "$TOKEN"
  assert "GET extracted data" "200" '(.extractedData != null) and (.transcript != null)'

  # Check extraction quality — the test audio mentions carpenters, bobcat, weather, delays, safety
  WORKFORCE_COUNT=$(echo "$BODY" | jq '.extractedData.workforce | length' 2>/dev/null || echo 0)
  HAS_WEATHER=$(echo "$BODY" | jq '.extractedData.weather != null' 2>/dev/null || echo false)
  DELAY_COUNT=$(echo "$BODY" | jq '.extractedData.delays | length' 2>/dev/null || echo 0)
  HAS_SAFETY=$(echo "$BODY" | jq '.extractedData.safety != null' 2>/dev/null || echo false)

  echo -e "  ${CYAN}Extraction results:${NC}"
  echo -e "    Workforce entries: $WORKFORCE_COUNT"
  echo -e "    Weather extracted: $HAS_WEATHER"
  echo -e "    Delay entries: $DELAY_COUNT"
  echo -e "    Safety extracted: $HAS_SAFETY"

  if [[ "$WORKFORCE_COUNT" -ge 1 ]]; then
    PASS=$((PASS + 1))
    echo -e "  ${GREEN}[PASS]${NC} Extraction produced workforce data"
  else
    FAIL=$((FAIL + 1))
    FAILURES+=("Extraction quality — no workforce")
    echo -e "  ${RED}[FAIL]${NC} No workforce entries extracted"
  fi

  # ═════════════════════════════════════════════════════════════════
  echo -e "\n${BOLD}5. Apply Extracted Data to Daily Log${NC}"
  # ═════════════════════════════════════════════════════════════════

  do_post "/projects/$PROJECT_ID/daily-logs/$LOG_ID/voice/$VOICE_ID/apply" '{}' "$TOKEN"
  assert "POST apply extracted data" "201" '(.workforce | length >= 1) or (.weather != null)'

  # Verify daily log now has sub-entries
  do_get "/projects/$PROJECT_ID/daily-logs/$LOG_ID" "$TOKEN"
  assert "Daily log has AI-populated data" "200" \
    '(.workforce | length >= 1) or (.weather != null) or (.delays | length >= 1)'

  # Show what was populated
  WF=$(echo "$BODY" | jq '.workforce | length' 2>/dev/null || echo 0)
  EQ=$(echo "$BODY" | jq '.equipment | length' 2>/dev/null || echo 0)
  WC=$(echo "$BODY" | jq '.workCompleted | length' 2>/dev/null || echo 0)
  DL=$(echo "$BODY" | jq '.delays | length' 2>/dev/null || echo 0)
  HW=$(echo "$BODY" | jq 'if .weather then 1 else 0 end' 2>/dev/null || echo 0)
  HS=$(echo "$BODY" | jq 'if .safety then 1 else 0 end' 2>/dev/null || echo 0)

  echo -e "\n  ${CYAN}Daily log populated:${NC}"
  echo -e "    Workforce: $WF | Equipment: $EQ | Work Completed: $WC"
  echo -e "    Delays: $DL | Weather: $HW | Safety: $HS"
fi

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

echo -e "\n${GREEN}Voice pipeline is fully operational!${NC}\n"
exit 0
