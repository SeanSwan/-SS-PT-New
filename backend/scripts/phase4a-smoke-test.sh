#!/bin/bash
# Phase 4A Post-Deploy Smoke Test
# Usage: bash backend/scripts/phase4a-smoke-test.sh <ADMIN_TOKEN> <TRAINER_TOKEN> <CLIENT_TOKEN>
#
# Runs 13 checks (11 standard + 2 extra) against sswanstudios.com
# Records status codes and schema presence/absence

BASE="https://sswanstudios.com"
ADMIN_TOKEN="$1"
TRAINER_TOKEN="$2"
CLIENT_TOKEN="$3"
TEMPLATE_ID="opt-phase-1-stabilization"

if [ -z "$ADMIN_TOKEN" ] || [ -z "$TRAINER_TOKEN" ] || [ -z "$CLIENT_TOKEN" ]; then
  echo "Usage: bash phase4a-smoke-test.sh <ADMIN_TOKEN> <TRAINER_TOKEN> <CLIENT_TOKEN>"
  exit 1
fi

PASS=0
FAIL=0
RESULTS=""

check() {
  local step="$1"
  local desc="$2"
  local expected_status="$3"
  local actual_status="$4"
  local extra="$5"

  if [ "$actual_status" = "$expected_status" ]; then
    RESULTS+="✅ Step $step: $desc — $actual_status (expected $expected_status) $extra\n"
    PASS=$((PASS + 1))
  else
    RESULTS+="❌ Step $step: $desc — $actual_status (expected $expected_status) $extra\n"
    FAIL=$((FAIL + 1))
  fi
}

echo "========================================="
echo "Phase 4A Post-Deploy Smoke Test"
echo "Target: $BASE"
echo "Template ID: $TEMPLATE_ID"
echo "Started: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "========================================="
echo ""

# Step 1: Unauthenticated should fail (401)
echo "Running Step 1: Unauthenticated request..."
STATUS=$(curl -s -o /tmp/smoke1.json -w "%{http_code}" "$BASE/api/ai/templates")
check "1" "Unauthenticated → 401" "401" "$STATUS"

