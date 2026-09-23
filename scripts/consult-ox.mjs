#!/usr/bin/env node
/**
 * consult-ox.mjs — compatibility transport for GLM 5.3 Flash.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The historical Ox label has no current workflow meaning. The revealed route
 * is Z.ai's GLM 5.3 Flash, and this file remains only so old callers cannot
 * silently select a different model. New packet policy calls this route
 * `glmflash` and documents it as the second GLM pass.
 *
 * The wrapper pins the model and refuses a model flag. The child output's
 * `Served:` line remains the final identity evidence. The current route is the
 * direct Z.ai coding-plan API, not the historical OpenRouter compatibility path.
 *
 * PRIVACY — READ BEFORE USE
 * -------------------------
 * RESOLVED 2026-08-26: the historical stealth listing was identified as Z.ai's
 * GLM-5.3 Flash, and the route is now pinned to the direct Z.ai model
 * `glm-5.3-flash`.
 *
 * TWO CONSEQUENCES WORTH KEEPING:
 * GLM 5.3 and GLM 5.3 Flash share one Z.ai lineage. Their agreement is useful
 * tiered input but is not independent-provider corroboration. The packet still
 * requires scrubbing and the egress gate; subscription billing does not waive
 * privacy, secrets, PII, or classroom/private-derived-data rules.
 *
 * USAGE — identical to consult-glm.mjs, with the model pinned:
 *   node scripts/consult-ox.mjs --document <path> --out <path> --remit "..." --max-tokens 8000
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const OX_MODEL = 'glm-5.3-flash';
const here = path.dirname(fileURLToPath(import.meta.url));
const transport = path.join(here, 'consult-glm.mjs');

const argv = process.argv.slice(2);

// Refuse a --model flag rather than ignore it. Ignoring it is precisely how the
// 2026-08-24 misfire happened: the caller believed it had selected a seat.
const modelFlag = argv.findIndex((a) => a === '--model' || a.startsWith('--model='));
if (modelFlag !== -1) {
  console.error('[consult-ox] --model is not accepted: this wrapper is pinned to glm-5.3-flash.');
  process.exit(2);
}

console.error(`[consult-ox] compatibility=glmflash model=${OX_MODEL} route=direct-zai`);
console.error('[consult-ox] NOTE: same Z.ai lineage as glm-5.3; not independent-provider corroboration.');

const child = spawn(process.execPath, [transport, '--model', OX_MODEL, ...argv], {
  stdio: 'inherit',
  env: { ...process.env },
  windowsHide: true,
});
child.on('error', () => {
  console.error('[consult-ox] child-start-failed; provider was not dispatched by this wrapper.');
  process.exitCode = 2;
});
// On POSIX allow the direct runner to abort and retain its unresolved guard.
// Windows may terminate immediately; the direct runner persists the guard before fetch.
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  if (child.exitCode === null && child.signalCode === null) child.kill(signal);
});
child.on('close', (code, signal) => { process.exitCode = signal ? 2 : (code ?? 2); });
