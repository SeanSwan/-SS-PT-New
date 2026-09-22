#!/usr/bin/env bash
# run-all-gates.sh — run EVERY gate in the media-api readiness receipt and DERIVE the totals.
#
# WHY A SCRIPT AND NOT A COPIED LIST: the receipt's assertion total has to be an arithmetic
# fact about an actual run, not a number somebody typed. The round-24 probe (A6) asserts the
# receipt's gate COMMANDS match its countable numbers, but nothing re-derives the assertion
# TOTAL from execution — so a gate that silently stopped printing its count would leave the
# headline number looking right. This script is that derivation.
#
# Usage:  bash media-api/run-all-gates.sh [--fail-fast] [--quiet]
# Exit:  0 iff every gate's own verdict line reports zero failed.

set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO"

# Probe scripts call os.tmpdir(), which on this machine resolves through TEMP/TMP — NOT
# TMPDIR alone. Measured: hostile-round25-probe.mjs dies with EPERM (r25-graph.json) unless
# all three point somewhere writable.
#
# ── THE SCRATCH MUST LIVE OUTSIDE THE REPO, AND PUTTING IT INSIDE WAS A REAL DEFECT ──────
# The first version pointed all three at `$REPO/.tmp-gates`. That made the runner a PRODUCER of
# untracked files inside the worktree it was auditing: Node's compile cache
# (`.tmp-gates/node-compile-cache/v22.22.2-x64-*/…`, thousands of entries) and each demo run's
# job directory landed there, and `git status -uall` enumerated every one of them.
#
# ── WHAT WAS OBSERVED, AND WHAT WAS NOT ─────────────────────────────────────────────────
# OBSERVED: two consecutive suite runs on the 2026-09-21 tree, with NO source change between them,
# reported a DIFFERENT gate red — run 1 reported gate27 (hostile-round24-probe, n=13 failed=4),
# run 2 reported gate28 (hostile-round25-probe, n=23 failed=1) — and a third run reported neither.
# OBSERVED: with the scratch inside the repo, `git status -uall` listed thousands of paths during
# the suite; with the scratch moved outside, it lists only the two lane files E1 already reports.
#
# NOT ESTABLISHED: that the cache was the CAUSE of the gate27 red. It was deliberately tested
# and could not be reproduced. `hostile-round24-probe.mjs` passes 13/13 with a leaked E3 fixture
# present, with a foreign `.mjs` fixture in `media-api/`, and under continuous concurrent creation
# and deletion of untracked files in both lane directories. A causal sentence was written here
# first and removed, because the mechanism was inferred and then found unreproducible — which is
# exactly the failure mode this lane files, and prose about a gate is not exempt from it.
#
# The change is kept because the OBSERVED half is enough to justify it: a runner that litters the
# tree it audits makes every count derived from that tree a statement about the litter as well.
# That is R3-5's defect class — a gate reddenable by files the gate did not create — arriving
# through the RUNNER, and the repair is not to exempt the paths (an allowlist cannot scale, and a
# gate that exempts its own auditor's litter is unreadable) but to stop producing them inside the
# tree. `mktemp -d` gives a directory outside the repo, removed on exit.
#
# NODE_COMPILE_CACHE is disabled outright: it is the largest single producer of scratch here and
# this suite is short enough that the cache buys nothing.
GATE_SCRATCH="$(mktemp -d 2>/dev/null || echo "${TMPDIR:-/tmp}/swan-gates-$$")"
mkdir -p "$GATE_SCRATCH"
export TMPDIR="$GATE_SCRATCH"
export TEMP="$GATE_SCRATCH"
export TMP="$GATE_SCRATCH"
export NODE_COMPILE_CACHE=""
unset NODE_COMPILE_CACHE
cleanup_scratch() { rm -rf "$GATE_SCRATCH" 2>/dev/null || true; }
trap cleanup_scratch EXIT INT TERM

FAIL_FAST=0; QUIET=0
for a in "$@"; do
  [ "$a" = "--fail-fast" ] && FAIL_FAST=1
  [ "$a" = "--quiet" ] && QUIET=1
done

