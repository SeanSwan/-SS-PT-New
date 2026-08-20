// NOTE: no shebang — see render-agent.mjs for why (esbuild + CRLF).
/**
 * preflight-generate — which layer is missing, before you spend GPU time finding out.
 * ============================================================================
 *
 * Generation spans layers that fail differently and cannot see each other:
 *
 *   1. Render env     — provider enabled AND licence-granted?   (server-side, not visible here)
 *   2. agent          — running, holding a credential, advertising `generate`?
 *   3. ComfyUI        — up on this machine, with the weights?
 *   4. graph bindings — which node takes the prompt, the duration, the seed?
 *
 * Layers 2-4 are local and checked here, so a failure names its own cause instead of
 * surfacing as a job that queues, leases, and dies on a machine nobody is watching.
 *
 *   node backend/scripts/preflight-generate.mjs [--provider comfyui/minimax-h3]
 *
 * IT DELEGATES TO THE PROVIDER'S OWN `verify()` rather than re-deriving the checks. The
 * first version of this script called `resolveConfig` and reported "all bindings resolved"
 * for a COMPLETELY EMPTY env, because that function returns empty strings rather than
 * throwing — the module's fail-closed gate lives in `generate()` via `cfg.configured`.
 * A preflight that green-lights an unconfigured machine is worse than no preflight: it
 * converts a clear "not configured" error into a mystery.
 */

import { existsSync } from 'node:fs';
import { verify } from '../../shared/providers/video/comfyuiLocal.mjs';

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(`--${n}`); return i === -1 ? d : args[i + 1]; };
const PROVIDER = flag('provider', 'comfyui/minimax-h3');

const rows = [];

// Agent credential — not part of the provider contract, so checked here.
const tokenFile = new URL('../.swan-agent.env', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const hasToken = Boolean(process.env.SWAN_AGENT_TOKEN) || existsSync(tokenFile);
rows.push({
  name: 'agent credential',
  ok: hasToken,
  detail: hasToken ? 'present' : 'no token in env or .swan-agent.env',
  fix: 'run backend/scripts/start-render-agent.ps1 once to save it',
});

// Everything else is the provider's own contract. Whatever verify() reports IS the truth
// the handler will act on at render time.
let report;
try {
  report = await verify(process.env, { providerId: PROVIDER });
  for (const c of report.checks || []) {
    rows.push({ name: c.name, ok: Boolean(c.ok), detail: c.detail || '', fix: c.fix || null });
  }
} catch (err) {
  rows.push({ name: 'provider verify()', ok: false, detail: err.message, fix: null });
}

const pad = (s, n) => String(s).padEnd(n);
process.stdout.write(`\n  Generation preflight — ${PROVIDER}\n  ${'─'.repeat(70)}\n`);
for (const r of rows) {
  process.stdout.write(`  ${r.ok ? 'OK  ' : 'MISS'}  ${pad(r.name, 24)} ${r.detail}\n`);
  if (!r.ok && r.fix) process.stdout.write(`        ${' '.repeat(24)} fix: ${r.fix}\n`);
}

const blocked = rows.filter((r) => !r.ok);
process.stdout.write(`  ${'─'.repeat(70)}\n`);
if (blocked.length === 0) {
  process.stdout.write('  Every LOCAL layer is ready.\n'
    + '  NOT checked from here: whether Render has the provider enabled and licence-granted.\n'
    + '  If a job still refuses after this passes, that server-side env is the layer to check.\n\n');
  process.exit(0);
}
process.stdout.write(`  ${blocked.length} layer(s) not ready — a generation job would fail on this machine.\n\n`);
process.exit(1);
