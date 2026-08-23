#!/usr/bin/env bash
#
# hermes-backup.sh — deterministic, model-independent encrypted backup of the
# Hermes BRAIN + IDENTITY layers to the restic repo on Z:. Excludes reinstallable
# CODE/caches. Writes a status line Hermes can report in the morning briefing.
#
# Layers (verified 2026-07-22):
#   BRAIN    (portable)  : brain-vault/, .hermes/{memories,skills,state,kanban.db,
#                          state.db,verification_evidence.db,cron/jobs.json}
#   IDENTITY (private)   : .hermes/{.env,config.yaml,auth.json,channel_directory.json,
#                          mcp-tokens/,pairing/,sessions/}
#   CODE     (EXCLUDED)  : hermes-agent/, vendor/, venvs/, worktrees/, *cache*, logs/
#
# ---------------------------------------------------------------------------
# HARDENED 2026-08-23 — REQUIRED-path gate. Read this before "simplifying" it.
#
# INCIDENT: between 2026-08-08 and 2026-08-19, `brain-vault` was absent from this
# script's include list resolution, and TWELVE consecutive nightly runs reported
# "BACKUP OK" while omitting the single most valuable asset in the repo. Proven
# from the snapshot record: those nights carry 15 paths, the nights either side
# carry 16, and the one that differs is brain-vault. No data was lost (the vault
# returned on 08-20), but a restore performed during that window would have
# produced a silently stale vault that everyone believed was current.
#
# ROOT CAUSE: the old resolution loop was
#     for p in "${INCLUDE[@]}"; do [ -e "$p" ] && PATHS+=("$p"); done
# commented "robust to layout drift". It was not robust; it was fail-open. It
# converted "the vault is missing" into "the backup is smaller", which is the
# one translation a backup system must never make. A signal that is always true
# detects nothing.
#
# FIX: paths are now split. REQUIRED paths are irreplaceable — if one is missing
# the run REFUSES and exits 1 rather than producing a confident partial backup.
# OPTIONAL paths may legitimately be absent, and every skip is RECORDED in the
# status file so a shrinking backup is visible instead of silent.
# ---------------------------------------------------------------------------
#
set -euo pipefail
export PATH="$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin"

H="$HOME/hermes2"
export RESTIC_REPOSITORY="/mnt/z/HermesBackups/restic-repo"
export RESTIC_PASSWORD_FILE="$H/.hermes/.restic-password"
STATUS_FILE="$H/.hermes/state/last-backup.json"
mkdir -p "$H/.hermes/state"

TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Single instance. Two concurrent runs contend for the restic repo lock and the loser reports
# a failure that is really just contention.
exec 9>"$H/.hermes/state/.backup.lock" || { echo "cannot open lock" >&2; exit 2; }
if ! flock -n 9; then
  # Does NOT write the status file: the run holding the lock owns it.
  echo "BACKUP SKIPPED $TS — another hermes-backup holds the lock" >&2; exit 2
fi

fail() {  # fail <message> — write an error status and stop. Never leaves a stale "ok".
  local msg; msg="$(printf '%s' "$1" | tr -d '"' | tr '\n' ' ' | cut -c1-300)"
  printf '{"status":"error","ts":"%s","error":"%s"}\n' "$TS" "$msg" > "$STATUS_FILE"
  echo "BACKUP FAILED $TS — $msg" >&2
  exit 1
}

# --- REQUIRED: irreplaceable. Missing one is a FAILURE, not a smaller backup. ---
REQUIRED=(
  "$H/brain-vault"                 # the Karpathy Wiki — the whole point of this job
  "$H/.hermes/memories"
  "$H/.hermes/config.yaml"
  "$H/.hermes/.env"
)

