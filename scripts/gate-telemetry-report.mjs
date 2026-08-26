#!/usr/bin/env node
/**
 * gate-telemetry-report.mjs — did this gate ever actually catch anything?
 * =======================================================================
 * The question nobody in this repo could answer. Fourteen hooks, months of accretion,
 * and zero data on whether any of them ever prevented a real defect — while panel spend
 * was tracked to four decimal places. You could price the policing but not the policed,
 * and that asymmetry is why the apparatus only ever grew.
 *
 * This reads .ai-workflow/gate-telemetry.jsonl and prints, per hook: how often it ran,
 * how often it fired, and how often it fired while shadowed (i.e. would have blocked a
 * turn but did not). At the end of the shadow window that table is the retire decision.
 *
 * IT DOES NOT DECIDE. A hook with zero fires is a RETIREMENT CANDIDATE, not a retirement
 * — the fires still need human classification into real-catch vs wrongful-block, which is
 * the one judgement no counter can make. Printing a recommendation as if it were a
 * verdict would repeat the error this whole exercise exists to correct.
 *
 * Run: node scripts/gate-telemetry-report.mjs [--json]
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOG = join(ROOT, '.ai-workflow', 'gate-telemetry.jsonl');
const CONFIG = join(ROOT, '.ai-workflow', 'gate-mode.json');
const asJson = process.argv.includes('--json');

if (!existsSync(LOG)) {
  console.log('[gate-telemetry] no log yet at .ai-workflow/gate-telemetry.jsonl');
  console.log('  Nothing has been recorded. This is UNKNOWN, not "the gates never fire".');
  process.exit(0);
}

const rows = [];
let malformed = 0;
for (const line of readFileSync(LOG, 'utf-8').split('\n')) {
  if (!line.trim()) continue;
  try { rows.push(JSON.parse(line)); } catch { malformed++; }
}

const byHook = new Map();
for (const r of rows) {
  const k = r.hook || '(unnamed)';
  if (!byHook.has(k)) byHook.set(k, { runs: 0, fired: 0, blocked: 0, shadowed: 0, lat: [] });
  const h = byHook.get(k);
  h.runs++;
  if (r.fired) h.fired++;
  if (r.blocked) h.blocked++;
  if (r.shadowed) h.shadowed++;
  if (Number.isFinite(r.latency_ms)) h.lat.push(r.latency_ms);
}

let cfg = null;
try { cfg = JSON.parse(readFileSync(CONFIG, 'utf-8')); } catch { /* optional */ }
const shadowed = new Set(Array.isArray(cfg?.shadow) ? cfg.shadow : []);

if (asJson) {
  console.log(JSON.stringify({ rows: rows.length, malformed, hooks: Object.fromEntries(byHook) }, null, 2));
  process.exit(0);
}

const window = cfg?.until ? `shadow window ends ${cfg.until}` : 'no shadow window configured';
console.log(`[gate-telemetry] ${rows.length} record(s)${malformed ? `, ${malformed} malformed` : ''} — ${window}\n`);
console.log('HOOK'.padEnd(26) + 'RUNS'.padStart(6) + 'FIRED'.padStart(7) + 'BLOCKED'.padStart(9) + 'SHADOWED'.padStart(10) + '  p50ms  MODE');

for (const [hook, h] of [...byHook].sort((a, b) => b[1].fired - a[1].fired)) {
  const lat = h.lat.sort((a, b) => a - b);
  const p50 = lat.length ? lat[Math.floor(lat.length / 2)] : '-';
  console.log(
    hook.padEnd(26) + String(h.runs).padStart(6) + String(h.fired).padStart(7) +
    String(h.blocked).padStart(9) + String(h.shadowed).padStart(10) +
    String(p50).padStart(7) + '  ' + (shadowed.has(hook) ? 'shadow' : 'blocking')
  );
}

const never = [...byHook].filter(([, h]) => h.fired === 0).map(([k]) => k);
console.log('');
if (never.length) {
  console.log(`RETIREMENT CANDIDATES (fired 0 times): ${never.join(', ')}`);
  console.log('  Candidate, not verdict. Confirm the window was long enough and that the hook');
  console.log('  actually ran (RUNS > 0) before removing anything.');
}
console.log('NEXT: classify each FIRED event as real-catch / wrongful-block / duplicate.');
console.log('  A counter cannot make that call, and it is the only one that matters.');
console.log('  Hooks never recorded here are absent from this table entirely — absence of a');
console.log('  row means "never instrumented", NOT "never fired".');
