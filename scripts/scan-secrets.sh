#!/usr/bin/env bash
# scan-secrets.sh — pre-commit + audit secret scanner
# Created: 2026-04-19 (3-Brain Pipeline v3 Patch 1)
# Hardened: 2026-04-20 (Codex review of commit 933fbf99)
# Extended: 2026-04-21 (hot-spots mode for gitignored local files per Codex credentials-cleanup REVISE)
#
# Scans staged git blobs (pre-commit) or working-tree files for credential patterns.
# Output discipline: file path + pattern name + line numbers ONLY.
# Matched content is never echoed to terminal or logs.
#
# Usage:
#   scripts/scan-secrets.sh --staged         pre-commit mode (staged blobs)
#   scripts/scan-secrets.sh --all            audit mode (entire tracked tree + hot-spots)
#   scripts/scan-secrets.sh --hot-spots      audit known-risky gitignored paths only
#   scripts/scan-secrets.sh --stdin          scan content piped via stdin (in-memory; used by continuity-append.mjs)
#   scripts/scan-secrets.sh <file>...        specific files on disk
#
# Allowlist via .secretignore at repo root.
#
# Hot-spots: paths that are gitignored but historically accumulate literal secrets.
# `.claude/settings.local.json` is the canonical example — Claude Code stores every
# approved Bash command verbatim, including inline env-var values. Credentials-cleanup
# 2026-04-21 closeout: tests/**/*.py is covered by standard --all mode (tracked).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SECRETIGNORE="$REPO_ROOT/.secretignore"

# Generic patterns only. Rotated fingerprints are NOT stored here — the generic
# regexes match them via character class. Storing historical values as literals
# would re-seed them into git history.
PATTERNS=(
  "anthropic-api-key|sk-ant-api[0-9]{1,3}-[A-Za-z0-9_-]{20,}"
  "openai-project-key|sk-proj-[A-Za-z0-9_-]{20,}"
  "openai-standard-key|sk-[A-Za-z0-9]{48,}"
  "google-api-key|AIza[A-Za-z0-9_-]{35}"
  "slack-bot-token|xox[baprs]-[A-Za-z0-9-]{10,}"
  "stripe-secret-key|[sr]k_(live|test)_[A-Za-z0-9]{16,}"
  "stripe-publishable-key|pk_(live|test)_[A-Za-z0-9]{16,}"
  "stripe-webhook-secret|whsec_[A-Za-z0-9]{16,}"
  "github-pat|ghp_[A-Za-z0-9]{36}"
  "github-fg-pat|github_pat_[A-Za-z0-9_]{80,}"
  "aws-access-key|(AKIA|ASIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA)[A-Z0-9]{16}"
  "postgres-url|postgres(ql)?://[^[:space:]'\"@]+:[^[:space:]'\"@]+@[^[:space:]'\"/]+"
  "mongodb-url|mongodb(\\+srv)?://[^[:space:]'\"@]+:[^[:space:]'\"@]+@[^[:space:]'\"/]+"
  "mysql-url|mysql://[^[:space:]'\"@]+:[^[:space:]'\"@]+@[^[:space:]'\"/]+"
  "jwt-token|eyJ[A-Za-z0-9_=-]{5,}\\.eyJ[A-Za-z0-9_=-]{5,}\\.[A-Za-z0-9_.+/=-]{10,}"
  "rotated-password-shape|([Pp][Aa][Ss][Ss][Ww][Oo][Rr][Dd]|[Pp][Aa][Ss][Ss])[^[:cntrl:]]{0,160}K[a-z]{4}K[a-z]{4}[0-9]{2,}!?|K[a-z]{4}K[a-z]{4}[0-9]{2,}!?[^[:cntrl:]]{0,160}([Pp][Aa][Ss][Ss][Ww][Oo][Rr][Dd]|[Pp][Aa][Ss][Ss])"
  "pem-private-key|-----BEGIN (RSA|EC|DSA|OPENSSH|PGP|ENCRYPTED) PRIVATE KEY-----"
  "ssh-private-key|-----BEGIN OPENSSH PRIVATE KEY-----"
)

