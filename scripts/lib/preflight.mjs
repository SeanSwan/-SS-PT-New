/**
 * preflight.mjs — runs scripts/validate-env.sh before any AI-invoking script.
 * Created: 2026-04-20 (Codex review fix 4)
 *
 * Purpose: enforce model-ID verification + env-var presence BEFORE any call
 * out to Claude/Gemini/OpenRouter can happen. If preflight fails, the script
 * exits with code 1 and the model call is never made.
 *
 * Usage (at top of any AI script):
 *   import './lib/preflight.mjs';   // side-effect import, runs on load
 *
 * Skip with SKIP_AI_PREFLIGHT=1 (use sparingly — only for dev loops).
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');
const validatorPath = resolve(repoRoot, 'scripts', 'validate-env.sh');

if (process.env.SKIP_AI_PREFLIGHT === '1') {
  console.warn(
    '[preflight] ⚠ SKIPPED via SKIP_AI_PREFLIGHT=1 — use sparingly. Model IDs unverified.',
  );
} else if (!existsSync(validatorPath)) {
  console.error(`[preflight] ✗ validator missing: ${validatorPath}`);
  process.exit(1);
} else {
  try {
    execSync(`bash "${validatorPath}"`, {
      cwd: repoRoot,
      stdio: 'inherit',
      env: process.env,
    });
  } catch (err) {
    console.error(
      '\n[preflight] ✗ validate-env.sh failed. Fix model IDs or env vars before running.',
    );
    process.exit(1);
  }
}
