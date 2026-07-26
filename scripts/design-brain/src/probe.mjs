/** Keep one coarse, overwrite-only connector availability heartbeat. */
import { join } from 'node:path';
import { resolveDataRoot } from './paths.mjs';
import { safeWriteHeartbeat } from './writer.mjs';
import { validateProbe } from './provenance.mjs';
export function recordProbe(root, probe, now = new Date()) {
  validateProbe(probe);
  const row = { schemaVersion: 'probe/2', day: now.toISOString().slice(0, 10), connector: 'mobbin-mcp', available: probe.outcome === 'available', purpose: 'current connector availability' };
  safeWriteHeartbeat(root, join(root, 'probe.json'), `${JSON.stringify(row, null, 2)}\n`);
  return row;
}
function main() {
  const arg = (name) => { const index = process.argv.indexOf(`--${name}`); return index < 0 ? undefined : process.argv[index + 1]; };
  try { const row = recordProbe(resolveDataRoot(arg('root')), { queries: 1, results: 1, outcome: arg('outcome') }); console.log(`probe recorded ${row.day}`); return 0; }
  catch (error) { console.error(error.message); return 2; }
}
if (process.argv[1]?.endsWith('probe.mjs')) process.exit(main());