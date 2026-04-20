#!/usr/bin/env bash
# validate-env.sh — pre-flight check for AI workflow scripts
# Created: 2026-04-19 (3-Brain Pipeline v3 Phase 0)
#
# Runs before any AI-invoking script to enforce:
#   1. config/MODEL_VERSIONS.md has no TODO: VERIFY_ markers
#   2. Required env vars are set (GOOGLE_API_KEY, OPENROUTER_API_KEY, etc.)
#   3. Secret scanner is executable
#
# Usage (from any AI-invoking script):
#   scripts/validate-env.sh || exit 1
#
# Exit 0 = safe to proceed. Exit 1 = blocked, reason printed.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODEL_VERSIONS="$REPO_ROOT/config/MODEL_VERSIONS.md"
SCANNER="$REPO_ROOT/scripts/scan-secrets.sh"

errors=0
warnings=0

section() { echo ""; echo "── $1 ──"; }

# ============================================
# 1. Model ID verification — per CLAUDE.md Model-ID discipline + Codex Q4
# ============================================
section "Model ID Registry"

if [[ ! -f "$MODEL_VERSIONS" ]]; then
  echo "✗ MISSING: $MODEL_VERSIONS"
  echo "  This file is required. Create it from the template in 3-BRAIN-PIPELINE-PLAN-v3."
  errors=$((errors + 1))
else
  todo_count=$(grep -c "TODO: VERIFY_" "$MODEL_VERSIONS" || true)
  if [[ "$todo_count" -gt 0 ]]; then
    echo "✗ BLOCKED: $todo_count unverified model ID(s) in config/MODEL_VERSIONS.md"
    echo ""
    echo "  Verify model IDs by consulting each provider's current docs:"
    echo "    Claude:     https://docs.anthropic.com/en/docs/about-claude/models"
    echo "    Gemini:     https://ai.google.dev/gemini-api/docs/models"
    echo "    OpenAI:     https://platform.openai.com/docs/models"
    echo "    OpenRouter: https://openrouter.ai/models"
    echo ""
    echo "  Replace each 'TODO: VERIFY_*' line with the actual ID, then re-run."
    errors=$((errors + 1))
  else
    echo "✓ All model IDs verified"
  fi
fi

# ============================================
# 2. Required env vars
# ============================================
section "Environment Variables"

check_env() {
  local var="$1"
  local severity="${2:-error}"
  if [[ -z "${!var:-}" ]]; then
    if [[ "$severity" == "warn" ]]; then
      echo "⚠ $var not set (optional)"
      warnings=$((warnings + 1))
    else
      echo "✗ $var not set"
      errors=$((errors + 1))
    fi
  else
    echo "✓ $var set (${#var} char)"
  fi
}

# Check env vars as passed in from the caller's shell.
# We do NOT source .env here — it's fragile (quoting issues, special chars,
# and callers should inject env from their own dotenv-aware loader anyway).
# Node scripts use dotenv; Python scripts use python-dotenv. This script just
# verifies the variable IS set when invoked.
#
# If you want to validate env vars that only live in .env, run:
#   env $(grep -v '^#' .env | xargs -I{} echo {}) scripts/validate-env.sh

check_env GOOGLE_API_KEY
check_env OPENROUTER_API_KEY warn
check_env ANTHROPIC_API_KEY warn
check_env GEMINI_API_KEY warn   # alias, may or may not be set

# ============================================
# 3. Secret scanner is executable
# ============================================
section "Secret Scanner"

if [[ ! -f "$SCANNER" ]]; then
  echo "✗ MISSING: $SCANNER"
  errors=$((errors + 1))
elif [[ ! -x "$SCANNER" ]]; then
  echo "⚠ Not executable: $SCANNER"
  echo "  Fix: chmod +x $SCANNER"
  warnings=$((warnings + 1))
else
  echo "✓ Scanner present and executable"
fi

# ============================================
# 4. Git hooks installed
# ============================================
section "Git Hooks"

hooks_path=$(git config --local --get core.hooksPath 2>/dev/null || echo "")
if [[ "$hooks_path" == ".githooks" ]]; then
  echo "✓ core.hooksPath = .githooks"
elif [[ -z "$hooks_path" ]]; then
  echo "⚠ core.hooksPath not set — pre-commit scan will NOT run automatically"
  echo "  Fix: git config --local core.hooksPath .githooks"
  warnings=$((warnings + 1))
else
  echo "⚠ core.hooksPath = $hooks_path (expected .githooks)"
  warnings=$((warnings + 1))
fi

if [[ ! -f "$REPO_ROOT/.githooks/pre-commit" ]]; then
  echo "✗ MISSING: .githooks/pre-commit"
  errors=$((errors + 1))
fi

# ============================================
# Summary
# ============================================
section "Summary"

echo "Errors:   $errors"
echo "Warnings: $warnings"

if [[ "$errors" -gt 0 ]]; then
  echo ""
  echo "BLOCKED. Fix the errors above before invoking AI scripts."
  exit 1
fi

if [[ "$warnings" -gt 0 ]]; then
  echo ""
  echo "Proceeding with warnings."
fi

exit 0
