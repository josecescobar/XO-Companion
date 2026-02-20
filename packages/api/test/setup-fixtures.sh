#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# XO Companion — Test Fixtures Setup
# Creates test fixture files needed by E2E tests.
# Run once before executing tests, or tests will create them inline.
# ─────────────────────────────────────────────────────────────────────
set -euo pipefail

FIXTURES_DIR="$(cd "$(dirname "$0")" && pwd)/test-fixtures"
mkdir -p "$FIXTURES_DIR"

GREEN='\033[0;32m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${BOLD}XO Companion — Setting up test fixtures${NC}\n"

# ─── 1. Minimal valid JPEG (1x1 white pixel) ───
base64 -d <<'EOF' > "$FIXTURES_DIR/test-photo.jpg"
/9j/4AAQSkZJRgABAQEASABIAAD/2wBDABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0oOjM9PDkz
ODdASFxOQERXRTc4UG1RV19iZ2hnPk1xeXBkeFxlZ2f/2wBDARESEhgVGC8aGC9nQTtBZ2dnZ2dn
Z2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2f/wAARCAABAAEDASIA
AhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAFBABAAAAAAAAAAAAAAAA
AAAACQ/aAAwDAQACEQMRAD8AAqYA/9k=
EOF
echo -e "  ${GREEN}✓${NC} test-photo.jpg ($(wc -c < "$FIXTURES_DIR/test-photo.jpg" | tr -d ' ') bytes)"

# ─── 2. Text document for upload testing ───
cat > "$FIXTURES_DIR/test-document.txt" <<'EOF'
XO Companion Test Document
Project: Riverside Medical Center

Safety Plan Overview:
1. All workers must wear hard hats on site.
2. Fall protection required above 6 feet.
3. Daily toolbox talks at 7:00 AM.
4. Fire extinguishers inspected monthly.
5. OSHA 300 log maintained in site trailer.
6. Material Safety Data Sheets available in break room.
7. Emergency assembly point: parking lot northwest corner.

Specification Reference: Section 01 35 26 - Safety Requirements
CSI Division: 01 - General Requirements

Trade-Specific Requirements:
- Electrical: NFPA 70E compliance required for all live work.
- Concrete: Weather monitoring for cold weather pours below 40°F.
- Steel: Fall protection for all work above 6 feet, 100% tie-off.
- Plumbing: Backflow testing required before final inspection.
EOF
echo -e "  ${GREEN}✓${NC} test-document.txt ($(wc -c < "$FIXTURES_DIR/test-document.txt" | tr -d ' ') bytes)"

# ─── 3. Spec document (simulates a specification excerpt) ───
cat > "$FIXTURES_DIR/test-spec.txt" <<'EOF'
SECTION 03 30 00 - CAST-IN-PLACE CONCRETE

PART 1 - GENERAL
1.01 SUMMARY
A. Section includes: Normal-weight concrete for footings, foundations, slabs,
   columns, beams, and walls.
B. Design mix: 4,000 PSI at 28 days for structural elements.
C. Slump: 4 inches ± 1 inch.

1.02 SUBMITTALS
A. Mix design per ACI 318.
B. Test reports per ASTM C39 (compressive strength).

PART 2 - PRODUCTS
2.01 CONCRETE MATERIALS
A. Cement: Portland Type I/II per ASTM C150.
B. Aggregates: per ASTM C33, maximum size 3/4 inch.
C. Water-cement ratio: 0.45 maximum.

PART 3 - EXECUTION
3.01 PLACEMENT
A. Place within 90 minutes of batching.
B. Vibrate to consolidate — avoid over-vibration.
C. Minimum cover: 3 inches for footings, 1.5 inches for columns.
EOF
echo -e "  ${GREEN}✓${NC} test-spec.txt ($(wc -c < "$FIXTURES_DIR/test-spec.txt" | tr -d ' ') bytes)"

# ─── 4. .gitkeep for version control ───
touch "$FIXTURES_DIR/.gitkeep"

echo -e "\n${GREEN}Test fixtures created in $FIXTURES_DIR${NC}"
echo ""
ls -la "$FIXTURES_DIR"
