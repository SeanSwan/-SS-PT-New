// Strangler backlog generator v2 — R4 findings JOINED with import-graph reachability.
// Usage (repo root): node gen-backlog-v2.mjs <r4.txt> <reach.txt>  → markdown body on stdout
import { readFileSync } from 'node:fs';
const [r4File, reachFile] = process.argv.slice(2);
const rows = readFileSync(r4File, 'utf8').trim().split('\n').filter(Boolean).map((l) => {
  const m = l.match(/^\[R4\] (.+?):(\d+) legacy (\w+) import/); return m && { path: m[1].replace(/\\/g, '/'), line: +m[2], legacy: m[3] };
}).filter(Boolean);
const reach = new Map();
for (const l of readFileSync(reachFile, 'utf8').split('\n')) { const m = l.match(/^(REACHABLE|UNREACHABLE)\t(\S+)/); if (m) reach.set('frontend/src/' + m[2], m[1] === 'REACHABLE'); }
const tier = (p, reachable) => {
  if (!reachable) return 'T0-dormant — UNREACHABLE from the app entry (Rule 77 Tier-2 quarantine candidates; do NOT migrate, propose archive)';
  if (/test|fixture|_unused|\/assets\/|dashboard-export/i.test(p)) return 'T0-fixtures — retire with parent, do not migrate';
  if (/DesignPlayground/i.test(p)) return 'T0-playground — preview surface, migrate last';
  if (/checkout|payment|stripe|\/shop\/|store|cart/i.test(p)) return 'T4 money path — LAST, each with its own receipt + rollback';
  if (/admin/i.test(p)) return 'T3 admin surfaces';
  if (/trainer|client|dashboard|UniversalMasterSchedule|styles\/swan-theme-utils/i.test(p)) return 'T2 authenticated / shared-util surfaces';
  return 'T1 public / marketing — FIRST (same risk class as the Phase 1.5 proof)';
};
const replacement = { GlowButton: 'ForgeButton binding', GlacialInput: 'Field core + `.sw-input`', VaultDrawer: 'Modal `--drawer` variant' };
const by = {};
for (const r of rows) { const reachable = reach.get(r.path) ?? null; (by[tier(r.path, reachable !== false)] ??= []).push({ ...r, reachable }); }
let out = '';
for (const t of Object.keys(by).sort()) {
  const list = by[t].sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line);
  out += `\n## ${t} — ${list.length} import site(s)\n\n| # | file | line | legacy | reachable | Forge replacement |\n|---|---|---|---|---|---|\n`;
  list.forEach((r, i) => { out += `| ${i + 1} | \`${r.path}\` | ${r.line} | ${r.legacy} | ${r.reachable === null ? 'n/a' : r.reachable ? 'yes' : 'NO'} | ${replacement[r.legacy] ?? '?'} |\n`; });
}
process.stdout.write(out);
console.error('tiers: ' + Object.keys(by).sort().map((k) => `${k.slice(0, 12)}=${by[k].length}`).join(' | '));
