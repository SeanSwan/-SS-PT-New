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

is_allowlisted() {
  local file="$1"
  local pattern_name="$2"
  [[ ! -f "$SECRETIGNORE" ]] && return 1

  while IFS= read -r line; do
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
  line_numbers="$(grep -nE "$regex" 2>/dev/null | cut -d: -f1 | tr '\n' ',' | sed 's/,$//' || true)"
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
    for entry in "${PATTERNS[@]}"; do
      local name="${entry%%|*}"
      local regex="${entry#*|}"
      set +e
      scan_stream_for_pattern "$file" "$name" "$regex" < <(git show ":$file" 2>/dev/null)
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
  -h|--help|"")
    cat <<EOF
Usage:
  $0 --staged               Scan STAGED BLOBS (pre-commit mode). Reads from git index.
  $0 --all                  Scan every tracked file + hot-spots (gitignored risky paths)
  $0 --hot-spots            Scan ONLY known-risky gitignored paths (e.g. .claude/settings.local.json)
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
