#!/usr/bin/env bash
# repro-6 — rounds 2..5 verification driver (2026-09-18)
# ==============================================================================
# Round 1's drivers (repro-1..5) reproduce the engine defects. This one verifies the FIXES and the
# fixes-of-the-fixes. It is the artifact a later reviewer should run first, because it is the one that
# would have caught the three defects I introduced while fixing round 1.
#
# What it proves, in order:
#   1. the suite is green at the count the README claims (81)
#   2. the round-2..5 test files exist and each passes on its own (no shared-state masking)
#   3. no mutation residue survives in src/ or tests/
#   4. all four human-input error classes fail the SAME named way (exit 5, no stack trace)
#   5. the three guards around the grown-evidence pass behave in BOTH directions
#
# Exit 0 = every check passed. Anything else = the output says which.
#
# Run from the repo root:   bash docs/ai-workflow/AI-HANDOFF/design-brain-hostile-review-2026-09-18/repro-6-rounds-2-5-verification.sh
set -uo pipefail

REPO="$(git rev-parse --show-toplevel)"
DB="$REPO/scripts/design-brain"
cd "$DB" || exit 1

PASS=0; FAIL=0
ok()   { echo "  PASS  $1"; PASS=$((PASS+1)); }
bad()  { echo "  FAIL  $1"; FAIL=$((FAIL+1)); }

