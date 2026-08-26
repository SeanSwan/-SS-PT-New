#!/usr/bin/env node
/**
 * consult-ox.mjs — the Ox Alpha seat, and nothing else.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * Ox Alpha has no transport of its own: it rides `consult-grok.mjs`, selected by
 * the `SWAN_GROK_MODEL` env var. That is a footgun, and it has now fired twice.
 *
 *   2026-08-24  `--model stealth/ox-alpha` passed as a FLAG. Silently ignored
 *               (the script reads the env, not argv). Grok 4.6 was served.
 *               Written up in memory: "fire Ox as SWAN_GROK_MODEL=..., and check
 *               the output header's `Served:` line before attributing anything."
 *
 *   2026-08-25  Ran `SWAN_GROK_MODEL="${SWAN_GROK_MODEL:-}" node consult-grok.mjs`
 *               — which sets the variable to the EMPTY STRING, so MODEL fell back
 *               to the x-ai/grok-4.6 default. The report correctly said
 *               `Grok 4.6 — Hostile Gate Review` / `Served: x-ai/grok-4.6`.
 *               It was relayed to Sean as "Ox Alpha" anyway. Sean caught it.
 *
 * The 2026-08-24 write-up did not prevent the 2026-08-25 repeat, because a
 * lesson that depends on remembering to read a header is not a control. The
 * control is this file: there is no env var to forget, and no default to fall
 * back to. `node scripts/consult-ox.mjs ...` runs Ox or it exits non-zero.
 *
 * PRIVACY — READ BEFORE USE
 * -------------------------
 * Ox is $0 because it is an OpenRouter *stealth* listing: an undisclosed lab is
 * evaluating the model and RETAINS the prompts it is sent. Sean has standingly
 * accepted this for design briefs and code-review packets (2026-08-23), and that
 * acceptance explicitly does NOT extend to client PII, credentials, medical or
 * immigration data, secrets, or raw config. Scrub the packet; do not drop the
 * seat. Rules 8 / 44 / 59 are untouched by the standing yes.
 *
 * USAGE — identical to consult-grok.mjs, minus --model:
 *   node scripts/consult-ox.mjs --document <path> --out <path> --remit "..." [--effort high]
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const OX_MODEL = 'stealth/ox-alpha';
const here = path.dirname(fileURLToPath(import.meta.url));
const transport = path.join(here, 'consult-grok.mjs');

const argv = process.argv.slice(2);

// Refuse a --model flag rather than ignore it. Ignoring it is precisely how the
// 2026-08-24 misfire happened: the caller believed it had selected a seat.
const modelFlag = argv.findIndex((a) => a === '--model' || a.startsWith('--model='));
if (modelFlag !== -1) {
  console.error('[consult-ox] --model is not accepted here. This wrapper IS the Ox seat.');
  console.error('[consult-ox] For a different model use consult-grok.mjs with SWAN_GROK_MODEL.');
  process.exit(2);
}

console.error(`[consult-ox] seat=Ox Alpha model=${OX_MODEL} (stealth listing — prompts are RETAINED)`);

const child = spawn(process.execPath, [transport, ...argv], {
  stdio: 'inherit',
  // Overwrite rather than default: an inherited SWAN_GROK_MODEL from the parent
  // shell must not be able to silently redirect this seat somewhere else.
  env: { ...process.env, SWAN_GROK_MODEL: OX_MODEL },
});
child.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 1)));
