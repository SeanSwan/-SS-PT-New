#!/usr/bin/env bash
# dispatch-astra-round-7.sh — send the round-8 INLINED packet to Astra over the
# ChatGPT-subscription transport (gpt-6-astra, $0), and capture the raw JSONL.
#
# Transport form is taken from the established probes on this machine (see
# dispatch-astra-console-round-7.sh), not invented here:
#   printf '%s' "$PACKET" | CODEX_HOME='C:\tmp\codex-xhigh' codex exec \
#       --json --ephemeral --sandbox read-only -c model_reasoning_effort=xhigh \
#       --model gpt-6-astra -
#
# Astra runs read-only with no shell, so it CANNOT file the review itself. The
# dispatching seat files it under Rule 86. That is expected, not a failure.
#
# MEASURED (recorded in dispatch-astra-round-5.sh): `codex exec` refuses to start
# outside a trusted directory, and the check is satisfied by cwd being INSIDE A GIT
# REPO. Satisfied here by `cd "$REPO"` rather than bypassed with
# --skip-git-repo-check. The sandbox is read-only, so cwd carries no write risk.
set -u

# REPO is DERIVED, not hardcoded. The hardcoded form leaked the operator's account name into
# this script and the upgraded gate below caught it on the first run -- correctly, and the fix is
# the same one applied to the race harness: a literal home path is both a leak AND broken on any
# other checkout. Resolved by walking UP from this script to the repo markers, so it works
# wherever this script is copied to.
# Installed at <repo>/scripts/ai-workflow/, so the repo root is exactly TWO levels up from this
# file. Derived rather than hardcoded, and the walk-up guard catches a misplaced copy.
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
if [ ! -d "$REPO/.git" ]; then echo "could not locate the repo root from ${BASH_SOURCE[0]}" > "$STATUS"; exit 4; fi
PACKET="$REPO/docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/R1-REVIEW-ROUND-8-PACKET.md"
OUT="C:/tmp/astra-r8.jsonl"
STATUS="C:/tmp/astra-r8.status"

if [[ ! -f "$PACKET" ]]; then echo "PACKET MISSING: $PACKET" > "$STATUS"; exit 2; fi

# Arming must be PROVEN, never assumed: the keyword is what loads the governing skill.
# Checked in the REMIT region only (before PART A), because the keyword also appears
# incidentally inside included documents — and an arming check a quoted document can
# satisfy is not checking the remit.
REMIT="$(sed -n '1,/^## §2/p' "$PACKET")"
if ! printf '%s' "$REMIT" | grep -qi 'mega[[:space:]]*blueprint'; then
  echo "NOT ARMED: no 'Mega Blueprint' keyword in the remit — refusing to spend the run." > "$STATUS"
  exit 3
fi
for h in 'PART A' 'PART B' 'PART C'; do
  if ! printf '%s' "$REMIT" | grep -q "$h"; then
    echo "CONTRACT INCOMPLETE: remit is missing '$h' — refusing to spend the run." > "$STATUS"
    exit 3
  fi
done

# Refuse to dispatch a packet that leaks the operator's identity.
#
# D2 FIX (2026-09-21). The previous version of this gate was a bare substring match on $PACKET:
#     if grep -q 'BigotSmasher' "$PACKET"
# It PASSED while the pre-commit secret scanner BLOCKED a commit on a sibling artifact
# (backend/tests/db/sspt-predicate-race-2conn.mjs:36) for the very same pattern. Two checks, one
# situation, opposite answers — because a re-implemented substring match is not the scanner.
# A gate that reports "clean" while a sibling reports a hit manufactures confidence, which is worse
# than having no gate. So this now calls the REPO'S OWN SCANNER, the same one the pre-commit hook
# runs, over the packet AND every artifact this dispatch depends on. One pattern set, one
# implementation; if the scanner's rules change, this gate changes with them.
SCAN="$REPO/scripts/scan-secrets.sh"
GATE_INPUTS=( "$PACKET" "$0" )
if [[ ! -x "$SCAN" && ! -f "$SCAN" ]]; then
  echo "SCANNER MISSING: $SCAN — refusing to dispatch on an unverified packet." > "$STATUS"
  exit 3
fi
SCAN_OUT="$( TMPDIR=/c/tmp bash "$SCAN" "${GATE_INPUTS[@]}" 2>&1 )" || SCAN_RC=$?
if [[ "${SCAN_RC:-0}" -ne 0 ]]; then
  echo "SECRET SCAN REFUSED the dispatch (rc=$SCAN_RC):" > "$STATUS"
  printf '%s
' "$SCAN_OUT" >> "$STATUS"
  echo "Gate inputs were: ${GATE_INPUTS[*]}" >> "$STATUS"
  exit 3
fi
# Belt and braces: the substring check is KEPT as a second, independent tripwire. Two checks that
# can disagree are only useful if BOTH must pass.
if grep -q 'BigotSmasher' "$PACKET"; then
  echo "IDENTITY LEAK: the packet names the operator's account — refusing to send." > "$STATUS"
  exit 3
fi

echo "packet bytes: $(wc -c < "$PACKET")"
echo "packet lines: $(wc -l < "$PACKET")"
echo "packet sha256: $(sha256sum "$PACKET" | cut -d' ' -f1)"
echo "remit armed: yes"

: > "$OUT"
START=$(date +%s)
cd "$REPO" || { echo "cd failed" > "$STATUS"; exit 4; }
printf '%s' "$(cat "$PACKET")" | CODEX_HOME='C:\tmp\codex-xhigh' codex exec \
    --json --ephemeral --sandbox read-only \
    -c "model_reasoning_effort=xhigh" \
    --model gpt-6-astra - > "$OUT" 2>&1
RC=$?
END=$(date +%s)
ELAPSED=$((END - START))

{
  echo "exit=$RC"
  echo "elapsed=${ELAPSED}s"
  echo "bytes_out=$(wc -c < "$OUT")"
  echo "started=$(date -d "@$START" '+%H:%M:%S')"
  echo "ended=$(date -d "@$END" '+%H:%M:%S')"
} > "$STATUS"

echo "exit=$RC elapsed=${ELAPSED}s bytes_out=$(wc -c < "$OUT")"
exit "$RC"
