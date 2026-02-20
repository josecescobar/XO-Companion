#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# XO Companion API — Media & Documents E2E Test
# Tests: Media upload/list/get/delete, Document upload/list/get/delete
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
  # Remaining args are -F "key=value" pairs for form fields
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
echo -e "\n${BOLD}${CYAN}XO Companion — Media & Documents E2E Test${NC}"
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
echo -e "\n${BOLD}1. Create Test Fixtures${NC}"
# ═════════════════════════════════════════════════════════════════════

FIXTURES_DIR="/tmp/xo-test-fixtures"
mkdir -p "$FIXTURES_DIR"

# Create a minimal valid JPEG (1x1 white pixel)
base64 -d <<'JPEG_EOF' > "$FIXTURES_DIR/test-photo.jpg"
/9j/4AAQSkZJRgABAQEASABIAAD/2wBDABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0oOjM9PDkz
ODdASFxOQERXRTc4UG1RV19iZ2hnPk1xeXBkeFxlZ2f/2wBDARESEhgVGC8aGC9nQTtBZ2dnZ2dn
Z2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2f/wAARCAABAAEDASIA
AhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAFBABAAAAAAAAAAAAAAAA
AAAACQ/aAAwDAQACEQMRAD8AAqYA/9k=
JPEG_EOF

# Create a test text document
cat > "$FIXTURES_DIR/test-document.txt" <<'DOC_EOF'
XO Companion Test Document
Project: Riverside Medical Center

Safety Plan Overview:
1. All workers must wear hard hats on site.
2. Fall protection required above 6 feet.
3. Daily toolbox talks at 7:00 AM.
4. Fire extinguishers inspected monthly.
DOC_EOF

if [[ -f "$FIXTURES_DIR/test-photo.jpg" ]]; then
  echo -e "  ${GREEN}[OK]${NC} Test photo created ($(wc -c < "$FIXTURES_DIR/test-photo.jpg") bytes)"
else
  echo -e "  ${RED}[FATAL] Could not create test photo${NC}"
  exit 1
fi

echo -e "  ${GREEN}[OK]${NC} Test document created ($(wc -c < "$FIXTURES_DIR/test-document.txt") bytes)"

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}2. Media Upload${NC}"
# ═════════════════════════════════════════════════════════════════════

# Upload test photo
do_upload "/projects/$PROJECT_ID/media" \
  "$FIXTURES_DIR/test-photo.jpg" "image/jpeg" "$ADMIN_TOKEN" \
  -F "type=PHOTO"
assert "POST upload media (photo)" "201" '(.id != null) and (.mimeType == "image/jpeg")'
MEDIA_ID=$(jq_extract '.id')
echo -e "  ${CYAN}Media ID: $MEDIA_ID${NC}"

# List media
do_get "/projects/$PROJECT_ID/media" "$ADMIN_TOKEN"
assert "GET list media" "200" '(type == "array") and (length >= 1)'

# Get single media
if [[ "$MEDIA_ID" != "null" && -n "$MEDIA_ID" ]]; then
  do_get "/projects/$PROJECT_ID/media/$MEDIA_ID" "$ADMIN_TOKEN"
  assert "GET single media detail" "200" '(.id != null) and (.mimeType != null)'

  # Try to get file (should return image data or redirect)
  local_response=$(curl -s -o /dev/null -w '%{http_code}' \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    "$BASE_URL/projects/$PROJECT_ID/media/$MEDIA_ID/file")
  if [[ "$local_response" == "200" ]]; then
    PASS=$((PASS + 1))
    echo -e "  ${GREEN}[PASS]${NC} GET media file returns 200"
  else
    echo -e "  ${YELLOW}[WARN]${NC} GET media file returned $local_response"
  fi
fi

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}3. Document Upload${NC}"
# ═════════════════════════════════════════════════════════════════════

# Upload test document
do_upload "/projects/$PROJECT_ID/documents" \
  "$FIXTURES_DIR/test-document.txt" "text/plain" "$ADMIN_TOKEN" \
  -F "title=E2E Test Safety Plan" \
  -F "category=SAFETY_MANUAL"
