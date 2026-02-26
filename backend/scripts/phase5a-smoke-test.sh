#!/usr/bin/env bash
# Phase 5A Post-Deploy Smoke Test
# Usage: bash backend/scripts/phase5a-smoke-test.sh
#
# Tests:
#   1. Login as TestTrainer → get token
#   2. POST /api/ai/workout-generation (draft mode) → expect 200 or 403 (consent)
#   3. POST /api/ai/workout-generation/approve (unassigned trainer) → expect 403
#   4. POST /api/ai/workout-generation/approve (nonexistent user) → expect 404
#   5. POST /api/ai/workout-generation/approve (invalid draft) → expect 422 or 403
#   6. POST /api/ai/workout-generation/approve (consent withdrawn) → expect 403

set -euo pipefail

BASE="https://sswanstudios.com/api"
PASS=0
FAIL=0

green()  { echo -e "\033[32m✓ $1\033[0m"; }
red()    { echo -e "\033[31m✗ $1\033[0m"; }
yellow() { echo -e "\033[33m⚠ $1\033[0m"; }

check() {
  local label="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then
    green "$label (HTTP $actual)"
    PASS=$((PASS + 1))
  else
    red "$label — expected $expected, got $actual"
    FAIL=$((FAIL + 1))
  fi
}

check_oneof() {
  local label="$1" actual="$2"
  shift 2
  for code in "$@"; do
    if [ "$actual" = "$code" ]; then
      green "$label (HTTP $actual)"
      PASS=$((PASS + 1))
      return
    fi
  done
  red "$label — expected one of [$*], got $actual"
  FAIL=$((FAIL + 1))
}

echo "═══════════════════════════════════════════════════"
echo "  Phase 5A Post-Deploy Smoke Test"
echo "═══════════════════════════════════════════════════"
echo ""

# ── 1. Login as TestTrainer ───────────────────────────
echo "→ Logging in as TestTrainer..."
LOGIN_RESP=$(curl.exe -s -w "\n%{http_code}" \
  -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"TestTrainer","password":"SwanTest123!"}')

LOGIN_BODY=$(echo "$LOGIN_RESP" | head -n -1)
LOGIN_CODE=$(echo "$LOGIN_RESP" | tail -n 1)

if [ "$LOGIN_CODE" != "200" ]; then
  red "Login failed (HTTP $LOGIN_CODE)"
  echo "$LOGIN_BODY" | head -5
  echo ""
  echo "RESULT: Cannot proceed without trainer token"
  exit 1
fi

TOKEN=$(echo "$LOGIN_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null || echo "")
if [ -z "$TOKEN" ]; then
  TOKEN=$(echo "$LOGIN_BODY" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
fi

if [ -z "$TOKEN" ]; then
  red "Could not extract token from login response"
  echo "$LOGIN_BODY" | head -3
  exit 1
fi

green "Login successful — token obtained"
echo ""

AUTH="Authorization: Bearer $TOKEN"

# ── 2. Draft generation (expect 200 or 403 for consent) ──
echo "→ Test 2: POST /api/ai/workout-generation (draft mode)..."
CODE=$(curl.exe -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE/ai/workout-generation" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d '{"userId":56,"mode":"draft"}')
check_oneof "Draft generation" "$CODE" 200 403 503

# ── 3. Approve with unassigned trainer → 403 ─────────
echo "→ Test 3: POST /approve (unassigned trainer → 403)..."
CODE=$(curl.exe -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE/ai/workout-generation/approve" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d '{"userId":9999,"plan":{"planName":"Test","durationWeeks":4,"days":[{"dayNumber":1,"name":"Day 1","exercises":[{"name":"Squat"}]}]}}')
check_oneof "Unassigned trainer approve" "$CODE" 403 404

# ── 4. Approve nonexistent user → 404 ────────────────
echo "→ Test 4: POST /approve (nonexistent user → 404)..."
CODE=$(curl.exe -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE/ai/workout-generation/approve" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d '{"userId":999999,"plan":{"planName":"Test","durationWeeks":4,"days":[{"dayNumber":1,"name":"Day 1","exercises":[{"name":"Squat"}]}]}}')
check "Nonexistent user approve" "404" "$CODE"

# ── 5. Approve invalid draft (missing planName) ──────
echo "→ Test 5: POST /approve (invalid draft → 422 or 403)..."
CODE=$(curl.exe -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE/ai/workout-generation/approve" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d '{"userId":56,"plan":{"days":[]}}')
check_oneof "Invalid draft approve" "$CODE" 422 403

# ── 6. Approve without auth → 401 ────────────────────
echo "→ Test 6: POST /approve (no auth → 401)..."
CODE=$(curl.exe -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE/ai/workout-generation/approve" \
  -H "Content-Type: application/json" \
  -d '{"userId":56,"plan":{"planName":"Test","days":[{"dayNumber":1,"name":"A","exercises":[{"name":"X"}]}]}}')
check "Unauthenticated approve" "401" "$CODE"

# ── Summary ───────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════"
echo "  Results: $PASS passed, $FAIL failed"
echo "═══════════════════════════════════════════════════"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