TOTAL=0; GATES=0; BAD=0
FAILED_NAMES=()

# Parse a gate's OWN output. The four verdict shapes are the gates'; nothing is hard-coded
# about which gate prints which.
#
# ANSI IS STRIPPED FIRST, and that is not cosmetic. Measured: vitest emits
# `\e[2m      Tests \e[22m \e[1m\e[32m63 passed\e[39m\e[22m`, so the sequence `Tests ... 63 passed`
# does not exist as contiguous text and every regex below misses it. The gate then reads as
# UNREADABLE — which is at least loud — but the same stripping bug inside a CHECK rather than a
# runner reads as "no evidence of a failure", which is the silent direction. Stripping once, at
# the boundary, keeps every pattern below written against plain text.
report() {
  local label="$1" out="$2" rc="$3"
  local n="" f="0" verdict=""

  # CSI sequences: ESC [ params ; ... final-byte
  out="$(printf '%s' "$out" | sed -E 's/\x1b\[[0-9;]*[A-Za-z]//g')"

  if printf '%s' "$out" | grep -qE '# tests [0-9]+'; then
    n="$(printf '%s' "$out" | grep -oE '# tests [0-9]+' | grep -oE '[0-9]+' | head -1)"
    f="$(printf '%s' "$out" | grep -oE '# fail [0-9]+'   | grep -oE '[0-9]+' | head -1)"; verdict="node --test"
  # vitest pads its counters, so the separator is `\s+`, not a single space:
  #   "      Tests  63 passed (63)"
  elif printf '%s' "$out" | grep -qE 'Tests +[0-9]+ passed'; then
    n="$(printf '%s' "$out" | grep -oE 'Tests +[0-9]+ passed' | grep -oE '[0-9]+' | head -1)"
    f="$(printf '%s' "$out" | grep -oE 'Tests +[0-9]+ failed' | grep -oE '[0-9]+' | head -1)"
    # A vitest run that reports no `failed` line is a run with zero failures, not an unknown.
    # But a NON-ZERO exit with no parseable failure count must NOT be read as clean — that is
    # how a crashed suite (e.g. a syntax error, rc=1, no "Tests" line at all) would pass.
    if [ -z "${f:-}" ]; then
      if printf '%s' "$out" | grep -qE 'Tests +[0-9]+ (passed|failed)'; then f=0; else f="UNKNOWN"; fi
    fi
    verdict="vitest"
  elif printf '%s' "$out" | grep -qE '[0-9]+ CHECKS — [0-9]+ passed, [0-9]+ failed'; then
    n="$(printf '%s' "$out" | grep -oE '[0-9]+ CHECKS —' | grep -oE '^[0-9]+' | head -1)"
    f="$(printf '%s' "$out" | grep -oE '[0-9]+ failed'   | grep -oE '^[0-9]+' | head -1)"; verdict="probe"
  elif printf '%s' "$out" | grep -qE 'ALL [0-9]+ CHECKS PASSED'; then
    n="$(printf '%s' "$out" | grep -oE 'ALL [0-9]+ CHECKS PASSED' | grep -oE '[0-9]+' | head -1)"; verdict="all-passed"
  elif printf '%s' "$out" | grep -qE '^[0-9]+ passed, [0-9]+ failed'; then
    n="$(printf '%s' "$out" | grep -oE '^[0-9]+ passed' | grep -oE '[0-9]+' | head -1)"
    f="$(printf '%s' "$out" | grep -oE '[0-9]+ failed'  | grep -oE '^[0-9]+' | head -1)"; verdict="control"
  else
    [ "$QUIET" = "1" ] || { echo "  $label  UNREADABLE (rc=$rc)"; printf '%s\n' "$out" | tail -4 | sed 's/^/      | /'; }
    FAILED_NAMES+=("$label UNREADABLE"); BAD=$((BAD+1)); GATES=$((GATES+1)); return 1
  fi

  f="${f:-0}"
  TOTAL=$((TOTAL + ${n:-0})); GATES=$((GATES+1))

  # A gate is FAILED if it reported a failure, OR exited non-zero, OR had an unparseable
  # failure count. The third case is the one worth stating: a suite that dies before it can
  # print a count leaves `f` empty, and defaulting that to 0 would convert a crash into a pass.
  if [ "$f" != "0" ] || [ "$rc" != "0" ]; then
    echo "  $(printf '%-44s' "$label") FAIL  (n=${n:-?} failed=$f rc=$rc)"
    printf '%s\n' "$out" | grep -iE 'FAILED:|FAIL:|✗|not ok|AssertionError' | head -4 | sed 's/^/      | /'
    FAILED_NAMES+=("$label"); BAD=$((BAD+1)); return 1
  fi
  [ "$QUIET" = "1" ] || printf '  %-44s ok    (n=%s) [%s]\n' "$label" "${n:-?}" "$verdict"
  return 0
}

