/**
 * taste-profile-snapshot.mjs — read-only bridge: Swan Taste Brain → design brain
 *
 * Fetches GET /api/profile from the loopback-only Taste Brain server and writes
 * a dated, gitignored snapshot the design brain can grep when the server is
 * down (`.ai-workflow/taste-profile.local.md`). Router law (swan-design-router
 * Step 3.5): agents read IDs/codes/tallies, NEVER images, and never write
 * taste; a response that does not match the profile shape is treated as
 * OFFLINE; tiers are copied verbatim, never fabricated. This file is
 * local-only (.ai-workflow/* is gitignored) — it must never be committed,
 * and profile JSON must never be pasted into committed files.
 *
 * Usage: node scripts/taste-profile-snapshot.mjs
 * Env:   SWAN_TASTE_API (default http://127.0.0.1:7331) — loopback only.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outPath = path.join(root, '.ai-workflow', 'taste-profile.local.md');
const base = process.env.SWAN_TASTE_API || 'http://127.0.0.1:7331';

if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(base)) {
  console.error(`[taste-snapshot] refused: non-loopback SWAN_TASTE_API (${base})`);
  process.exit(1);
}

const stamp = new Date().toISOString();

function writeOffline(reason) {
  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, [
    '# Taste profile snapshot — [TASTE BRAIN OFFLINE]',
    '',
    `- as-of: ${stamp}`,
    `- reason: ${reason}`,
    '',
    'No snapshot available. Step 3.5 law: proceed from doc priors; never fabricate a tier.',
    '',
  ].join('\n'));
  console.log(`[taste-snapshot] OFFLINE (${reason}) → ${outPath}`);
}

let profile;
try {
  const res = await fetch(`${base}/api/profile`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) { writeOffline(`HTTP ${res.status}`); process.exit(0); }
  profile = await res.json();
} catch (err) {
  writeOffline(err?.cause?.code || err?.name || 'fetch failed');
  process.exit(0);
}

// Shape validation per Step 3.5: anything else bound to the port is NOT the Taste Brain.
const shapeOk = profile && typeof profile === 'object'
  && Number.isFinite(profile.grids)
  && Number.isFinite(profile.judgements)
  && Array.isArray(profile.directions);
if (!shapeOk) { writeOffline('response does not match profile shape (grids/judgements/directions)'); process.exit(0); }

const lines = [
  '# Taste profile snapshot (local-only — NEVER commit or paste into committed files)',
  '',
  `- as-of: ${stamp}`,
  `- source: ${base}/api/profile`,
  `- fingerprint: grids=${profile.grids} judgements=${profile.judgements}`,
  '',
  '## Directions (tier is truth — copied verbatim)',
  '',
];
for (const d of profile.directions) {
  const tier = typeof d?.tier === 'string' ? d.tier.toUpperCase() : 'UNTIERED';
  const name = d?.name ?? d?.id ?? 'unnamed';
  const codes = Array.isArray(d?.codes) ? d.codes.join(', ') : '';
  lines.push(`- [${tier}] ${name}${codes ? ` — codes: ${codes}` : ''}`);
}
if (profile.directions.length === 0) lines.push('- (none — cold start; tier `absent` applies)');
if (Array.isArray(profile.proposedAvoids) && profile.proposedAvoids.length) {
  lines.push('', '## Proposed avoids (proposals only — Sean copies them himself)', '');
  for (const a of profile.proposedAvoids) lines.push(`- ${typeof a === 'string' ? a : JSON.stringify(a)}`);
}
if (profile.reasons && typeof profile.reasons === 'object') {
  lines.push('', '## Reason tallies (local-only; never carry counts into committed files)', '');
  for (const [k, v] of Object.entries(profile.reasons)) lines.push(`- ${k}: ${JSON.stringify(v)}`);
}
lines.push('');

mkdirSync(path.dirname(outPath), { recursive: true });
writeFileSync(outPath, lines.join('\n'));
console.log(`[taste-snapshot] OK grids=${profile.grids} judgements=${profile.judgements} directions=${profile.directions.length} → ${outPath}`);
