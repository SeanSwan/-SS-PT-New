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
 * RESOLVED 2026-08-26: the stealth period ENDED and OpenRouter revealed the model —
 * `stealth/ox-alpha` WAS ZAI's GLM-5.3 Flash, and the slug now 404s with a pointer to
 * `z-ai/glm-5.3-flash`. This wrapper follows it there (Sean's call, 2026-08-26: it is
 * on roughly a 3x discount, so call it freely).
 *
 * TWO CONSEQUENCES WORTH KEEPING:
 *   1. The data-egress caution is CLOSED — the undisclosed lab was Z.AI.
 *   2. Ox and the glm-5.3 seat were never independent. Every "both seats independently
 *      converged" conclusion recorded while Ox sat on the panel was ONE FAMILY answering
 *      twice. Use this seat as a cheap, fast WORKER; for genuine review corroboration the
 *      seats must come from different LABS (Anthropic / OpenAI / Google / Moonshot /
 *      Alibaba), not two tiers of one.
 *
 * Historical note — Ox was $0 because it was an OpenRouter *stealth* listing: an
 * undisclosed lab was evaluating the model and RETAINED the prompts sent. Sean has standingly
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

const OX_MODEL = 'z-ai/glm-5.3-flash';
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

console.error(`[consult-ox] seat=Ox (now GLM-5.3 Flash) model=${OX_MODEL}`);
console.error('[consult-ox] NOTE: same lab and lineage as the glm-5.3 seat. Cheap and fast —');
console.error('[consult-ox] but agreement between this and glm-5.3 is NOT independent corroboration.');

const child = spawn(process.execPath, [transport, ...argv], {
  stdio: 'inherit',
  // Overwrite rather than default: an inherited SWAN_GROK_MODEL from the parent
  // shell must not be able to silently redirect this seat somewhere else.
  env: { ...process.env, SWAN_GROK_MODEL: OX_MODEL },
});
child.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 1)));
