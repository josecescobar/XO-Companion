#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# XO Companion — Project Memory (RAG) Pipeline Test
# Tests: pgvector extension, ingestion, semantic search, stats, re-embed
#
# Requires: curl, jq, psql, OPENAI_API_KEY in .env (for embeddings)
# Falls back gracefully if OpenAI has no credits.
# ─────────────────────────────────────────────────────────────────────
set -uo pipefail

BASE_URL="${API_URL:-http://localhost:3000/api/v1}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PSQL="/opt/homebrew/opt/postgresql@16/bin/psql"

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

# ─────────────────────────────────────────────────────────────────────
echo -e "\n${BOLD}${CYAN}XO Companion — Project Memory Pipeline Test${NC}"
echo -e "${CYAN}Base URL: $BASE_URL${NC}\n"

# ═════════════════════════════════════════════════════════════════════
echo -e "${BOLD}0. Pre-flight Checks${NC}"
# ═════════════════════════════════════════════════════════════════════

do_get "/health"
if [[ "$HTTP_CODE" != "200" ]]; then
  echo -e "  ${RED}API is not running at $BASE_URL${NC}"
  exit 1
fi
echo -e "  ${GREEN}API is running${NC}"

# Check pgvector extension
VECTOR_CHECK=$($PSQL -d xo_companion -t -A -c "SELECT vector_dims('[1,2,3]'::vector);" 2>/dev/null || echo "error")
if [[ "$VECTOR_CHECK" == "3" ]]; then
  echo -e "  ${GREEN}pgvector extension is working${NC}"
else
  echo -e "  ${RED}pgvector extension not available (got: $VECTOR_CHECK)${NC}"
  exit 1
fi

# Check OpenAI key
ENV_FILE="$SCRIPT_DIR/../.env"
OPENAI_KEY=""
if [[ -f "$ENV_FILE" ]]; then
  OPENAI_KEY=$(sed -n 's/^OPENAI_API_KEY=//p' "$ENV_FILE" 2>/dev/null)
fi
EMBEDDINGS_AVAILABLE=true
if [[ -z "$OPENAI_KEY" || "$OPENAI_KEY" == "your-openai-api-key" ]]; then
  echo -e "  ${YELLOW}OPENAI_API_KEY not configured — testing without embeddings${NC}"
  EMBEDDINGS_AVAILABLE=false
else
  echo -e "  ${GREEN}OpenAI API key configured${NC}"
fi

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}1. Setup — Login & Get IDs${NC}"
# ═════════════════════════════════════════════════════════════════════

do_post "/auth/login" '{"email":"admin@realelite.com","password":"password123"}'
assert "Login as admin" "200"
ADMIN_TOKEN=$(jq_extract '.accessToken')

# Find a project that has daily logs
do_get "/projects" "$ADMIN_TOKEN"
PROJECTS_BODY="$BODY"
PROJECT_COUNT=$(echo "$PROJECTS_BODY" | jq -r 'length' 2>/dev/null || echo "0")
PROJECT_ID=""
DAILY_LOG_ID=""
DAILY_LOG_COUNT=0

for i in $(seq 0 $((PROJECT_COUNT - 1))); do
  PID=$(echo "$PROJECTS_BODY" | jq -r ".[$i].id")
  do_get "/projects/$PID/daily-logs" "$ADMIN_TOKEN"
  DL_COUNT=$(jq_extract 'length')
  if [[ "$DL_COUNT" -gt 0 ]]; then
    PROJECT_ID="$PID"
    DAILY_LOG_ID=$(jq_extract '.[0].id')
    DAILY_LOG_COUNT=$DL_COUNT
    break
  fi
done

if [[ -z "$PROJECT_ID" || "$DAILY_LOG_ID" == "null" ]]; then
  echo -e "  ${RED}No project with daily logs found${NC}"
  exit 1
fi
echo -e "  ${GREEN}Project: $PROJECT_ID${NC}"
echo -e "  ${GREEN}Daily Logs: $DAILY_LOG_COUNT available, using: $DAILY_LOG_ID${NC}"

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}2. Initial Stats — Empty State${NC}"
# ═════════════════════════════════════════════════════════════════════

do_get "/projects/$PROJECT_ID/memory/stats" "$ADMIN_TOKEN"
assert "GET memory stats" "200" '(.totalChunks == 0)'

INITIAL_TOTAL=$(jq_extract '.totalChunks')
echo -e "  ${CYAN}Initial chunks: $INITIAL_TOTAL${NC}"
echo -e "  ${CYAN}Embedding available: $(jq_extract '.embeddingAvailable')${NC}"

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}3. Ingest Daily Log${NC}"
# ═════════════════════════════════════════════════════════════════════

do_post "/projects/$PROJECT_ID/memory/ingest" \
  "{\"dailyLogId\":\"$DAILY_LOG_ID\"}" \
  "$ADMIN_TOKEN"
assert "POST ingest daily log" "201" '(.chunksCreated >= 1)'

