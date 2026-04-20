#!/usr/bin/env bash
# scan-secrets.sh — pre-commit + write-time secret scanner
# Created: 2026-04-19 (3-Brain Pipeline v3 Patch 1)
#
# Usage:
#   scripts/scan-secrets.sh <file>...        # scan specific files
#   scripts/scan-secrets.sh --staged         # scan all staged files (pre-commit mode)
#   scripts/scan-secrets.sh --all            # scan entire working tree (audit mode)
#
# Exit codes:
#   0 = clean (no secrets found)
#   1 = secrets found OR allowlist violation
#   2 = usage error
#
# Allowlist: .secretignore at repo root (format: glob:pattern OR pattern: then file-glob)
#
# Incident origin: 2026-04-19 credential leak. Bash deny patterns alone did not
# catch a re-leak where a secret was written into a Markdown handoff doc.
# This scanner covers the Write vector — every file touched, every staged change.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SECRETIGNORE="$REPO_ROOT/.secretignore"

# -------------- Secret patterns --------------
# Ordered most-specific first. Each entry: "name|regex"
# Using ERE (POSIX extended) for grep -E compatibility on Windows Git Bash + Linux.
PATTERNS=(
  # Anthropic
  "anthropic-api-key|sk-ant-api[0-9]{1,3}-[A-Za-z0-9_-]{20,}"
  # OpenAI project key
  "openai-project-key|sk-proj-[A-Za-z0-9_-]{20,}"
  # OpenAI standard key
  "openai-standard-key|sk-[A-Za-z0-9]{48,}"
  # Google API key
  "google-api-key|AIza[A-Za-z0-9_-]{35}"
  # Slack bot token
  "slack-bot-token|xox[baprs]-[A-Za-z0-9-]{10,}"
  # GitHub personal access token
  "github-pat|ghp_[A-Za-z0-9]{36}"
  # GitHub fine-grained PAT
  "github-fg-pat|github_pat_[A-Za-z0-9_]{80,}"
  # AWS access key
  "aws-access-key|(AKIA|ASIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA)[A-Z0-9]{16}"
  # AWS secret (high false-positive risk — length only, flag for review)
  # Postgres connection URL with credentials
  "postgres-url|postgres(ql)?://[^[:space:]'\"@]+:[^[:space:]'\"@]+@[^[:space:]'\"/]+"
  # MongoDB connection URL with credentials
  "mongodb-url|mongodb(\\+srv)?://[^[:space:]'\"@]+:[^[:space:]'\"@]+@[^[:space:]'\"/]+"
  # MySQL connection URL with credentials
  "mysql-url|mysql://[^[:space:]'\"@]+:[^[:space:]'\"@]+@[^[:space:]'\"/]+"
  # JWT (header.payload.signature, base64url)
  "jwt-token|eyJ[A-Za-z0-9_=-]{5,}\\.eyJ[A-Za-z0-9_=-]{5,}\\.[A-Za-z0-9_.+/=-]{10,}"
  # Generic PEM private key
  "pem-private-key|-----BEGIN (RSA|EC|DSA|OPENSSH|PGP|ENCRYPTED) PRIVATE KEY-----"
  # Generic OpenSSH private key
  "ssh-private-key|-----BEGIN OPENSSH PRIVATE KEY-----"
  # Known rotated secret fingerprints (baked in tonight's incident)
  "rotated-render-pg-2026-04|NOAkH30o3nFKgpAxFXHEY2UlZ236FdA1"
  "rotated-gemini-2026-04|AIzaSyC8B_HGNptADhzjTbi0ZtBsTcWTX0U7S8c"
)

# -------------- File type allowlist --------------
# Files that should NEVER be scanned (binary, generated, vendor)
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

# -------------- Helpers --------------

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
  # Check .secretignore for "file:pattern" or "pattern" allowlist
  local file="$1"
  local pattern_name="$2"
  [[ ! -f "$SECRETIGNORE" ]] && return 1

  # Format 1: bare file glob (line starts with path) — allowlists ALL secrets in that file
  # Format 2: "<file-glob>::<pattern-name>" — allowlists specific pattern in specific file
  # Format 3: "@<pattern-name>" — globally allowlists a pattern (use with extreme care)

  while IFS= read -r line; do
    # Skip comments + blanks
    [[ -z "$line" || "$line" =~ ^# ]] && continue

    # Global pattern allowlist
    if [[ "$line" =~ ^@(.+)$ ]]; then
      [[ "${BASH_REMATCH[1]}" == "$pattern_name" ]] && return 0
      continue
    fi

    # File+pattern allowlist
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

    # Bare file glob
    # shellcheck disable=SC2053
    if [[ "$file" == $line ]]; then
      return 0
    fi
  done < "$SECRETIGNORE"

  return 1
}

scan_file() {
  local file="$1"
  local hits=0

  # Skip non-existent (e.g., staged deletion)
  [[ ! -f "$REPO_ROOT/$file" && ! -f "$file" ]] && return 0

  local target="$file"
  [[ -f "$REPO_ROOT/$file" ]] && target="$REPO_ROOT/$file"

  # Skip binary files
  if file --mime-encoding "$target" 2>/dev/null | grep -q binary; then
    return 0
  fi

  for entry in "${PATTERNS[@]}"; do
    local name="${entry%%|*}"
    local regex="${entry#*|}"

    if grep -HnE "$regex" "$target" 2>/dev/null | head -5; then
      if is_allowlisted "$file" "$name"; then
        echo "  [allowlisted: $name in $file]" >&2
      else
        echo "  [SECRET FOUND: $name in $file]" >&2
        hits=$((hits + 1))
      fi
    fi
  done

  return $hits
}

# -------------- Modes --------------

mode="${1:-}"
case "$mode" in
  --staged)
    echo "=== Secret scan: staged files ==="
    mapfile -t files < <(git diff --cached --name-only --diff-filter=ACM)
    ;;
  --all)
    echo "=== Secret scan: entire working tree ==="
    mapfile -t files < <(git ls-files)
    ;;
  -h|--help|"")
    cat <<EOF
Usage:
  $0 --staged               Scan git-staged files (pre-commit mode)
  $0 --all                  Scan every tracked file
  $0 <file> [<file>...]     Scan specific files

Exit 0 = clean; exit 1 = secret(s) found.
Allowlist via .secretignore (format: file-glob | file-glob::pattern-name | @pattern-name)
EOF
    exit 2
    ;;
  *)
    files=("$@")
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
  # set +e so set -e doesn't abort on non-zero scan_file return
  set +e
  scan_file "$f"
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
  echo "To allowlist a specific file+pattern, add to .secretignore:"
  echo "  docs/ai-workflow/AI-HANDOFF/incident-doc.md::rotated-gemini-2026-04"
  exit 1
fi

echo "CLEAN."
exit 0
