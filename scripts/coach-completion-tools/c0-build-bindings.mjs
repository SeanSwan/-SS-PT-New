// C0 admission — bind the nine G0 inputs to real source files with real hashes.
// Run from ROOT:  node scripts/coach-completion-tools/c0-build-bindings.mjs
// Writes PKG/evidence/source-bindings.json (+ the long excerpts under evidence/inputs/).
// Every path listed here is hashed as found. A path that cannot be hashed is recorded
// as available:false rather than silently dropped — R5-07's whole point is that
// "present" and "admissible" are different claims.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { assertRoot } from './_root.mjs';

const ROOT = assertRoot();
const PKG = join(ROOT, 'docs/ai-workflow/AI-HANDOFF/BLUEPRINT-swan-coach-universe-v3-s83-completion-2026-09-19');
const EV = join(PKG, 'evidence');
const BASE = '53005a6da965f5ca9e9c8d5ead86c6e19e081095';
const sha256 = (b) => createHash('sha256').update(b).digest('hex');

const probe = (rel) => {
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) return { path: rel, available: false, reason: 'ENOENT' };
  try {
    if (!statSync(abs).isFile()) return { path: rel, available: false, reason: 'not-a-file' };
    const buf = readFileSync(abs);
    return { path: rel, available: true, bytes: buf.length, lines: buf.toString('utf8').split('\n').length - 1, sha256: sha256(buf) };
  } catch (err) {
    return { path: rel, available: false, reason: err.code || String(err.message) };
  }
};

// ── The nine G0 rows, with the content Astra specified must still exist ──────
// classification mirrors PKG/03-contracts.md:9-17 and the forged ledger in
// ASTRA-REPLY-REVIEW-5.md. "present"/"partial" describe SOURCE AVAILABILITY.
// admissionStatus describes whether C0 can be admitted on this row.
const ROWS = [
  {
    id: 'G0-MOUNT',
    surface: 'Coach, Settings and Logger mounts',
    classification: 'present-but-insufficient',
    needsSean: false,
    required: 'Complete Coach, Settings and Logger receipts, including outer routing, selected role, consumer, API literals, ordered overlapping backend mounts and model fields.',
    sources: [
      'frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx',
      'frontend/src/components/DashBoard/UniversalDashboardLayout.shellPieces.tsx',
      'backend/core/routes.mjs',
    ],
    citations: [
      'UniversalDashboardLayout.routes.tsx:109,211,238 — coach route registrations',
      'UniversalDashboardLayout.shellPieces.tsx:96-108 — actual dynamic JSX mount',
      'backend/core/routes.mjs:445 — memory backend mount',
    ],
  },
  {
    id: 'G0-ADOPT',
    surface: 'Created-thread adoption and publication scope',
    classification: 'present',
    needsSean: false,
    required: 'Hash-bound excerpts, transport deadline/operation map, and exact composed-test contract.',
    sources: [
      'frontend/src/hooks/coachPublicationScope.ts',
      'frontend/src/components/DashBoard/Pages/coach-assistant/hooks/useCoachCommandCenterSelection.ts',
    ],
    citations: [
      'coachPublicationScope.ts:1-28 — types',
      'useCoachCommandCenterSelection.ts:73-78,121-129,155-170 — composition',
    ],
  },
  {
    id: 'G0-MEMORY',
    surface: 'Coach memory routes and persistence services',
    classification: 'present',
    needsSean: false,
    required: 'Complete success/error mapping and source-bound model/service contracts. Preserve response-loss and forgotten-version semantics.',
    sources: [
      'backend/routes/coachMemoryRoutes.mjs',
      'frontend/src/services/coachMemoryService.ts',
    ],
    citations: ['coachMemoryRoutes.mjs:124,171,208 — handlers'],
  },
  {
    id: 'G0-CONSENT',
    surface: 'Consent read/write paths and the real User preference attribute',
    classification: 'present',
    needsSean: false,
    required: 'Bind both writer paths and distinguish current surrogate-model tests from required production-model/controller acceptance.',
    sources: [
      'backend/routes/notificationSettingsRoutes.mjs',
      'backend/models/User.mjs',
    ],
    citations: [
      'notificationSettingsRoutes.mjs:40-41 — dedicated routes',
      'User.mjs:359-363 — preference attribute definition',
    ],
  },
  {
    id: 'G0-DB',
    surface: 'Owned test database: provisioning, identity, migration config',
    classification: 'present',
    needsSean: false,
    required: 'Owned cluster provisioning/teardown receipt; actual connection identity from the RUNNER namespace; dedicated no-dotenv migration config. Historical port 55440 is not current ownership; current ownership is 127.0.0.1:55533 (R6-07 lifecycle ruling applied).',
    sources: [
      'backend/tests/helpers/coachTestDatabase.mjs',
      'backend/tests/helpers/coachTestDatabaseLoader.mjs',
      'backend/tests/helpers/coachDatabaseLease.mjs',
      'backend/run-coach-postgres.mjs',
      'docs/ai-workflow/AI-HANDOFF/BLUEPRINT-swan-coach-universe-v3-s83-completion-2026-09-19/evidence/g0-db-receipt-v2.json',
    ],
    citations: [
      'g0-db-receipt-v2.json — identity probed from the runner namespace over loopback 55533; v1 retained as history; R6-07 namespace conflation and universal-cause claims corrected; lifecycle events recorded',
    ],
  },
  {
    id: 'G0-TEST',
    surface: 'Test inventory, runner wiring and compiler environment',
    classification: 'present-but-insufficient',
    needsSean: false,
    required: 'Full package/runner inventory, explicit exclusions, union batches, available typecheck environment, exact browser startup and discovery contracts.',
    sources: [
      'backend/package.json',
      'frontend/package.json',
      'backend/vitest.coach-postgres.config.mjs',
    ],
    citations: [],
  },
  {
    id: 'G0-SCHEMA',
    surface: 'Migration source, repaired objects and supported installed history',
    classification: 'present-but-insufficient',
    needsSean: false,
    required: 'Supported installed-history manifest, complete object repair matrix, interruption fixture, restore assertions, and one reconciled forward-migration decision.',
    sources: [
      'backend/models/Orientation.mjs',
      'backend/tests/unit/migrationFkTypeCompat.test.mjs',
    ],
    citations: [],
  },
  {
    id: 'G0-OWNER',
    surface: 'Worktree ownership, live locks and dirty-source identity',
    classification: 'present-but-insufficient',
    needsSean: false,
    required: 'Complete fresh orientation, exact claimed paths, dirty-source hashes and preservation receipt.',
    sources: ['.gitignore', 'CLAUDE.md'],
    citations: [
      'INCIDENT 2026-09-21: .git/worktrees metadata was pruned by a concurrent session mid-C0; rescue refs pinned (refs/rescue/swan-coach-astra-owned-20260906 -> 53005a6da, whose tree object is corrupt); metadata rebuilt detached and the worktree reattached to intact base 70547685c; git rev-parse --git-path HEAD resolves again',
    ],
  },
  {
    id: 'G0-RELEASE',
    surface: 'Reviewer seat and release-gate disposition',
    classification: 'present-operationally-insufficient',
    needsSean: false,
    required: 'Supported state migration, historical gate disposition, C-to-S coverage mapping, budget accounting and archive references.',
    sources: [],
    citations: [
      'Reviewer decision is present: Astra is the orchestrator (Sean, 2026-09-21).',
      'CLOSED 2026-09-21: v9 migrated from v7 through the SUPPORTED controller (non-vibe-coding skill, policyHash 79aa03e0 generation verified); cadence final-astra; status read-back succeeded; five negative migration tests refused as required',
    ],
  },
];