# --- OPTIONAL: may legitimately not exist; absence is recorded, not fatal. ---
OPTIONAL=(
  "$H/.hermes/skills"
  "$H/.hermes/state"
  "$H/.hermes/cron/jobs.json"
  "$H/.hermes/kanban.db"
  "$H/.hermes/state.db"
  "$H/.hermes/verification_evidence.db"
  "$H/.hermes/auth.json"
  "$H/.hermes/channel_directory.json"
  "$H/.hermes/mcp-tokens"
  "$H/.hermes/pairing"
  "$H/.hermes/sessions"
  "$H/manifests"
)

# Preflight: the repo password must be readable, or restic fails in a confusing way.
[ -r "$RESTIC_PASSWORD_FILE" ] || fail "restic password file unreadable: $RESTIC_PASSWORD_FILE"
[ -d "$RESTIC_REPOSITORY" ]    || fail "restic repository not reachable (is Z: mounted?): $RESTIC_REPOSITORY"

MISSING_REQ=()
# Existence is NOT enough. A failed mount presents an EMPTY directory, which `[ -e ]`
# happily accepts — the same fail-open class as the bug this gate was written to kill.
# A required directory must have contents; a required file must have bytes.
for p in "${REQUIRED[@]}"; do
  if   [ ! -e "$p" ];                                        then MISSING_REQ+=("${p#$H/}(absent)")
  elif [ -d "$p" ] && [ -z "$(ls -A "$p" 2>/dev/null)" ];     then MISSING_REQ+=("${p#$H/}(EMPTY-dir:failed-mount?)")
  elif [ -f "$p" ] && [ ! -s "$p" ];                          then MISSING_REQ+=("${p#$H/}(zero-bytes)")
  fi