# --- Operator identity (Rule 8 / Rule 39), derived at RUNTIME, never stored ------------
# 2026-08-26: 58 committed handoff docs carried the operator's OS username inside
# filesystem paths; the count had grown 59 -> 61 while being measured, because nothing
# stopped the next paste. Cleaning them buys nothing without this gate.
# The username is NEVER written into this file — hardcoding it here would make this
# file the leak (same discipline as scripts/lib/redact-egress.mjs). It is derived from
# $HOME/$USERPROFILE at scan time. If it cannot be derived, or is a common word that
# would fire on ordinary prose, the identity rule is SKIPPED (a scanner that blocks
# every commit gets disabled, which is worse than one that misses this class).
# Fix a hit by rewriting the path: <REPO>/… , <HOME>/… , <OPERATOR>.
_OPERATOR_HOME="${USERPROFILE:-$HOME}"
_OPERATOR_NAME="$(basename "${_OPERATOR_HOME:-}" 2>/dev/null || true)"
case "$(printf '%s' "${_OPERATOR_NAME:-}" | tr '[:upper:]' '[:lower:]')" in
  ''|admin|administrator|user|users|root|dev|developer|test|guest|owner|default|public|home|desktop|server|local|localhost|ubuntu|runner|node|docker|system|pi|me|main) _OPERATOR_NAME="" ;;
