#!/usr/bin/env bash
# scripts/continuity-promotions.sh
# Phase B continuity bridge — list / count pending PROMOTE markers in the rolling log.
#
# Authoritative spec:
#   docs/ai-workflow/AI-HANDOFF/CONTINUITY-BRIDGE-PHASE-B-DEBATE-2026-04-22.md (§3.8 + §8 row 5)
#
# Modes:
#   $0                     List pending PROMOTE markers with curation hints (default)
#   $0 --count             Print integer count only (used by startup-read directive + append success output)
#   $0 --help              Show this usage
#
# Pending = a `<!-- PROMOTE: ... -->` marker present in .ai-workflow/continuity/rolling-last-done.md.
# Curation workflow is human-only: Sean reviews, distills, adds curated entry to
# docs/ai-workflow/AI-HANDOFF/CONTINUITY-GOOD-IDEAS.md, optionally removes the marker
# from the rolling log to indicate "processed."
#
# Created: 2026-04-22 (Chunk 1 of Phase B implementation).

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo "")"
if [[ -z "$REPO_ROOT" ]]; then
  echo "ERROR: not in a git repo" >&2
  exit 1
fi

ROLLING="$REPO_ROOT/.ai-workflow/continuity/rolling-last-done.md"

mode="${1:-list}"

case "$mode" in
  --count)
    if [[ ! -f "$ROLLING" ]]; then
      echo "0"
      exit 0
    fi
    # Require closing --> on the same line so we don't match documentation
    # references to the marker syntax (e.g. in the header).
    count=$(grep -cE '<!-- PROMOTE: .* -->' "$ROLLING" 2>/dev/null || true)
    [[ -z "$count" ]] && count=0
    echo "$count"
    exit 0
    ;;
  -h|--help)
    sed -n '2,18p' "$0" | sed 's/^# \{0,1\}//'
    exit 0
    ;;
  list|"")
    if [[ ! -f "$ROLLING" ]]; then
      echo "(no rolling log yet — nothing to promote)"
      exit 0
    fi

    count=$(grep -cE '<!-- PROMOTE: .* -->' "$ROLLING" 2>/dev/null || true)
    [[ -z "$count" ]] && count=0

    if [[ $count -eq 0 ]]; then
      echo "(no pending PROMOTE markers in $ROLLING)"
      exit 0
    fi

    echo "=== Pending PROMOTE markers in $ROLLING ($count) ==="
    echo ""
    grep -nE '<!-- PROMOTE: .* -->' "$ROLLING" || true
    echo ""
    echo "Curation workflow:"
    echo "  1. Review each marker in context (open the rolling log at the listed line)."
    echo "  2. Distill the insight into a durable entry."
    echo "  3. Add curated entry to docs/ai-workflow/AI-HANDOFF/CONTINUITY-GOOD-IDEAS.md."
    echo "  4. Optionally strike or remove the PROMOTE marker from the rolling log."
    exit 0
    ;;
  *)
    echo "ERROR: unknown mode '$mode'. Use --help." >&2
    exit 1
    ;;
esac
