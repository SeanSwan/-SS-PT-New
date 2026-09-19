#!/usr/bin/env bash
# CYCLE 2 — does the documented loop actually converge? (H1: decided claims re-proposed, letters dropped)
set -u
REPO="$(git rev-parse --show-toplevel)"
NODE="${NODE:-$(command -v node)}"
DB="$REPO/scripts/design-brain"
ROOT="C:/tmp/db-hostile-2"
BATCH="$ROOT/batches/BATCH-2026-09-19.md"

echo "########## Sean edits DECIDE lines: accept CLM-76c94b34f5, reject CLM-c36ea036ec ##########"
sed -i 's/^DECIDE: _/DECIDE: a/' "$BATCH"   # first block
# second block must be 'r' — do it positionally
"$NODE" -e '
const fs=require("fs");const p=process.argv[1];let t=fs.readFileSync(p,"utf8");
let n=0;t=t.replace(/^DECIDE: a$/gm,(m)=>{n++;return n===1?"DECIDE: a":"DECIDE: r";});
fs.writeFileSync(p,t);console.log("DECIDE lines now:");console.log(t.split("\n").filter(l=>l.startsWith("DECIDE")).join("\n"));' "$BATCH"

echo; echo "########## ADJUDICATE ##########"
"$NODE" "$DB/src/adjudicate.mjs" --root "$ROOT" --batch "$BATCH"

echo; echo "--- claims.jsonl (the asset) ---"
cat "$ROOT/claims.jsonl"
echo "--- claims-proposed.jsonl (remaining) ---"
cat "$ROOT/claims-proposed.jsonl" 2>/dev/null || echo "(empty)"
echo "--- INDEX.md ---"
cat "$ROOT/INDEX.md"

echo; echo "########## CYCLE 2a: re-run synthesize + packet with NO new receipts ##########"
"$NODE" "$DB/src/synthesize.mjs" --root "$ROOT"
"$NODE" "$DB/src/packet.mjs" --root "$ROOT"
echo "--- claims-proposed.jsonl after re-synthesize ---"
"$NODE" -e 'const fs=require("fs");const p=process.argv[1];if(!fs.existsSync(p)){console.log("(missing)");process.exit(0)};const t=fs.readFileSync(p,"utf8").trim();if(!t){console.log("(empty)");process.exit(0)};for(const l of t.split("\n")){const c=JSON.parse(l);console.log(c.claimId,"| status="+c.status,"|",c.principle)}' "$ROOT/claims-proposed.jsonl"
echo "--- NEW packet rendered ---"
cat "$ROOT/batches/BATCH-2026-09-19.md"

echo; echo "########## CYCLE 2b: re-adjudicate the SAME letters ##########"
"$NODE" "$DB/src/adjudicate.mjs" --root "$ROOT" --batch "$BATCH"
echo "--- claims.jsonl after re-adjudicate (count) ---"
wc -l < "$ROOT/claims.jsonl"