esac
if [[ -n "$_OPERATOR_NAME" && ${#_OPERATOR_NAME} -ge 3 ]]; then
  _OPERATOR_ESC="$(printf '%s' "$_OPERATOR_NAME" | sed 's/[][\.^$*+?(){}|\\/]/\\&/g')"
  # Separator class is [^A-Za-z0-9], not [\/]: it covers backslash, forward slash AND
  # the hyphen form used by Claude scratchpad keys (c--Users-<name>-Desktop-…), which a
  # slash-only class misses. Verified against five positive controls + one negative.
  PATTERNS+=("operator-identity|(Users|home)[^A-Za-z0-9]+${_OPERATOR_ESC}|(^|[^A-Za-z0-9_-])${_OPERATOR_ESC}@")
fi
# 8.3 short-form home paths (a Windows Users dir shortened to six chars, tilde, digit)
# leak the same account without spelling the name; machine-independent, so always on.
# NOTE: this comment deliberately does not spell that shape out — doing so made this
# file trip its own rule (caught 2026-08-26 before the first commit).
PATTERNS+=("operator-identity-8dot3|Users[^A-Za-z0-9]+[A-Za-z0-9]{6}~[0-9]")

COMBINED_REGEX=""
for entry in "${PATTERNS[@]}"; do
  regex="${entry#*|}"
  if [[ -z "$COMBINED_REGEX" ]]; then
    COMBINED_REGEX="($regex)"
  else
    COMBINED_REGEX="$COMBINED_REGEX|($regex)"
  fi
done

# Known-risky paths that are gitignored and so NEVER appear in `git ls-files`.
# These are scanned by --hot-spots and --all modes as an extra defense layer.
# Add paths here as new hot-spot classes are identified (e.g., other IDE plugin
# configs, local CI credentials files).
HOT_SPOT_PATHS=(
  ".claude/settings.local.json"
)

SKIP_PATH_PATTERNS=(
  "^node_modules/"
  "^\\.git/"
  "^dist/"
  "^build/"
  "^\\.next/"
  "^\\.vite/"
  "^coverage/"
  "^\\.venv/"
  "^venv/"
  "^\\.ai-workflow/audit/"
  "^SOUL\\.archive/"
  "^frontend/src/assets/.*\\.(png|jpg|jpeg|gif|webp|mp4|webm|mov|avi|mkv|pdf|zip|tar|gz)$"
  "^backend/uploads/"
  "^test-results/"
  "^playwright-report/"
  "\\.pyc$"
  "\\.pyo$"
  "\\.so$"
  "\\.lock$"
  "package-lock\\.json$"
  "yarn\\.lock$"
)

is_skipped_path() {
  local path="$1"
  for pat in "${SKIP_PATH_PATTERNS[@]}"; do
    if echo "$path" | grep -Eq "$pat"; then
      return 0
    fi
  done
  return 1
}

git_grep_cached_chunked() {
  local regex="$1"
  local output_file="$2"
  shift 2

  local -a batch=()
  local file grep_rc
  local found=1

  : > "$output_file"

  for file in "$@"; do
    batch+=("$file")

    if (( ${#batch[@]} >= 100 )); then
      git grep --cached -I -nE -- "$regex" -- "${batch[@]}" >> "$output_file"
      grep_rc=$?
      if (( grep_rc == 0 )); then
        found=0
      elif (( grep_rc != 1 )); then
        return "$grep_rc"
      fi
      batch=()
    fi
  done

  if (( ${#batch[@]} > 0 )); then
    git grep --cached -I -nE -- "$regex" -- "${batch[@]}" >> "$output_file"
    grep_rc=$?
    if (( grep_rc == 0 )); then
      found=0
    elif (( grep_rc != 1 )); then
      return "$grep_rc"
    fi
  fi

  return "$found"
}

is_allowlisted() {
  local file="$1"
  local pattern_name="$2"
  [[ ! -f "$SECRETIGNORE" ]] && return 1

  while IFS= read -r line; do
    # Strip a trailing CR: .secretignore is edited on Windows and picks up CRLF.
    # Without this, "file::pattern\r" never equals "pattern" and the entry is
    # SILENTLY INERT — 11 of 18 entries were dead this way when found 2026-08-26.
    # An allowlist that quietly stops allowlisting is the same failure class as a
    # secret scan that quietly stops scanning: it reports success either way.
    line="${line%$'\r'}"
    [[ -z "$line" || "$line" =~ ^# ]] && continue

    if [[ "$line" =~ ^@(.+)$ ]]; then
      [[ "${BASH_REMATCH[1]}" == "$pattern_name" ]] && return 0
      continue
    fi

    if [[ "$line" == *"::"* ]]; then
      local glob="${line%%::*}"
      local pat="${line##*::}"
      if [[ "$pat" == "$pattern_name" ]]; then
        # shellcheck disable=SC2053
        if [[ "$file" == $glob ]]; then
          return 0
        fi
      fi
      continue
    fi

    # shellcheck disable=SC2053
    if [[ "$file" == $line ]]; then
      return 0
    fi
  done < "$SECRETIGNORE"

  return 1
}

# Scan content from stdin for ONE pattern. Output: file + pattern + line numbers only.
# Matched content is NEVER printed.
scan_stream_for_pattern() {
  local label="$1"
  local pattern_name="$2"
  local regex="$3"
  local line_numbers
  line_numbers="$(LC_ALL=C grep -nE -- "$regex" 2>/dev/null | cut -d: -f1 | tr '\n' ',' | sed 's/,$//' || true)"
  [[ -z "$line_numbers" ]] && return 0

  local count
  count="$(echo "$line_numbers" | tr ',' '\n' | grep -c .)"

  if is_allowlisted "$label" "$pattern_name"; then
    echo "  [allowlisted: $pattern_name in $label ($count match(es))]" >&2
    return 0
  fi

  echo "  [SECRET FOUND: $pattern_name in $label (lines: $line_numbers)]" >&2
  return 1
}

# scan_one <--workingtree|--stagedblob> <file>
# - --workingtree: reads the path on disk
# - --stagedblob:  reads the STAGED BLOB via `git show :<path>` (pre-commit-safe)
scan_one() {
  local mode="$1"
  local file="$2"
  local hits=0

  if [[ "$mode" == "--stagedblob" ]]; then
    if ! git cat-file -e ":$file" 2>/dev/null; then
      return 0
    fi
    local mime
    mime="$(git show ":$file" 2>/dev/null | file --mime-encoding - 2>/dev/null | awk '{print $NF}')"
    if [[ "$mime" == "binary" ]]; then
      return 0
    fi
    local staged_content
    staged_content="$(git show ":$file" 2>/dev/null)"
    if ! LC_ALL=C grep -qE -- "$COMBINED_REGEX" <<< "$staged_content"; then
      return 0
    fi
    for entry in "${PATTERNS[@]}"; do
      local name="${entry%%|*}"
      local regex="${entry#*|}"
      set +e
      scan_stream_for_pattern "$file" "$name" "$regex" <<< "$staged_content"
      local rc=$?
      set -e
      (( rc != 0 )) && hits=$((hits + 1))
    done
  else
    local fullpath="$file"
    [[ -f "$REPO_ROOT/$file" ]] && fullpath="$REPO_ROOT/$file"
    [[ ! -f "$fullpath" ]] && return 0
    if file --mime-encoding "$fullpath" 2>/dev/null | grep -q binary; then
      return 0
    fi
    if ! LC_ALL=C grep -qE -- "$COMBINED_REGEX" "$fullpath"; then
      return 0
    fi
    for entry in "${PATTERNS[@]}"; do
      local name="${entry%%|*}"
      local regex="${entry#*|}"
      set +e
      scan_stream_for_pattern "$file" "$name" "$regex" < "$fullpath"
      local rc=$?
      set -e
      (( rc != 0 )) && hits=$((hits + 1))
    done
  fi

  return $hits
}

scan_staged_fast() {
  local -a staged_files=()
  local f

  scanned=0
  skipped=0
  total_hits=0

  for f in "${files[@]}"; do
    [[ -z "$f" ]] && continue
    if is_skipped_path "$f"; then
      skipped=$((skipped + 1))
      continue
    fi
    staged_files+=("$f")
    scanned=$((scanned + 1))
  done

  [[ ${#staged_files[@]} -eq 0 ]] && return 0

  local entry name regex tmp rc file line _
  for entry in "${PATTERNS[@]}"; do
    name="${entry%%|*}"
    regex="${entry#*|}"
    tmp="$(mktemp)"

    set +e
    if [[ "$name" == "rotated-password-shape" ]]; then
      # The full rotated-password regex is intentionally broad and can become
      # slow against large Markdown archives. First find cheap candidate lines,
      # then apply the expensive same-line password-context check in Bash.
      git_grep_cached_chunked "K[a-z]{4}K[a-z]{4}[0-9]{2,}!?" "$tmp" "${staged_files[@]}"
    else
      git_grep_cached_chunked "$regex" "$tmp" "${staged_files[@]}"
    fi
    rc=$?
    set -e

    if (( rc == 1 )); then
      rm -f "$tmp"
      continue
    fi

    if (( rc != 0 )); then
      rm -f "$tmp"
      echo "Secret scan failed while scanning staged files for pattern: $name" >&2
      return 2
    fi

    declare -A lines_by_file=()
    while IFS=: read -r file line _; do
      [[ -z "$file" || -z "$line" ]] && continue
      if [[ "$name" == "rotated-password-shape" && ! "$_" =~ $regex ]]; then
        continue
      fi
      if [[ -z "${lines_by_file[$file]:-}" ]]; then
        lines_by_file[$file]="$line"
      else
        lines_by_file[$file]="${lines_by_file[$file]},$line"
      fi
    done < "$tmp"
    rm -f "$tmp"

    for file in "${!lines_by_file[@]}"; do
      local line_numbers="${lines_by_file[$file]}"
      local count
      count="$(echo "$line_numbers" | tr ',' '\n' | grep -c .)"

      if is_allowlisted "$file" "$name"; then
        echo "  [allowlisted: $name in $file ($count match(es))]" >&2
        continue
      fi

      echo "  [SECRET FOUND: $name in $file (lines: $line_numbers)]" >&2
      total_hits=$((total_hits + 1))
    done
  done

  return 0
}

mode="${1:-}"
scan_mode="--workingtree"
case "$mode" in
  --staged)
    echo "=== Secret scan: STAGED BLOBS (pre-commit mode) ==="
    mapfile -t files < <(git diff --cached --name-only --diff-filter=ACM)
    scan_mode="--stagedblob"
    ;;
  --all)
    echo "=== Secret scan: entire tracked tree + hot-spots ==="
    mapfile -t files < <(git ls-files)
    # Append known-risky gitignored hot-spot paths that ls-files misses
    for hs in "${HOT_SPOT_PATHS[@]}"; do
      if [[ -f "$REPO_ROOT/$hs" ]]; then
        files+=("$hs")
      fi
    done
    scan_mode="--workingtree"
    ;;
  --hot-spots)
    echo "=== Secret scan: hot-spots only (known-risky gitignored paths) ==="
    files=()
    for hs in "${HOT_SPOT_PATHS[@]}"; do
      if [[ -f "$REPO_ROOT/$hs" ]]; then
        files+=("$hs")
      fi
    done
    if [[ ${#files[@]} -eq 0 ]]; then
      echo "No hot-spot paths present. Clean."
      exit 0
    fi
    scan_mode="--workingtree"
    ;;
  --stdin)
    # ADDITIVE 2026-04-22 (Phase B continuity bridge):
    # Read candidate content from stdin and scan in-memory. Content stays in this
    # process only — never persisted to disk. Output to stderr; exit 0/1 same as
    # other modes so callers (continuity-append.mjs) can fail-closed on hit.
    echo "=== Secret scan: STDIN mode (in-memory only) ===" >&2
    stdin_content="$(cat)"
    if [[ -z "$stdin_content" ]]; then
      echo "  [stdin empty — no scan needed]" >&2
      exit 0
    fi
    stdin_hits=0
    for entry in "${PATTERNS[@]}"; do
      name="${entry%%|*}"
      regex="${entry#*|}"
      set +e
      scan_stream_for_pattern "<stdin>" "$name" "$regex" <<< "$stdin_content"
      rc=$?
      set -e
      (( rc != 0 )) && stdin_hits=$((stdin_hits + 1))
    done
    echo "" >&2
    echo "=== Stdin scan summary ===" >&2
    echo "Hits: $stdin_hits" >&2
    if (( stdin_hits > 0 )); then
      echo "" >&2
      echo "SECRETS DETECTED in stdin candidate. Caller should refuse to write." >&2
      exit 1
    fi
    echo "STDIN CLEAN." >&2
    exit 0
    ;;
  -h|--help|"")
    cat <<EOF
Usage:
  $0 --staged               Scan STAGED BLOBS (pre-commit mode). Reads from git index.
  $0 --all                  Scan every tracked file + hot-spots (gitignored risky paths)
  $0 --hot-spots            Scan ONLY known-risky gitignored paths (e.g. .claude/settings.local.json)
  $0 --stdin                Scan content piped via stdin (in-memory only). Used by continuity-append.mjs.
  $0 <file> [<file>...]     Scan specific files on disk

Output: file + pattern name + line numbers ONLY. Matched content never echoed.

Allowlist via .secretignore:
  file.md                       allowlist ALL secrets in file
  file.md::pattern-name         allowlist ONE pattern in ONE file
  @pattern-name                 allowlist pattern globally

Exit 0 = clean, 1 = secret(s) found.
EOF
    exit 2
    ;;
  *)
    files=("$@")
    scan_mode="--workingtree"
    ;;
esac

total_hits=0
scanned=0
skipped=0

if [[ "$scan_mode" == "--stagedblob" ]]; then
  scan_staged_fast
  scan_rc=$?
  echo ""
  echo "=== Scan summary ==="
  echo "Scanned:     $scanned files"
  echo "Skipped:     $skipped files (binaries, vendor, generated)"
  echo "Hits:        $total_hits"

  if (( scan_rc != 0 )); then
    echo ""
    echo "SECRET SCAN FAILED. Commit/write blocked until scanner error is fixed."
    exit "$scan_rc"
  fi

  if [[ $total_hits -gt 0 ]]; then
    echo ""
    echo "SECRETS DETECTED. Commit/write blocked."
    echo "Pattern names + file paths reported above. Matched lines NOT shown."
    echo "Open the flagged file at the listed line number to review."
    echo ""
    echo "To allowlist a specific file+pattern, add to .secretignore:"
    echo "  path/to/file.md::pattern-name"
    exit 1
  fi

  echo "CLEAN."
  exit 0
fi

for f in "${files[@]}"; do
  [[ -z "$f" ]] && continue
  if is_skipped_path "$f"; then
    skipped=$((skipped + 1))
    continue
  fi
  scanned=$((scanned + 1))
  set +e
  scan_one "$scan_mode" "$f"
  file_hits=$?
  set -e
  if (( file_hits > 0 )); then
    total_hits=$((total_hits + file_hits))
  fi
done

echo ""
echo "=== Scan summary ==="
echo "Scanned:     $scanned files"
echo "Skipped:     $skipped files (binaries, vendor, generated)"
echo "Hits:        $total_hits"

if [[ $total_hits -gt 0 ]]; then
  echo ""
  echo "SECRETS DETECTED. Commit/write blocked."
  echo "Pattern names + file paths reported above. Matched lines NOT shown."
  echo "Open the flagged file at the listed line number to review."
  echo ""
  echo "To allowlist a specific file+pattern, add to .secretignore:"
  echo "  path/to/file.md::pattern-name"
  exit 1
fi

echo "CLEAN."
exit 0
