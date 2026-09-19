#!/usr/bin/env bash
# H2 CLEAN — byte-identical restatement of an ACCEPTED claim: credited, or silently orphaned?
set -u
REPO="$(git rev-parse --show-toplevel)"
NODE="${NODE:-$(command -v node)}"
DB="$REPO/scripts/design-brain"
ROOT="C:/tmp/db-hostile-4"
rm -rf /c/tmp/db-hostile-4; mkdir -p /c/tmp/db-hostile-4
P1="log sets inline without leaving the active workout screen"
P3="exercise history is reachable from the active set row"

r() { printf '{"receiptId":"%s","domainId":"%s","product":"%s","refType":"screen","surface":"%s","platform":"%s","stepCount":4,"hierarchyNotes":"%s","principleCandidates":["%s"],"inspectorActorId":"sean","openedAtUtc":"2026-09-18T21:00:00.000Z"}\n' "$1" "$2" "$3" "$4" "$5" "$6" "$7"; }

echo "########## RUN 1: Hevy + Strong state P1 identically ##########"
r RCP-0001 D01 Hevy   "Workout Logger" ios     "Primary action is thumb-reachable and the logger never unmounts mid-set; hierarchy is flat by design." "$P1" | "$NODE" "$DB/src/log-receipt.mjs" --root "$ROOT"
r RCP-0002 D01 Strong "Active Workout" android "Dense numeric grid; the active set row expands in place and the header collapses on scroll to protect the grid." "$P1" | "$NODE" "$DB/src/log-receipt.mjs" --root "$ROOT"
"$NODE" "$DB/src/synthesize.mjs" --root "$ROOT" >/dev/null
"$NODE" "$DB/src/corroborate.mjs" --root "$ROOT" >/dev/null
"$NODE" "$DB/src/packet.mjs" --root "$ROOT" >/dev/null
B="$ROOT/batches/BATCH-$(date -u +%Y-%m-%d).md"
sed -i 's/^DECIDE: _/DECIDE: a/' "$B"
"$NODE" "$DB/src/adjudicate.mjs" --root "$ROOT" --batch "$B"
echo "--- asset after adjudication ---"
"$NODE" -e 'const fs=require("fs");for(const l of fs.readFileSync(process.argv[1],"utf8").trim().split("\n")){const c=JSON.parse(l);console.log(c.claimId,"status="+c.status,"products=["+c.products.join(",")+"]","refs="+c.receiptRefs.length,"conf="+c.confidence.level)}' "$ROOT/claims.jsonl"

echo; echo "########## RUN 2: 5 NEW products restate P1 BYTE-IDENTICALLY + 1 new principle ##########"
r RCP-1001 D01 Fitbod   "Session"      ios     "Set entry stays on the same surface as the exercise list so no navigation interrupts the working set." "$P1" | "$NODE" "$DB/src/log-receipt.mjs" --root "$ROOT"
r RCP-1002 D01 Jefit    "Workout"      android "Set entry stays on the same surface as the exercise list so no navigation interrupts the working set." "$P1" | "$NODE" "$DB/src/log-receipt.mjs" --root "$ROOT"
r RCP-1003 D01 Liftin   "Live Workout" ios     "Set entry stays on the same surface as the exercise list so no navigation interrupts the working set." "$P1" | "$NODE" "$DB/src/log-receipt.mjs" --root "$ROOT"
r RCP-1004 D01 Gymshark "Training"     ios     "Set entry stays on the same surface as the exercise list so no navigation interrupts the working set." "$P1" | "$NODE" "$DB/src/log-receipt.mjs" --root "$ROOT"
r RCP-1005 D01 RP       "Hypertrophy"  android "Set entry stays on the same surface as the exercise list so no navigation interrupts the working set." "$P1" | "$NODE" "$DB/src/log-receipt.mjs" --root "$ROOT"
r RCP-1006 D01 Peloton  "Strength"     ios     "History lives behind the active set row so the athlete never leaves the logging context to check a past session." "$P3" | "$NODE" "$DB/src/log-receipt.mjs" --root "$ROOT"

echo; echo "########## SYNTHESIZE + CORROBORATE ##########"
"$NODE" "$DB/src/synthesize.mjs" --root "$ROOT"
"$NODE" "$DB/src/corroborate.mjs" --root "$ROOT"

echo; echo "=== A) claims-proposed (DERIVED, what the packet reads) — does it see the 5 new products? ==="
"$NODE" -e 'const fs=require("fs");for(const l of fs.readFileSync(process.argv[1],"utf8").trim().split("\n")){const c=JSON.parse(l);console.log(c.claimId,"| products=["+c.products.join(",")+"]")}' "$ROOT/claims-proposed.jsonl"
echo; echo "=== B) claims.jsonl (THE ASSET) — did the accepted claim gain them? ==="
"$NODE" -e 'const fs=require("fs");for(const l of fs.readFileSync(process.argv[1],"utf8").trim().split("\n")){const c=JSON.parse(l);console.log("rev"+(c.rev??1),c.claimId,"status="+c.status,"products=["+c.products.join(",")+"]","refs="+c.receiptRefs.length,"conf="+c.confidence.level)}' "$ROOT/claims.jsonl"
echo; echo "=== C) receipt-count DENOMINATOR event(s) ==="
"$NODE" -e 'const fs=require("fs");for(const l of fs.readFileSync(process.argv[1],"utf8").trim().split("\n")){const e=JSON.parse(l);if(e.kind==="receipt-count")console.log(JSON.stringify(e))}' "$ROOT/events.jsonl"
echo "--- event kinds this run ---"
"$NODE" -e 'const fs=require("fs");const t=fs.readFileSync(process.argv[1],"utf8").trim().split("\n").map(l=>JSON.parse(l));const k={};for(const e of t)k[e.kind]=(k[e.kind]||0)+1;console.log(JSON.stringify(k))' "$ROOT/events.jsonl"
echo; echo "=== D) ORPHAN CHECK: receipts whose id appears in NO claim's receiptRefs ==="
"$NODE" -e '
const fs=require("fs");
const recs=fs.readFileSync(process.argv[1],"utf8").trim().split("\n").map(l=>JSON.parse(l));
const claims=fs.readFileSync(process.argv[2],"utf8").trim().split("\n").map(l=>JSON.parse(l));
const used=new Set();for(const c of claims)for(const r of c.receiptRefs)used.add(r);
const orphans=recs.filter(r=>!used.has(r.receiptId)).map(r=>r.receiptId+"("+r.product+")");
console.log("receipts in corpus:",recs.length,"| referenced by an adjudicated claim:",used.size);
console.log("ORPHANED (logged, never linked to any claim):",orphans.length?orphans.join(", "):"(none)");' "$ROOT/receipts.jsonl" "$ROOT/claims.jsonl"
echo; echo "=== E) NOVELTY DIAL vs GROUND TRUTH ==="
"$NODE" "$DB/src/novelty.mjs" --root "$ROOT" | head -4
echo "receipts reviewed in run 2: 6 | new principles: 1 | honest ratio = 1/6 = 0.167 (COOLING band)"
