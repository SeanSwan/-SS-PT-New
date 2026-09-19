#!/usr/bin/env bash
# Hostile-review driver for the swan design-brain engine. Exercises the documented loop via CLI only.
set -u
REPO="$(git rev-parse --show-toplevel)"
NODE="${NODE:-$(command -v node)}"
DB="$REPO/scripts/design-brain"
ROOT="C:/tmp/db-hostile-2"
P1="log sets inline without leaving the active workout screen"
P2="plate math is shown as a per-side breakdown"

r() { printf '{"receiptId":"%s","domainId":"%s","product":"%s","refType":"screen","surface":"%s","platform":"%s","stepCount":4,"hierarchyNotes":"%s","principleCandidates":["%s"],"inspectorActorId":"sean","openedAtUtc":"2026-09-18T20:00:00.000Z"}\n' "$1" "$2" "$3" "$4" "$5" "$6" "$7"; }

echo "########## RUN 1: 3 receipts (Hevy+Strong converge on P1; Strong-only P2) ##########"
r RCP-0001 D01 Hevy   "Workout Logger" ios     "Primary action is thumb-reachable and the logger never unmounts mid-set; hierarchy is flat by design." "$P1" | "$NODE" "$DB/src/log-receipt.mjs" --root "$ROOT"
r RCP-0002 D01 Strong "Active Workout" android "Dense numeric grid; the active set row expands in place and the header collapses on scroll to protect the grid." "$P1" | "$NODE" "$DB/src/log-receipt.mjs" --root "$ROOT"
r RCP-0003 D01 Strong "Plate Calculator" android "A modal sheet, not a route; the per-side split is the dominant number and the total is secondary text below it." "$P2" | "$NODE" "$DB/src/log-receipt.mjs" --root "$ROOT"

echo; echo "########## SYNTHESIZE ##########"
"$NODE" "$DB/src/synthesize.mjs" --root "$ROOT"
echo "--- claim ids + confidence ---"
"$NODE" -e 'const fs=require("fs");for(const l of fs.readFileSync(process.argv[1],"utf8").trim().split("\n")){const c=JSON.parse(l);console.log(c.claimId,"|",c.confidence.level,c.singleSource?"SINGLE":"","|",c.principle)}' "$ROOT/claims-proposed.jsonl"

echo; echo "########## CORROBORATE ##########"
"$NODE" "$DB/src/corroborate.mjs" --root "$ROOT"

echo; echo "########## NOVELTY ##########"
"$NODE" "$DB/src/novelty.mjs" --root "$ROOT"

echo; echo "########## PACKET (batch 1) ##########"
"$NODE" "$DB/src/packet.mjs" --root "$ROOT"
BATCH=$(ls "$ROOT/batches/" | head -1); echo "--- $BATCH ---"; cat "$ROOT/batches/$BATCH"
