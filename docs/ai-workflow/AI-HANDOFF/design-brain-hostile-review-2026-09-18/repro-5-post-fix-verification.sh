#!/usr/bin/env bash
# VERIFY — re-run the exact orphan scenario end-to-end against the FIXED engine.
set -u
REPO="$(git rev-parse --show-toplevel)"
NODE="${NODE:-$(command -v node)}"
DB="$REPO/scripts/design-brain"
ROOT="C:/tmp/db-verify"
rm -rf /c/tmp/db-verify; mkdir -p /c/tmp/db-verify
P1="log sets inline without leaving the active workout screen"
P3="exercise history is reachable from the active set row"

r() { printf '{"receiptId":"%s","domainId":"%s","product":"%s","refType":"screen","surface":"%s","platform":"%s","stepCount":4,"hierarchyNotes":"%s","principleCandidates":["%s"],"inspectorActorId":"sean","openedAtUtc":"2026-09-18T21:00:00.000Z"}\n' "$1" "$2" "$3" "$4" "$5" "$6" "$7"; }
D=$(date -u +%Y-%m-%d)

echo "########## CYCLE 1 ##########"
r RCP-0001 D01 Hevy   "Workout Logger" ios     "Primary action is thumb-reachable and the logger never unmounts mid-set; hierarchy is flat by design." "$P1" | "$NODE" "$DB/src/log-receipt.mjs" --root "$ROOT" >/dev/null
r RCP-0002 D01 Strong "Active Workout" android "Dense numeric grid; the active set row expands in place and the header collapses on scroll to protect the grid." "$P1" | "$NODE" "$DB/src/log-receipt.mjs" --root "$ROOT" >/dev/null
"$NODE" "$DB/src/synthesize.mjs" --root "$ROOT" >/dev/null
"$NODE" "$DB/src/corroborate.mjs" --root "$ROOT"
"$NODE" "$DB/src/packet.mjs" --root "$ROOT" >/dev/null
sed -i 's/^DECIDE: _/DECIDE: a/' "$ROOT/batches/BATCH-$D.md"
"$NODE" "$DB/src/adjudicate.mjs" --root "$ROOT" --batch "$ROOT/batches/BATCH-$D.md"

echo; echo "########## CYCLE 2: 5 new products restate P1 byte-identically + 1 new principle ##########"
r RCP-1001 D01 Fitbod   "Session"      ios     "Set entry stays on the same surface as the exercise list so no navigation interrupts the working set." "$P1" | "$NODE" "$DB/src/log-receipt.mjs" --root "$ROOT" >/dev/null
r RCP-1002 D01 Jefit    "Workout"      android "Set entry stays on the same surface as the exercise list so no navigation interrupts the working set." "$P1" | "$NODE" "$DB/src/log-receipt.mjs" --root "$ROOT" >/dev/null
r RCP-1003 D01 Liftin   "Live Workout" ios     "Set entry stays on the same surface as the exercise list so no navigation interrupts the working set." "$P1" | "$NODE" "$DB/src/log-receipt.mjs" --root "$ROOT" >/dev/null
r RCP-1004 D01 Gymshark "Training"     ios     "Set entry stays on the same surface as the exercise list so no navigation interrupts the working set." "$P1" | "$NODE" "$DB/src/log-receipt.mjs" --root "$ROOT" >/dev/null
r RCP-1005 D01 RP       "Hypertrophy"  android "Set entry stays on the same surface as the exercise list so no navigation interrupts the working set." "$P1" | "$NODE" "$DB/src/log-receipt.mjs" --root "$ROOT" >/dev/null
r RCP-1006 D01 Peloton  "Strength"     ios     "History lives behind the active set row so the athlete never leaves the logging context to check a past session." "$P3" | "$NODE" "$DB/src/log-receipt.mjs" --root "$ROOT" >/dev/null
"$NODE" "$DB/src/synthesize.mjs" --root "$ROOT" >/dev/null
"$NODE" "$DB/src/corroborate.mjs" --root "$ROOT"

echo; echo "=== F2 FIXED? did the ACCEPTED claim gain the 5 new products? ==="
"$NODE" -e 'const fs=require("fs");for(const l of fs.readFileSync(process.argv[1],"utf8").trim().split("\n")){const c=JSON.parse(l);console.log("  rev"+(c.rev??1),c.claimId,"products="+c.products.length,"["+c.products.join(",")+"]","refs="+c.receiptRefs.length,"conf="+c.confidence.level)}' "$ROOT/claims.jsonl"
echo "=== F3 FIXED? denominator events (one per RUN, distinct runIds) ==="
"$NODE" -e 'const fs=require("fs");for(const l of fs.readFileSync(process.argv[1],"utf8").trim().split("\n")){const e=JSON.parse(l);if(e.kind==="receipt-count")console.log("  count="+e.count,"runId="+e.runId)}' "$ROOT/events.jsonl"
echo "=== ORPHAN CHECK ==="
"$NODE" -e '
const fs=require("fs");
const recs=fs.readFileSync(process.argv[1],"utf8").trim().split("\n").map(l=>JSON.parse(l));
const claims=fs.readFileSync(process.argv[2],"utf8").trim().split("\n").map(l=>JSON.parse(l));
const used=new Set();for(const c of claims)for(const r of c.receiptRefs)used.add(r);
const orphans=recs.filter(r=>!used.has(r.receiptId)).map(r=>r.receiptId+"("+r.product+")");
console.log("  receipts:",recs.length,"| linked to a claim:",used.size,"| ORPHANED:",orphans.length?orphans.join(", "):"(none)");' "$ROOT/receipts.jsonl" "$ROOT/claims.jsonl"
echo; echo "=== F1 FIXED? packet for cycle 2 (the decided claim must NOT reappear) ==="
"$NODE" "$DB/src/packet.mjs" --root "$ROOT"
cat "$ROOT"/batches/BATCH-$D-*.md 2>/dev/null | head -30
echo; echo "=== NOVELTY DIAL ==="
"$NODE" "$DB/src/novelty.mjs" --root "$ROOT" | head -3