echo "=== 1. full suite (README claims 81) ==="
OUT="$(node --test "tests/*.test.mjs" 2>&1)"
N="$(printf '%s' "$OUT" | grep -E '^# tests' | awk '{print $3}')"
P="$(printf '%s' "$OUT" | grep -E '^# pass'  | awk '{print $3}')"
F="$(printf '%s' "$OUT" | grep -E '^# fail'  | awk '{print $3}')"
echo "  tests=$N pass=$P fail=$F"
[ "$F" = "0" ] && ok "suite green" || bad "suite has $F failure(s)"
[ "$N" = "81" ] && ok "count matches the README (81)" || bad "README says 81, suite reports $N"

echo "=== 2. each round's file passes on its own (no shared-state masking) ==="
for f in hostile-regressions loop-convergence hostile-round2-regressions \
         hostile-round3-regressions hostile-round4-regressions hostile-round5-regressions; do
  R="$(node --test "tests/$f.test.mjs" 2>&1 | grep -E '^# fail' | awk '{print $3}')"
  [ "$R" = "0" ] && ok "$f" || bad "$f has $R failure(s)"
done

echo "=== 3. no mutation residue ==="
if grep -rn "MUTANT\|DISABLED\|if (true) {\|if (false) {" src/ tests/ >/dev/null 2>&1; then
  bad "mutation residue found:"; grep -rn "MUTANT\|DISABLED\|if (true) {\|if (false) {" src/ tests/
else
  ok "src/ and tests/ clean"
fi

echo "=== 4. every human-input error class fails with a named exit 5, no stack trace ==="
# NOTE there are TWO classes, and they are not the same thing:
#   (a) a READABLE but unknown letter (`DECIDE: accept`) skips THAT LINE ONLY — other letters in the
#       batch are still applied, so the message is "could not be read", not "nothing was applied";
#   (b) a line that makes the batch unparseable/unappliable (bare `m`, bad merge target, merge chain)
#       refuses the WHOLE batch, so "nothing was applied" is the honest message.
# Both exit 5. Asserting one message for both would be asserting a falsehood about (a).
ROOT="C:/tmp/db-repro6-$$"
rm -rf "$ROOT"; mkdir -p "$ROOT"
node -e "
const fs=require('fs');
const c={claimId:'CLM-aaaaaaaaaa',domainId:'D01',principle:'log sets inline without leaving the active workout screen',workflowPhase:'Logger',userRole:'client',products:['Hevy'],receiptRefs:['RCP-9001'],exceptions:[],contradictions:[],swanTranslation:{},confidence:{level:'low',basis:'x'},singleSource:true,status:'proposed',createdUtc:'2026-09-18T20:00:00.000Z'};
fs.writeFileSync(process.argv[1]+'/claims-proposed.jsonl', JSON.stringify(c)+'\n');
const t={...c, claimId:'CLM-bbbbbbbbbb', status:'merged', mergedInto:'CLM-cccccccccc', principle:'plate math shows a per-side split on every barbell row', products:['Strong'], receiptRefs:['RCP-9002']};
fs.writeFileSync(process.argv[1]+'/claims.jsonl', JSON.stringify(t)+'\n');
" "$ROOT"

check_failure() {
  local label="$1" expect="$2" body="$3"
  printf '%s' "$body" > "$ROOT/BATCH-t.md"
  local out rc
  out="$(node src/adjudicate.mjs --root "$ROOT" --batch "$ROOT/BATCH-t.md" 2>&1)"; rc=$?
  if [ "$rc" = "5" ] && printf '%s' "$out" | grep -q "$expect" \
     && ! printf '%s' "$out" | grep -qE "at .*\.mjs:[0-9]|Node\.js v"; then
    ok "$label -> exit 5, named, no stack trace"
  else
    bad "$label -> exit $rc, expected /$expect/"; printf '%s\n' "$out" | head -4
  fi
}
check_failure "unknown letter (DECIDE: accept)" "could not be read" '### CLM-aaaaaaaaaa
DECIDE: accept'
check_failure "bare merge (DECIDE: m)"          "nothing was applied" '### CLM-aaaaaaaaaa
DECIDE: m'
check_failure "nonexistent merge target"        "nothing was applied" '### CLM-aaaaaaaaaa
DECIDE: m CLM-nonexistent'
check_failure "merge chain"                     "nothing was applied" '### CLM-aaaaaaaaaa
DECIDE: m CLM-bbbbbbbbbb'

# and the (a) class must NOT be misreported as a total refusal: a valid letter alongside an unknown one
# still lands, which is why the two classes carry different messages.
printf '%s' '### CLM-aaaaaaaaaa
DECIDE: a
### CLM-bbbbbbbbbb
DECIDE: accept' > "$ROOT/BATCH-mixed.md"
MIX="$(node src/adjudicate.mjs --root "$ROOT" --batch "$ROOT/BATCH-mixed.md" 2>&1)"; MRC=$?
if [ "$MRC" = "5" ] && printf '%s' "$MIX" | grep -q "imported 1 decision" \
   && printf '%s' "$MIX" | grep -q "could not be read"; then
  ok "mixed batch: the valid letter lands, the unknown one is named (class a is per-line)"
else
  bad "mixed batch -> exit $MRC"; printf '%s\n' "$MIX" | head -4
fi
rm -rf "$ROOT"

echo "=== 5. the three grown-evidence guards, both directions ==="
node --input-type=module -e "
import { corroborateBatch } from './src/corroborate.mjs';
import assert from 'node:assert/strict';
const T={auto:{S:0.82,O:0.6,margin:0.1,minTokens:3},mergeBand:{low:0.55},weights:{jaccard:0.35,overlap:0.5,trigram:0.15},stopwords:new Set()};
const P='log sets inline without leaving the active workout screen';
const mk=(o)=>({claimId:'CLM-aaaaaaaaaa',domainId:'D01',principle:P,workflowPhase:'Logger',userRole:'client',products:['Hevy'],receiptRefs:['RCP-9001'],exceptions:[],contradictions:[],swanTranslation:{},confidence:{level:'low',basis:'x'},singleSource:true,status:'proposed',createdUtc:'2026-09-18T20:00:00.000Z',...o});
const run=(grown,accepted,decided)=>corroborateBatch({proposed:[],grownProposed:[grown],accepted,pendingProposed:[],receiptsById:new Map(),tuning:T,negationCues:[],runId:'R',nowIso:'2026-09-18T00:00:00Z',decidedById:decided});
const accepted=mk({claimId:'CLM-aaaaaaaaaa',status:'accepted',products:['Hevy','Strong'],receiptRefs:['RCP-9001','RCP-9002'],confidence:{level:'medium',basis:'2'},singleSource:false});
const grew=mk({claimId:'CLM-tttttttttt',products:['Hevy','Fitbod'],receiptRefs:['RCP-9001','RCP-9003']});

// R3-1: TRIAL must still corroborate (a silent loss if this regresses)
let r=run(grew,[accepted],new Map([['CLM-tttttttttt',mk({claimId:'CLM-tttttttttt',status:'trial'})]]));
assert.equal(r.claimAppends.length,1,'R3-1: trial claim must still corroborate');
assert.equal(r.events.filter(e=>e.kind==='stale-decision-evidence').length,0,'R3-1: trial is not decided-against');
console.log('  PASS  R3-1 trial corroborates (products -> '+r.claimAppends[0].products.length+', '+r.claimAppends[0].confidence.level+')');

// R3-1b: REJECTED must be blocked and reported
r=run(grew,[accepted],new Map([['CLM-tttttttttt',mk({claimId:'CLM-tttttttttt',status:'rejected'})]]));
assert.equal(r.claimAppends.length,0,'R3-1b: rejected must not corroborate');
assert.equal(r.events.filter(e=>e.kind==='stale-decision-evidence').length,1,'R3-1b: rejected must be reported');
console.log('  PASS  R3-1b rejected blocked + reported');

// R5-1: PENDING (no ledger record) must stay silent
r=run(mk({claimId:'CLM-pppppppppp',products:['Hevy','Strong'],receiptRefs:['RCP-9001','RCP-9002']}),[],new Map());
assert.equal(r.events.filter(e=>e.kind==='grown-unmatched').length,0,'R5-1: a pending claim is not stranded');
console.log('  PASS  R5-1 pending claim stays quiet');

// R3-3: a LEDGERED trial claim matching nothing must be reported
r=run(mk({claimId:'CLM-tttttttttt',principle:'a principle no accepted claim carries at all',products:['Fitbod'],receiptRefs:['RCP-9003']}),[],new Map([['CLM-tttttttttt',mk({claimId:'CLM-tttttttttt',status:'trial'})]]));
assert.equal(r.events.filter(e=>e.kind==='grown-unmatched').length,1,'R3-3: ledgered orphan must be reported');
console.log('  PASS  R3-3 ledgered orphan reported');
" || bad "guard direction checks (see assertion above)"

echo
echo "=== RESULT: $PASS passed, $FAIL failed ==="
[ "$FAIL" = "0" ] || exit 1