# Step 2: Admin list templates (default active only)
echo "Running Step 2: Admin list templates (active)..."
STATUS=$(curl -s -o /tmp/smoke2.json -w "%{http_code}" "$BASE/api/ai/templates" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
COUNT=$(cat /tmp/smoke2.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('count', len(d.get('templates', d.get('data', [])))))" 2>/dev/null || echo "?")
HAS_SCHEMA=$(cat /tmp/smoke2.json | python3 -c "
import sys,json
d=json.load(sys.stdin)
items=d.get('templates', d.get('data', []))
has=any('schema' in t or 'inputSchema' in t for t in items)
print('YES' if has else 'NO')
" 2>/dev/null || echo "?")
check "2" "Admin list active (count≈7, no schema by default)" "200" "$STATUS" "count=$COUNT schema=$HAS_SCHEMA"

# Step 3: Admin list all templates (includes pending_schema)
echo "Running Step 3: Admin list all (status=all)..."
STATUS=$(curl -s -o /tmp/smoke3.json -w "%{http_code}" "$BASE/api/ai/templates?status=all" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
COUNT=$(cat /tmp/smoke3.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('count', len(d.get('templates', d.get('data', [])))))" 2>/dev/null || echo "?")
check "3" "Admin list all (count≈10)" "200" "$STATUS" "count=$COUNT"

# Step 4: Admin include schema on list (allowed)
echo "Running Step 4: Admin includeSchema=true..."
STATUS=$(curl -s -o /tmp/smoke4.json -w "%{http_code}" "$BASE/api/ai/templates?includeSchema=true" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
HAS_SCHEMA=$(cat /tmp/smoke4.json | python3 -c "
import sys,json
d=json.load(sys.stdin)
items=d.get('templates', d.get('data', []))
has=any('schema' in t or 'inputSchema' in t for t in items)
print('YES' if has else 'NO')
" 2>/dev/null || echo "?")
check "4" "Admin includeSchema=true (schema present)" "200" "$STATUS" "schema=$HAS_SCHEMA"

# Step 5: Client include schema on list (must be silently ignored)
echo "Running Step 5: Client includeSchema=true (should be ignored)..."
STATUS=$(curl -s -o /tmp/smoke5.json -w "%{http_code}" "$BASE/api/ai/templates?includeSchema=true" \
  -H "Authorization: Bearer $CLIENT_TOKEN")
HAS_SCHEMA=$(cat /tmp/smoke5.json | python3 -c "
import sys,json
d=json.load(sys.stdin)
items=d.get('templates', d.get('data', []))
has=any('schema' in t or 'inputSchema' in t for t in items)
print('YES' if has else 'NO')
" 2>/dev/null || echo "?")
check "5" "Client includeSchema silently ignored (200, no schema)" "200" "$STATUS" "schema=$HAS_SCHEMA"

# Step 6: Trainer list templates (allowed)
echo "Running Step 6: Trainer list templates..."
STATUS=$(curl -s -o /tmp/smoke6.json -w "%{http_code}" "$BASE/api/ai/templates" \
  -H "Authorization: Bearer $TRAINER_TOKEN")
check "6" "Trainer list templates → 200" "200" "$STATUS"

# Step 7: Admin get template by ID (full schema allowed)
echo "Running Step 7: Admin get template by ID..."
STATUS=$(curl -s -o /tmp/smoke7.json -w "%{http_code}" "$BASE/api/ai/templates/$TEMPLATE_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
HAS_SCHEMA=$(cat /tmp/smoke7.json | python3 -c "
import sys,json
d=json.load(sys.stdin)
t=d.get('template', d)
has='schema' in t or 'inputSchema' in t
print('YES' if has else 'NO')
" 2>/dev/null || echo "?")
check "7" "Admin get by ID (200, schema present)" "200" "$STATUS" "schema=$HAS_SCHEMA"

# Step 8: Trainer get template by ID (full schema allowed)
echo "Running Step 8: Trainer get template by ID..."
STATUS=$(curl -s -o /tmp/smoke8.json -w "%{http_code}" "$BASE/api/ai/templates/$TEMPLATE_ID" \
  -H "Authorization: Bearer $TRAINER_TOKEN")
check "8" "Trainer get by ID → 200" "200" "$STATUS"

# Step 9: Client get template by ID (must be forbidden)
echo "Running Step 9: Client get template by ID (should be 403)..."
STATUS=$(curl -s -o /tmp/smoke9.json -w "%{http_code}" "$BASE/api/ai/templates/$TEMPLATE_ID" \
  -H "Authorization: Bearer $CLIENT_TOKEN")
check "9" "Client get by ID → 403" "403" "$STATUS"

# Step 10: Unknown template ID (404)
echo "Running Step 10: Unknown template ID..."
STATUS=$(curl -s -o /tmp/smoke10.json -w "%{http_code}" "$BASE/api/ai/templates/does-not-exist" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
check "10" "Unknown template → 404" "404" "$STATUS"

# Step 11: Filter sanity checks
echo "Running Step 11a: Filter by framework=OPT..."
STATUS_A=$(curl -s -o /tmp/smoke11a.json -w "%{http_code}" "$BASE/api/ai/templates?framework=OPT" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
COUNT_A=$(cat /tmp/smoke11a.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('count', len(d.get('templates', d.get('data', [])))))" 2>/dev/null || echo "?")

echo "Running Step 11b: Filter by category=assessment..."
STATUS_B=$(curl -s -o /tmp/smoke11b.json -w "%{http_code}" "$BASE/api/ai/templates?category=assessment" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
COUNT_B=$(cat /tmp/smoke11b.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('count', len(d.get('templates', d.get('data', [])))))" 2>/dev/null || echo "?")
check "11" "Filter sanity (framework=OPT, category=assessment)" "200" "$STATUS_A" "OPT_count=$COUNT_A assessment_status=$STATUS_B assessment_count=$COUNT_B"

# EXTRA Step 12: Client includeSchema deep check (no schema keys anywhere)
echo "Running Extra Step 12: Deep schema absence check for client..."
SCHEMA_KEYS=$(cat /tmp/smoke5.json | python3 -c "
import sys,json
d=json.load(sys.stdin)
items=d.get('templates', d.get('data', []))
keys=set()
for t in items:
    for k in t.keys():
        if 'schema' in k.lower():
            keys.add(k)
print(','.join(keys) if keys else 'NONE')
" 2>/dev/null || echo "?")
if [ "$SCHEMA_KEYS" = "NONE" ]; then
  RESULTS+="✅ Extra 12: Client response has zero schema-related keys — $SCHEMA_KEYS\n"
  PASS=$((PASS + 1))
else
  RESULTS+="❌ Extra 12: Client response has schema keys leaked — $SCHEMA_KEYS\n"
  FAIL=$((FAIL + 1))
fi

# EXTRA Step 13: Admin status=all includes pending_schema without schema by default
echo "Running Extra Step 13: status=all pending entries have no schema by default..."
PENDING_SCHEMA=$(cat /tmp/smoke3.json | python3 -c "
import sys,json
d=json.load(sys.stdin)
items=d.get('templates', d.get('data', []))
pending=[t for t in items if t.get('status')=='pending_schema']
has=any('schema' in t or 'inputSchema' in t for t in pending)
print(f'pending_count={len(pending)} schema_leaked={has}')
" 2>/dev/null || echo "?")
RESULTS+="ℹ️  Extra 13: Admin status=all pending entries — $PENDING_SCHEMA\n"

echo ""
echo "========================================="
echo "RESULTS SUMMARY"
echo "========================================="
echo -e "$RESULTS"
echo "-----------------------------------------"
echo "PASSED: $PASS / $((PASS + FAIL))"
echo "FAILED: $FAIL / $((PASS + FAIL))"
echo "Finished: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "========================================="