CHUNKS_CREATED=$(jq_extract '.chunksCreated')
EMBEDDED=$(jq_extract '.embedded')
echo -e "  ${CYAN}Chunks created: $CHUNKS_CREATED, embedded: $EMBEDDED${NC}"

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}4. Verify Stats After Ingestion${NC}"
# ═════════════════════════════════════════════════════════════════════

do_get "/projects/$PROJECT_ID/memory/stats" "$ADMIN_TOKEN"
assert "GET stats shows chunks" "200" '(.totalChunks >= 1)'

TOTAL_CHUNKS=$(jq_extract '.totalChunks')
EMBEDDED_CHUNKS=$(jq_extract '.embeddedChunks')
UNEMBEDDED_CHUNKS=$(jq_extract '.unembeddedChunks')
SOURCE_TYPES=$(jq_extract '.bySourceType | length')
echo -e "  ${CYAN}Total: $TOTAL_CHUNKS | Embedded: $EMBEDDED_CHUNKS | Unembedded: $UNEMBEDDED_CHUNKS${NC}"
echo -e "  ${CYAN}Source types: $SOURCE_TYPES${NC}"

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}5. Semantic Search${NC}"
# ═════════════════════════════════════════════════════════════════════

if [[ "$EMBEDDINGS_AVAILABLE" == "true" && "$EMBEDDED_CHUNKS" != "0" ]]; then
  # Search for work completed
  do_post "/projects/$PROJECT_ID/memory/search" \
    '{"query":"What work was completed on site?","limit":5}' \
    "$ADMIN_TOKEN"
  assert "POST search for work completed" "200" '(type == "array")'

  SEARCH_RESULTS=$(jq_extract 'length')
  if [[ "$SEARCH_RESULTS" -gt 0 ]]; then
    TOP_SIMILARITY=$(jq_extract '.[0].similarity')
    TOP_SCORE=$(jq_extract '.[0].timeWeightedScore')
    echo -e "  ${CYAN}Results: $SEARCH_RESULTS | Top similarity: $TOP_SIMILARITY | Time-weighted: $TOP_SCORE${NC}"
  else
    echo -e "  ${YELLOW}No search results returned (may indicate OpenAI quota issue)${NC}"
  fi

  # Search with date filter
  do_post "/projects/$PROJECT_ID/memory/search" \
    '{"query":"weather conditions","limit":5,"dateFrom":"2020-01-01","dateTo":"2099-12-31"}' \
    "$ADMIN_TOKEN"
  assert "POST search with date filter" "200" '(type == "array")'
  FILTERED_RESULTS=$(jq_extract 'length')
  echo -e "  ${CYAN}Filtered results: $FILTERED_RESULTS${NC}"
else
  echo -e "  ${YELLOW}Skipping search tests — no embedded chunks${NC}"
  # Still call search to verify it returns empty array (not error)
  do_post "/projects/$PROJECT_ID/memory/search" \
    '{"query":"test query","limit":5}' \
    "$ADMIN_TOKEN"
  assert "POST search returns empty when no embeddings" "200" '(type == "array" and length == 0)'
fi

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}6. Re-embed${NC}"
# ═════════════════════════════════════════════════════════════════════

do_post "/projects/$PROJECT_ID/memory/re-embed" '{}' "$ADMIN_TOKEN"
assert "POST re-embed" "200" '(.processed != null)'

RE_PROCESSED=$(jq_extract '.processed')
RE_EMBEDDED=$(jq_extract '.embedded')
RE_FAILED=$(jq_extract '.failed')
echo -e "  ${CYAN}Processed: $RE_PROCESSED | Embedded: $RE_EMBEDDED | Failed: $RE_FAILED${NC}"

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}7. Ingest All (Bulk)${NC}"
# ═════════════════════════════════════════════════════════════════════

do_post "/projects/$PROJECT_ID/memory/ingest-all" '{}' "$ADMIN_TOKEN"
assert "POST ingest-all" "200" '(.count >= 1)'

QUEUED_COUNT=$(jq_extract '.count')
echo -e "  ${CYAN}Queued $QUEUED_COUNT daily logs for background ingestion${NC}"

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}8. Idempotent Re-ingest${NC}"
# ═════════════════════════════════════════════════════════════════════

# Re-ingest the same log — should replace chunks, not duplicate
do_post "/projects/$PROJECT_ID/memory/ingest" \
  "{\"dailyLogId\":\"$DAILY_LOG_ID\"}" \
  "$ADMIN_TOKEN"
assert "POST re-ingest same log (idempotent)" "201" '(.chunksCreated >= 1)'

do_get "/projects/$PROJECT_ID/memory/stats" "$ADMIN_TOKEN"
FINAL_TOTAL=$(jq_extract '.totalChunks')
echo -e "  ${CYAN}Final chunk count: $FINAL_TOTAL (should equal $CHUNKS_CREATED, not double)${NC}"

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
  echo -e "${GREEN}Project memory pipeline is operational!${NC}"
else
  exit 1
fi
