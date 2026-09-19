#!/usr/bin/env bash
# Remaining paths: the `m` merge letter, contradiction candidates, and emit-vault.
set -u
REPO="$(git rev-parse --show-toplevel)"
NODE="${NODE:-$(command -v node)}"
DB="$REPO/scripts/design-brain"
ROOT="C:/tmp/db-hostile-5"
rm -rf /c/tmp/db-hostile-5; mkdir -p /c/tmp/db-hostile-5

r() { printf '{"receiptId":"%s","domainId":"%s","product":"%s","refType":"screen","surface":"%s","platform":"%s","stepCount":4,"hierarchyNotes":"%s","principleCandidates":["%s"],"inspectorActorId":"sean","openedAtUtc":"2026-09-18T22:00:00.000Z"}\n' "$1" "$2" "$3" "$4" "$5" "$6" "$7"; }

echo "########## merge-letter test: 2 single-source claims, Sean merges one into the other ##########"
r RCP-2001 D02 Hevy   "Progress" ios     "Trend line is the dominant element and the axis labels recede so the shape of the change reads first." "volume trend leads the progress screen and axis chrome recedes" | "$NODE" "$DB/src/log-receipt.mjs" --root "$ROOT"
r RCP-2002 D02 Strong "Charts"   android "Trend line is the dominant element and the axis labels recede so the shape of the change reads first." "the volume trend leads the screen and the axis chrome recedes" | "$NODE" "$DB/src/log-receipt.mjs" --root "$ROOT"
"$NODE" "$DB/src/synthesize.mjs" --root "$ROOT" >/dev/null
"$NODE" "$DB/src/corroborate.mjs" --root "$ROOT" >/dev/null
"$NODE" "$DB/src/packet.mjs" --root "$ROOT" >/dev/null
B="$ROOT/batches/BATCH-$(date -u +%Y-%m-%d).md"
echo "--- before merge: proposed ids ---"
"$NODE" -e 'const fs=require("fs");for(const l of fs.readFileSync(process.argv[1],"utf8").trim().split("\n")){const c=JSON.parse(l);console.log(" ",c.claimId,"|",c.principle)}' "$ROOT/claims-proposed.jsonl"
ID1=$("$NODE" -e 'const fs=require("fs");const a=fs.readFileSync(process.argv[1],"utf8").trim().split("\n").map(l=>JSON.parse(l));console.log(a[0].claimId)' "$ROOT/claims-proposed.jsonl")
ID2=$("$NODE" -e 'const fs=require("fs");const a=fs.readFileSync(process.argv[1],"utf8").trim().split("\n").map(l=>JSON.parse(l));console.log(a[1].claimId)' "$ROOT/claims-proposed.jsonl")
echo "--- editing packet: '$ID2' => m $ID1 (merge second into first) ---"
"$NODE" -e '
const fs=require("fs");const [p,id2,id1]=process.argv.slice(1);
let t=fs.readFileSync(p,"utf8");
const parts=t.split("### "+id2);
parts[1]=parts[1].replace(/^DECIDE: _/m,"DECIDE: m "+id1);
t=parts.join("### "+id2);
fs.writeFileSync(p,t);
console.log(t.split("\n").filter(l=>l.startsWith("DECIDE")).join("\n"));' "$B" "$ID2" "$ID1"
"$NODE" "$DB/src/adjudicate.mjs" --root "$ROOT" --batch "$B"
echo "--- ledger after merge ---"
"$NODE" -e 'const fs=require("fs");for(const l of fs.readFileSync(process.argv[1],"utf8").trim().split("\n")){const c=JSON.parse(l);console.log(" ",c.claimId,"status="+c.status,"mergedInto="+(c.mergedInto??"-"))}' "$ROOT/claims.jsonl"

echo; echo "########## contradiction test (pure core) ##########"
DB="$DB" "$NODE" -e '
const {corroborateBatch}=await import("file:///"+process.env.DB+"/src/corroborate.mjs");
const tuning={auto:{S:0.82,O:0.6,margin:0.1,minTokens:3},mergeBand:{low:0.55},weights:{jaccard:0.35,overlap:0.5,trigram:0.15},stopwords:new Set()};
const accepted=[{claimId:"CLM-A",domainId:"D01",status:"accepted",principle:"show the rest timer inline above the keyboard",products:["Hevy"],receiptRefs:["R1"],confidence:{level:"low",basis:"x"}}];
const proposed=[{claimId:"CLM-B",domainId:"D01",status:"proposed",principle:"never show the rest timer inline above the keyboard",products:["Strong"],receiptRefs:["R2"],confidence:{level:"low",basis:"x"}}];
const res=corroborateBatch({proposed,accepted,pendingProposed:[],receiptsById:new Map(),tuning,negationCues:["never","do not","avoid"],runId:"RUN-X",nowIso:"2026-09-18T00:00:00Z"});
console.log("kinds:",res.events.map(e=>e.kind).join(", "));
console.log("claimAppends (auto-writes to the accepted claim):",res.claimAppends.length,"<-- 0 = contradiction correctly NOT auto-corroborated");'

echo; echo "########## emit-vault on Windows ##########"
mkdir -p /c/tmp/db-vault/collections
"$NODE" "$DB/src/emit-vault.mjs" --root "C:/tmp/db-hostile-4" --vault "C:/tmp/db-vault" --build 2>&1 | head -12
echo "--- what was emitted ---"
find /c/tmp/db-vault -type f | head -10