done
if [ ${#MISSING_REQ[@]} -gt 0 ]; then
  fail "REQUIRED path(s) missing, refusing to write a partial backup: ${MISSING_REQ[*]}"
fi

PATHS=("${REQUIRED[@]}")
SKIPPED=()
for p in "${OPTIONAL[@]}"; do
  if [ -e "$p" ]; then PATHS+=("$p"); else SKIPPED+=("${p#$H/}"); fi
done
SKIPPED_STR="$(printf '%s ' "${SKIPPED[@]:-}" | sed 's/ *$//')"

# --- exclude reinstallable / ephemeral even if nested under an include ---
EXCLUDES=(
  --exclude "*/audio_cache/*" --exclude "*/image_cache/*"
  --exclude "*.tmp" --exclude "*/cache/*" --exclude "*/__pycache__/*"
  --exclude "*/node_modules/*"
)

if restic backup --tag hermes-auto --tag "brain+identity" "${EXCLUDES[@]}" "${PATHS[@]}" > /tmp/hermes-backup.log 2>&1; then
  # --tag is LOAD-BEARING: this repo has a SECOND writer (hermes-private-auto). Unscoped,
  # this could record THAT job's snapshot id as if it were ours.
  # NO `--last`/`--latest`: both mean "last n per host AND PATH-SET", and this tag has two
  # path-set groups, so they return TWO snapshots — one of them a 15-path, VAULT-LESS one.
  # `tail -1` then picks by ordering luck. The full tagged list is chronological; take its end.
  # --path is the load-bearing half (GROK, round 2): it makes restic itself exclude every
  # snapshot that does not contain the vault, so the id recorded here can never name one of
  # the nine 15-path VAULT-LESS snapshots. Relying on array order alone was leaning on an
  # ordering restic does not contract. jq is absent on this host, so restic's own --path
  # filter does the work instead of a jq sort. Verified 2026-08-23: 11 returned, 0 vault-less.
  SNAP="$(restic snapshots --tag hermes-auto --path "$H/brain-vault" --json 2>/dev/null | tail -c 4000 | grep -o "\"short_id\":\"[a-f0-9]*\"" | tail -1 | cut -d\" -f4 || true)"
  # Fail closed rather than record a blank id (GROK): an empty SNAP means no vault-bearing
  # snapshot was found, which is exactly the condition this whole workstream exists to catch.
  if [ -z "${SNAP:-}" ]; then fail "no vault-bearing snapshot found after a successful backup"; fi
  SIZE="$(restic stats --mode raw-data 2>/dev/null | grep -i "Total Size" | awk "{print \$3, \$4}" || true)"
  # retention: keep 7 daily, 4 weekly, 6 monthly. A prune failure is REPORTED, not
  # swallowed — a repo that silently stops pruning grows until the disk is full.
  PRUNE="ok"
  restic forget --tag hermes-auto --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune \
    >> /tmp/hermes-backup.log 2>&1 || PRUNE="failed"
  # A failed prune still needs a human, but the snapshot IS valid. Report a DISTINCT
  # state instead of "ok" + exit 1 — a monitor reading only .status would see "ok"
  # while the exit code screamed. One state, one meaning.
  STATE="ok"; [ "$PRUNE" = "ok" ] || STATE="degraded"
  # RESTORE SPOT-CHECK. `restic backup` exiting 0 says the writer succeeded; it says nothing
  # about whether a byte can be read back. Restoring ONE real file from the snapshot just
  # written and comparing it to the live original costs ~1s, and is the only step here that
  # proves the repo can actually produce data.
  RESTORE_CHECK="skipped"
  if [ -n "${SNAP:-}" ]; then
    # NO `exit` in awk and NO `head`: either closes the pipe early, `restic ls` takes SIGPIPE,
    # and with `pipefail` the whole script dies 141. Print once via a flag and drain the input.
    # Sample from brain-vault deliberately — it is the payload this job exists for, and it keeps
    # the identity files (.env, auth.json, tokens) out of a temp restore directory entirely.
    # awk program held in a single-quoted variable: inlining it inside the double-quoted
    # $( ) let the SHELL expand $1/$4/$7 before awk ever saw them, which under `set -u`
    # aborted the run with '$1: unbound variable'. A variable's value is not re-expanded.
    AWK_PICK='!f && $1 ~ /^-/ && $4+0 > 0 { p=$7; for(i=8;i<=NF;i++) p=p" "$i; if (p ~ /\/brain-vault\//) { print p; f=1 } }'
    SAMPLE="$(restic ls --long "$SNAP" 2>/dev/null | awk "$AWK_PICK")"
    if [ -n "$SAMPLE" ] && [ -f "$SAMPLE" ]; then
      RTMP="$(mktemp -d)"
      if restic restore "$SNAP" --include "$SAMPLE" --target "$RTMP" >/dev/null 2>&1 && cmp -s "$RTMP$SAMPLE" "$SAMPLE"; then
        RESTORE_CHECK="ok"
      else
        RESTORE_CHECK="FAILED"
      fi
      rm -rf "$RTMP"
    fi
  fi
  # explicit if, not `[ ] && VAR=`: under `set -e` a standalone AND-list whose left
  # side fails is a well-known ambiguity. Do not make the reader reason about it.
  if [ "$RESTORE_CHECK" = "FAILED" ]; then STATE="degraded"; fi

  printf '{"status":"%s","ts":"%s","snapshot":"%s","repo_size":"%s","paths":%d,"skipped":"%s","prune":"%s","restore_check":"%s"}\n' \
    "$STATE" "$TS" "${SNAP:-?}" "${SIZE:-?}" "${#PATHS[@]}" "$SKIPPED_STR" "$PRUNE" "$RESTORE_CHECK" > "$STATUS_FILE"
  echo "BACKUP ${STATE^^} $TS snapshot=${SNAP:-?} repo=${SIZE:-?} paths=${#PATHS[@]} prune=$PRUNE restore=$RESTORE_CHECK${SKIPPED_STR:+ skipped=$SKIPPED_STR}"
  [ "$STATE" = "ok" ] || exit 1
else
  fail "$(tail -3 /tmp/hermes-backup.log)"
fi