const bindings = ROWS.map((row) => {
  const probed = row.sources.map(probe);
  const missing = probed.filter((p) => !p.available);
  return {
    id: row.id,
    surface: row.surface,
    classification: row.classification,
    needsSean: row.needsSean,
    required: row.required,
    citations: row.citations,
    sources: probed,
    sourceCount: probed.length,
    availableSources: probed.length - missing.length,
    missingSources: missing,
    // A row is source-bound when at least one named file hashes successfully.
    // That is deliberately weaker than "admissible" — see admission.json.
    sourceBound: probed.length > 0 && missing.length < probed.length,
  };
});

const doc = {
  generatedAt: new Date().toISOString(),
  purpose: 'C0 source bindings for the nine G0 operator inputs (PKG/03-contracts.md:9-17).',
  baseHead: BASE,
  rowCount: bindings.length,
  countCheck: {
    assertedBySlicesDoc: 10,
    actualEnumerated: bindings.length,
    note: 'PKG/05-slices.md#C0 says "all ten G0 rows"; 03-contracts.md:9-17 enumerates nine. Astra R5-12 carried this forward; nine is correct.',
    resolved: bindings.length === 9,
  },
  // R5-07: three distinct claims, never merged.
  distinctions: {
    availableSource: 'A file named below exists and hashes. Harvestable now.',
    missingPreparationArtifact: 'A C0 evidence artifact C0 must itself produce before admission.',
    futureImplementationDeliverable: 'A file a later slice (C1-C4) is expected to CREATE. Its absence does not block C0.',
  },
  rows: bindings,
};

mkdirSync(EV, { recursive: true });
writeFileSync(join(EV, 'source-bindings.json'), `${JSON.stringify(doc, null, 2)}\n`);
for (const b of bindings) {
  const lines = [`# ${b.id} — ${b.surface}`, '', `Classification: **${b.classification}**  |  Needs Sean: ${b.needsSean ? 'yes' : 'no'}`, '', '## What must still exist before the uninterrupted window', '', b.required, ''];
  if (b.citations.length) lines.push('## Cited positions', '', ...b.citations.map((c) => `- ${c}`), '');
  lines.push('## Bound sources', '', '| Path | Available | Lines | Bytes | sha256 |', '|---|---|---|---|---|');
  for (const s of b.sources) lines.push(`| \`${s.path}\` | ${s.available ? 'yes' : `no (${s.reason})`} | ${s.lines ?? '-'} | ${s.bytes ?? '-'} | ${s.sha256 ? `\`${s.sha256.slice(0, 16)}…\`` : '-'} |`);
  lines.push('');
  writeFileSync(join(EV, 'inputs', `${b.id}.md`), `${lines.join('\n')}`);
}

const summary = bindings.map((b) => `${b.id.padEnd(12)} ${b.classification.padEnd(32)} ${b.availableSources}/${b.sourceCount} sources`);
console.log(summary.join('\n'));
console.log(`\nrows=${bindings.length} nineOk=${bindings.length === 9}`);