# ── the gates, in receipt order ─────────────────────────────────────────────
# NO_COLOR / FORCE_COLOR=0: belt and braces with the ANSI strip above. The strip makes the
# runner correct either way; asking the tools not to colour makes the raw output legible in a
# terminal that has no colour support, which is a different problem.
#
# NO `--reporter=` FLAG, deliberately. `--reporter=basic` was tried here and is NOT a reporter
# this vitest version accepts: the run died loading the reporter module and exited non-zero
# with no `Tests` line at all. The receipt invokes vitest plainly, and this runner must invoke
# what the receipt invokes — a runner that changes the command is testing a different gate.
# Measured, so the reason is a fact rather than a preference.
export NO_COLOR=1
export FORCE_COLOR=0
g_vitest() { local p="$1"; ( cd backend && npx vitest run "$p" 2>&1 ); }
g_node()   { node "$@" 2>&1; }

echo "════════════════════════════════════════════════════════════════════════"
echo " ALL GATES  —  HEAD $(git rev-parse HEAD 2>/dev/null || echo '(unresolvable)')"
echo "════════════════════════════════════════════════════════════════════════"

# ---- Gate labels are ASSIGNED, not computed --------------------------------------------
# Two labels can only collide if a human writes both. This loop assigns every label
# sequentially at run time, so the label IS the position and cannot drift from it.
#
# It is written this way because the previous form could and did drift. The old runner
# hard-coded `gate05` for the HTTP probe and then computed `gate$((r+3))` for the rounds
# loop, whose first iteration (r=2) is ALSO gate05. The count stayed right — 33 runs
# genuinely happened — while every label after the tenth was one lower than the document
# said, and nothing is or was labelled gate33. A count cannot see a duplicate name:
# `GATES RUN: 33` was satisfied by 33 labels of which two were identical.
#
# The label list is collected in LABELS and asserted duplicate-free below, so the failure
# is loud rather than silent if this is ever rewritten by hand.
LABELS=()
# The label-to-name pairing, kept separately from LABELS. `LABELS` carries identity (and is
# asserted unique); this carries the ordered (label, name) list the manifest is GENERATED from.
# Keeping them apart matters: a manifest built from LABELS alone would record 33 ordinals with no
# statement of what each one ran, which is the same unasserted-number class in a new file.
LABEL_NAMES=()
# NOTE: next_label sets LBL rather than printing it, deliberately. Calling it as
# `lbl="$(next_label)"` runs it in a COMMAND-SUBSTITUTION SUBSHELL, so `LABELS+=` mutates a
# copy that dies when the subshell exits — the counter never advances and every gate is
# labelled gate00. Measured, not theorised: the first version of this function did exactly
# that and labelled all 33 gates "gate00". Returning via a variable is what keeps the
# assignment in the current shell.
LBL=""
next_label() { LABELS+=("$(printf 'gate%02d' "${#LABELS[@]}")"); LBL="${LABELS[-1]}"; }

run() { # run <label> <fn...>
  local label="$1"; shift
  local out rc
  out="$("$@" 2>&1)"; rc=$?
  report "$label" "$out" "$rc"
  if [ "$?" != "0" ] && [ "$FAIL_FAST" = "1" ]; then echo "  --fail-fast: stopping"; return 9; fi
  return 0
}

# run_named <short name> <fn...> — assigns the next sequential label and appends the name,
# so the RUNNER prints the gate's identity and the document can derive labels from this
# output instead of writing them by hand.
run_named() { # run_named <name> <fn...>
  local name="$1"; shift
  next_label
  LABEL_NAMES+=("$LBL $name")
  run "$LBL $name" "$@"
}

run_named "videoProviderRegistry"        g_vitest tests/unit/videoProviderRegistry.test.mjs
run_named "videoComplianceControls"      g_vitest tests/unit/videoComplianceControls.test.mjs
run_named "media-api.test"               g_node --test media-api/media-api.test.mjs
run_named "demo-http-flow"               g_node media-api/demo-http-flow.mjs
run_named "hostile-http-probe"           g_node media-api/hostile-http-probe.mjs
for r in 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27; do
  f="media-api/hostile-round${r}-probe.mjs"
  [ -f "$f" ] && run_named "hostile-round${r}-probe" g_node "$f"
done
run_named "control-round12-checks"       g_node media-api/control-round12-checks.mjs
run_named "smoke-adapters"               g_node media-api/smoke-adapters.mjs

# ---- The assertion the count could not make -------------------------------------------
# A duplicate label means two different commands share an identity. `GATES RUN` counts runs
# and is blind to it, so it is asserted separately and loudly.
DUPS="$(printf '%s\n' "${LABELS[@]}" | sort | uniq -d)"
if [ -n "$DUPS" ]; then
  echo " DUPLICATE GATE LABELS: $(printf '%s' "$DUPS" | tr '\n' ' ')"
  echo " (a label is an identity; two commands sharing one breaks every reference to it)"
  BAD=$((BAD+1))
fi

# ---- The execution manifest: GENERATED, never transcribed ------------------------------
# Decision 3 of the round-4 review. The recurring defect class on this lane is a number stated
# in prose and derived nowhere; the durable fix is evidence kept OUTSIDE the artifact it
# identifies, with ordinals GENERATED from the run rather than written by hand.
#
# Completeness is ASSERTED, on the same principle as the duplicate check above: a manifest that
# silently omits gates is worse than no manifest, because it reads as authoritative. Every
# label the run produced must appear exactly once, in order.
MANIFEST="$REPO/media-api/EXECUTION-MANIFEST.txt"
if [ "${#LABEL_NAMES[@]}" != "${#LABELS[@]}" ]; then
  echo " MANIFEST INCOMPLETE: ${#LABEL_NAMES[@]} named vs ${#LABELS[@]} labelled"
  echo " (every label must carry a name; a manifest that omits gates reads as authoritative)"
  BAD=$((BAD+1))
fi
if [ "${#LABELS[@]}" != "$GATES" ]; then
  echo " MANIFEST INCOMPLETE: ${#LABELS[@]} labelled vs $GATES runs"
  BAD=$((BAD+1))
fi
{
  echo "EXECUTION MANIFEST — media-api readiness suite"
  echo "generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)   (DERIVED — never hand-edit this file)"
  echo "HEAD:      $(git rev-parse HEAD 2>/dev/null || echo '<git unavailable>')"
  echo "gates:     $GATES    failed: $BAD    assertions: $TOTAL"
  echo
  echo "ORD  ID              GATE"
  echo "---  --------------  ----"
  i=0
  for entry in "${LABEL_NAMES[@]}"; do
    printf '%-3s  %-14s  %s\n' "$i" "${entry%% *}" "${entry#* }"
    i=$((i+1))
  done
} > "$MANIFEST" 2>/dev/null || echo " MANIFEST UNWRITABLE: $MANIFEST"

echo "────────────────────────────────────────────────────────────────────────"
echo " GATES RUN: $GATES     FAILED: $BAD"
echo " DERIVED ASSERTION TOTAL: $TOTAL"
if [ "$BAD" != "0" ]; then
  echo " FAILED GATES:"; for n in "${FAILED_NAMES[@]}"; do echo "   - $n"; done
fi
echo "════════════════════════════════════════════════════════════════════════"
exit $([ "$BAD" = "0" ] && echo 0 || echo 1)
