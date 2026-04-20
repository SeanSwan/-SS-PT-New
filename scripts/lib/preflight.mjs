/**
 * preflight.mjs — cross-platform preflight for AI-invoking scripts.
 * Created: 2026-04-20 (Codex review of commit d0334e19 found bash dependency + ESM ordering bug)
 *
 * What it does (in order):
 *   1. Load root .env and backend/.env (best-effort, no failure on missing files)
 *   2. Verify config/MODEL_VERSIONS.md has no `TODO: VERIFY_` markers
 *   3. Verify at least one Gemini key alias is set (GEMINI_API_KEY / GOOGLE_API_KEY / GOOGLE_AI_KEY)
 *   4. Warn on missing optional keys (OPENROUTER_API_KEY / ANTHROPIC_API_KEY)
 *   5. Exit 1 on any error BEFORE the calling script makes API calls
 *
 * Why pure Node (no bash):
 *   - Sean runs from PowerShell on Windows. `bash` there resolves to WSL,
 *     which may not be installed — Codex's review of d0334e19 caught this.
 *   - Node runs on every platform we target. Validation logic is small
 *     enough to live here without a dependency on a shell interpreter.
 *
 * Why load .env here (before validation):
 *   - Static ESM imports evaluate BEFORE the importer's module body. So
 *     `import './lib/preflight.mjs'` fires before the importer's loadEnv()
 *     call. If validation ran before .env was loaded, it would fail even
 *     when .env contained all required keys. This module loads .env itself.
 *
 * Usage (at top of any AI script):
 *   import './lib/preflight.mjs';   // side-effect import, runs on load
 *
 * Escape hatch for dev loops (use sparingly):
 *   SKIP_AI_PREFLIGHT=1 node scripts/consult-gemini.mjs --ask "..."
 */

import { readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');

// ────────────────────────────────────────────────────────────
// 0. Fast skip
// ────────────────────────────────────────────────────────────
if (process.env.SKIP_AI_PREFLIGHT === '1') {
  console.warn(
    '[preflight] ⚠ SKIPPED via SKIP_AI_PREFLIGHT=1 — use sparingly. Model IDs unverified.',
  );
} else {
  runPreflight();
}

function runPreflight() {
  const errors = [];
  const warnings = [];

  // ──────────────────────────────────────────────────────────
  // 1. Load .env files (idempotent, best-effort)
  // ──────────────────────────────────────────────────────────
  loadDotEnv(resolve(REPO_ROOT, '.env'));
  loadDotEnv(resolve(REPO_ROOT, 'backend', '.env'));

  // ──────────────────────────────────────────────────────────
  // 2. Verify MODEL_VERSIONS.md has no TODO: VERIFY_
  // ──────────────────────────────────────────────────────────
  const registryPath = resolve(REPO_ROOT, 'config', 'MODEL_VERSIONS.md');
  if (!existsSync(registryPath)) {
    errors.push(
      `MODEL_VERSIONS.md missing at ${registryPath}. Required by CLAUDE.md model-ID discipline.`,
    );
  } else {
    const txt = readFileSync(registryPath, 'utf8');
    const todoMatches = txt.match(/TODO:\s*VERIFY_[A-Z0-9_]+/g) || [];
    if (todoMatches.length > 0) {
      errors.push(
        `${todoMatches.length} unverified model ID(s) in config/MODEL_VERSIONS.md. ` +
          `Replace each "TODO: VERIFY_*" with the current model ID from the provider's docs:\n` +
          `    Claude:     https://docs.anthropic.com/en/docs/about-claude/models\n` +
          `    Gemini:     https://ai.google.dev/gemini-api/docs/models\n` +
          `    OpenAI:     https://platform.openai.com/docs/models\n` +
          `    OpenRouter: https://openrouter.ai/models`,
      );
    }
  }

  // ──────────────────────────────────────────────────────────
  // 3. Verify Gemini key alias (at least one must be set)
  // ──────────────────────────────────────────────────────────
  const geminiAliases = ['GEMINI_API_KEY', 'GOOGLE_API_KEY', 'GOOGLE_AI_KEY'];
  const geminiKeySet = geminiAliases.find((a) => (process.env[a] || '').length > 0);
  if (!geminiKeySet) {
    errors.push(
      `None of the Gemini key aliases set: ${geminiAliases.join(', ')}. ` +
        `Set one in .env or backend/.env.`,
    );
  }

  // ──────────────────────────────────────────────────────────
  // 4. Optional keys — warn only
  // ──────────────────────────────────────────────────────────
  if (!process.env.OPENROUTER_API_KEY) {
    warnings.push('OPENROUTER_API_KEY not set — AI Village orchestrator tracks that use OpenRouter will fail.');
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    warnings.push('ANTHROPIC_API_KEY not set — any direct Anthropic API call will fail (OpenRouter may substitute).');
  }

  // ──────────────────────────────────────────────────────────
  // 5. Report
  // ──────────────────────────────────────────────────────────
  if (warnings.length > 0) {
    for (const w of warnings) console.warn(`[preflight] ⚠ ${w}`);
  }

  if (errors.length > 0) {
    console.error('\n[preflight] ✗ BLOCKED — AI scripts cannot proceed:\n');
    for (const e of errors) console.error(`  • ${e}\n`);
    console.error('[preflight] To bypass in dev loops: SKIP_AI_PREFLIGHT=1 <command>');
    process.exit(1);
  }

  if (process.env.VERBOSE_PREFLIGHT === '1') {
    console.log(
      `[preflight] ✓ OK — ${geminiKeySet} set (${(process.env[geminiKeySet] || '').length} chars), registry verified`,
    );
  }
}

/**
 * Parse a dotenv file and inject into process.env if not already set.
 * Tolerates: quoted values, export prefix, inline comments, blank lines,
 * and values containing =. Does NOT override pre-existing process.env values
 * (matches the behavior of most dotenv libraries).
 */
function loadDotEnv(path) {
  if (!existsSync(path)) return;
  let content;
  try {
    content = readFileSync(path, 'utf8');
  } catch {
    return;
  }
  const lines = content.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const stripped = line.replace(/^export\s+/, '');
    const eq = stripped.indexOf('=');
    if (eq <= 0) continue;
    const key = stripped.slice(0, eq).trim();
    let val = stripped.slice(eq + 1).trim();

    // Strip surrounding quotes (single OR double)
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    } else {
      // Strip trailing inline comments only when value is unquoted
      const hashIdx = val.indexOf(' #');
      if (hashIdx !== -1) val = val.slice(0, hashIdx).trim();
    }

    // Don't override process.env if already set by the caller's environment.
    if (!(key in process.env) || process.env[key] === undefined || process.env[key] === '') {
      process.env[key] = val;
    }
  }
}