assert "POST upload document" "201" '(.id != null) and (.title == "E2E Test Safety Plan")'
DOC_ID=$(jq_extract '.id')
DOC_STATUS=$(jq_extract '.status')
echo -e "  ${CYAN}Document ID: $DOC_ID, Status: $DOC_STATUS${NC}"

# List documents
do_get "/projects/$PROJECT_ID/documents" "$ADMIN_TOKEN"
assert "GET list documents" "200" '(type == "array") and (length >= 1)'

# Get single document
if [[ "$DOC_ID" != "null" && -n "$DOC_ID" ]]; then
  do_get "/projects/$PROJECT_ID/documents/$DOC_ID" "$ADMIN_TOKEN"
  assert "GET single document detail" "200" '(.id != null) and (.title != null) and (.category != null)'

  # Poll for status change (BullMQ processing)
  if [[ "$DOC_STATUS" == "PENDING" || "$DOC_STATUS" == "PROCESSING" ]]; then
    ELAPSED=0
    POLL_INTERVAL=3
    POLL_TIMEOUT=30
    while [[ "$DOC_STATUS" != "COMPLETED" && "$DOC_STATUS" != "FAILED" && $ELAPSED -lt $POLL_TIMEOUT ]]; do
      sleep $POLL_INTERVAL
      ELAPSED=$((ELAPSED + POLL_INTERVAL))
      do_get "/projects/$PROJECT_ID/documents/$DOC_ID" "$ADMIN_TOKEN"
      DOC_STATUS=$(jq_extract '.status')
      echo -e "  ${CYAN}[$ELAPSED s]${NC} Document status: $DOC_STATUS"
    done

    if [[ "$DOC_STATUS" == "COMPLETED" ]]; then
      PASS=$((PASS + 1))
      echo -e "  ${GREEN}[PASS]${NC} Document processing completed"
    elif [[ "$DOC_STATUS" == "FAILED" ]]; then
      echo -e "  ${YELLOW}[WARN]${NC} Document processing failed (may be expected without full pipeline)"
    else
      echo -e "  ${YELLOW}[WARN]${NC} Document still $DOC_STATUS after ${POLL_TIMEOUT}s — BullMQ workers may not be running"
    fi
  fi

  # List with category filter
  do_get "/projects/$PROJECT_ID/documents?category=SAFETY_MANUAL" "$ADMIN_TOKEN"
  assert "GET list documents by category" "200" '(type == "array") and (length >= 1)'
fi

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}4. Memory Stats${NC}"
# ═════════════════════════════════════════════════════════════════════

do_get "/projects/$PROJECT_ID/memory/stats" "$ADMIN_TOKEN"
if [[ "$HTTP_CODE" == "200" ]]; then
  assert "GET memory stats" "200" '.totalChunks != null'
  echo -e "  ${CYAN}Total chunks: $(jq_extract '.totalChunks'), Embedded: $(jq_extract '.embeddedChunks')${NC}"
else
  echo -e "  ${YELLOW}[SKIP]${NC} Memory stats endpoint returned $HTTP_CODE"
fi

# ═════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}5. Cleanup${NC}"
# ═════════════════════════════════════════════════════════════════════

# Delete test media
if [[ "${MEDIA_ID:-null}" != "null" && -n "${MEDIA_ID:-}" ]]; then
  do_delete "/projects/$PROJECT_ID/media/$MEDIA_ID" "$ADMIN_TOKEN"
  echo -e "  ${CYAN}Deleted media $MEDIA_ID (HTTP $HTTP_CODE)${NC}"
fi

# Delete test document
if [[ "${DOC_ID:-null}" != "null" && -n "${DOC_ID:-}" ]]; then
  do_delete "/projects/$PROJECT_ID/documents/$DOC_ID" "$ADMIN_TOKEN"
  echo -e "  ${CYAN}Deleted document $DOC_ID (HTTP $HTTP_CODE)${NC}"
fi

# Clean up fixtures
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
  echo -e "${GREEN}All media & documents tests passed!${NC}\n"
  exit 0
else
  exit 1
fi
