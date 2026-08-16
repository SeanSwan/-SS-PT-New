import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { pathToFileURL } from 'node:url';
import {
  EXPECTED_WORLD_FAMILIES,
  auditWorldEngineBundle,
  verifyRouletteImplementation,
  verifyWorldEngine,
} from '../ai-workflow/verify-world-engine.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');

const WORLD_ENGINE_RELEASE_FILES = Object.freeze([
  '.claude/skills/swan-design-router/SKILL.md',
  '.claude/skills/swan-world-factory/SKILL.md',
  'docs/ai-workflow/AI-HANDOFF/SWAN-WORLD-ENGINE-BUILD-HANDOFF-2026-07-12.md',
  'docs/ai-workflow/design-brain/adapters/knowledge.md',
  'docs/ai-workflow/design-brain/adapters/reviewers.md',
  'docs/ai-workflow/design-brain/cinematic-pages.md',
  // design.html removed 2026-08-16 — the mirror was retired to docs/_attic/, so copying it into
  // the release scope raised ENOENT. Found only because a verification grep returned 1 where the
  // label predicted 0: the source assertions were fixed and THIS list was missed, one file over.
  'docs/ai-workflow/design-brain/design.md',
  'docs/ai-workflow/design-brain/experience-mode.md',
  'docs/ai-workflow/design-brain/external-reference-mcp.md',
  'docs/ai-workflow/design-brain/index.md',
  'docs/ai-workflow/design-brain/motion.md',
  'docs/ai-workflow/design-brain/psychology.md',
  'docs/ai-workflow/design-brain/techniques.md',
  'docs/ai-workflow/design-brain/website-archetypes.md',
  'docs/ai-workflow/design-brain/worlds.md',
  'docs/ai-workflow/references/SWAN-ASSET-STORYBOARDING.md',
  'docs/ai-workflow/references/SWAN-CINEMATIC-DESIGN-SYSTEM.md',
  'docs/ai-workflow/references/SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md',
  'scripts/__tests__/world-roulette.test.mjs',
  'scripts/ai-workflow/verify-world-roulette.mjs',
  'scripts/ai-workflow/world-roulette.mjs',
]);

describe('World Engine doctrine contract', () => {
  it('verifies the checked-out engine bundle end to end', async () => {
    const report = await verifyWorldEngine({ root: ROOT });

    assert.equal(report.ok, true, report.errors.join('\n'));
    assert.equal(report.metrics.worlds, 18);
    assert.equal(report.metrics.worldFamilies, 5);
    assert.equal(report.metrics.techniques, 13);
    assert.equal(report.metrics.psychologyPrinciples, 10);
    assert.deepEqual([...report.metrics.familyIds].sort(), [...EXPECTED_WORLD_FAMILIES].sort());
  });

  it('verifies from World Engine release files without Hermes operational dependencies', async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'world-engine-release-scope-'));

    try {
      for (const relativePath of WORLD_ENGINE_RELEASE_FILES) {
        const destination = path.join(tempRoot, relativePath);
        await fs.mkdir(path.dirname(destination), { recursive: true });
        await fs.copyFile(path.join(ROOT, relativePath), destination);
      }

      const report = await verifyWorldEngine({ root: tempRoot });
      assert.equal(report.ok, true, report.errors.join('\n'));
    } finally {
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('fails closed when a catalog is incomplete or the product firewall disappears', () => {
    const report = auditWorldEngineBundle({
      worlds: '# Catalog\nWORLD-01\nFAMILY-NATURAL\n',
      techniques: 'WFX-01\n',
      psychology: 'PSY-01\n',
      experience: 'marketing only',
      router: 'world roulette',
      factory: 'manual-only',
      registry: 'swan-world-factory',
      archetypes: '#21 Experience / World Showcase',
      sourceSystem: 'Licensed M4 delegation',
      sourceAssets: 'Licensed M4 exception',
      knowledge: 'WORLD-01',
    });

    assert.equal(report.ok, false);
    assert.match(report.errors.join('\n'), /18 unique world IDs/);
    assert.match(report.errors.join('\n'), /LIVE M4 NEVER/);
    assert.match(report.errors.join('\n'), /B0/);
  });

  it('rejects visual technique IDs that collide with Hermes effect tiers on repeated audits', () => {
    const bundle = {
      worlds: Array.from({ length: 18 }, (_, index) => `WORLD-${String(index + 1).padStart(2, '0')}`).join('\n') +
        '\n' + EXPECTED_WORLD_FAMILIES.map((id) => `FAMILY-${id.toUpperCase()}`).join('\n'),
      techniques: Array.from({ length: 13 }, (_, index) => `WFX-${String(index + 1).padStart(2, '0')}`).join('\n') +
        '\n### T7 Shader Surface',
      psychology: Array.from({ length: 10 }, (_, index) => `PSY-${String(index + 1).padStart(2, '0')}`).join('\n'),
      experience: 'LIVE M4 NEVER B0 B1 B2 B3 Full Lean Still Reduced Motion Pause Effects Law A Law B',
      router: 'world roulette suitability-filtered selection seed M4 refusal Law B B0',
      factory: 'manual-only git check-ignore three hostile repair passes browser',
      registry: 'swan-world-factory T1 T2 KEEP MANUAL ONLY',
      archetypes: '#21 Experience / World Showcase LIVE M4 NEVER',
      sourceSystem: 'Licensed M4 delegation M0-M3 product',
      sourceAssets: 'Licensed M4 exception product Hermes',
      knowledge: 'World DNA WORLD-01 WFX-01 PSY-01',
    };

    for (const report of [auditWorldEngineBundle(bundle), auditWorldEngineBundle(bundle)]) {
      assert.equal(report.ok, false);
      assert.match(report.errors.join('\n'), /visual T1-T13 collision/);
    }
  });

  it('rejects a keyword-complete catalog with no per-entry contracts', () => {
    const worlds = Array.from({ length: 18 }, (_, index) =>
      `world.${EXPECTED_WORLD_FAMILIES[index % EXPECTED_WORLD_FAMILIES.length]}.entry-${String(index + 1).padStart(2, '0')}`,
    ).join('\n') + '\nGlacier Cathedral Gold exemplar Neon Meridian Gold exemplar Anti-cheese Catalog version suitability-filtered seed';
    const report = auditWorldEngineBundle({
      worlds,
      techniques: Array.from({ length: 13 }, (_, index) => `## WFX-${String(index + 1).padStart(2, '0')} B0 B1 B2 B3 Full Lean Still DEPENDENCY-GATED device loss`).join('\n'),
      psychology: Array.from({ length: 10 }, (_, index) => `### PSY-${String(index + 1).padStart(2, '0')} [HYPOTHESIS] counter-metric falsifier ethical`).join('\n'),
      experience: 'LIVE M4 NEVER product Hermes B0 B1 B2 B3 Full Lean Still Reduced Motion Pause Effects Law A Law B promotes the whole host',
      router: 'suitability-filtered seed Law B Swan M4 product B0',
      factory: 'manual-only git check-ignore Three hostile repair passes Browser verification',
      registry: 'swan-world-factory T1 T2 KEEP MANUAL ONLY',
      archetypes: '21. Experience / World Showcase live M4',
      sourceSystem: 'Licensed M4 delegation product',
      sourceAssets: 'Licensed M4 exception product',
      knowledge: 'WorldRecipe quarantine No direct wiki writes',
    });

    assert.equal(report.ok, false);
    assert.match(report.errors.join('\n'), /per-entry world schema/i);
  });

  it('rejects factory and reviewer doctrine without artifact-bound review expiry', () => {
    const report = auditWorldEngineBundle({
      factory: 'manual-only git check-ignore Three hostile repair passes Browser verification independent review',
      reviewers: 'M4 license and failure safety automatic REVISE independent review',
    });

    assert.equal(report.ok, false);
    assert.match(
      report.errors.join('\n'),
      /reviewedArtifact.*material change.*invalidat/i,
    );
    assert.match(
      report.errors.join('\n'),
      /reviewer adapter.*reviewedArtifact/i,
    );
  });

  it('rejects post-hoc identity and unbound browser-proof doctrine', async () => {
    const [factory, reviewers] = await Promise.all([
      fs.readFile(path.join(ROOT, '.claude/skills/swan-world-factory/SKILL.md'), 'utf8'),
      fs.readFile(path.join(ROOT, 'docs/ai-workflow/design-brain/adapters/reviewers.md'), 'utf8'),
    ]);
    const mutations = [
      ['factory', 'predeclared `reviewPolicy`'],
      ['factory', '`workerAssignments`'],
      ['factory', 'swan-world-factory.review-policy.v2'],
      ['factory', '`browserQaWorker`'],
      ['factory', 'minimum cycle'],
      ['factory', 'same QA worker'],
      ['factory', 'hashed'],
      ['factory', '`reviewedBrowserEvidence`'],
      ['factory', 'raw LCP'],
      ['factory', 'runner-owned ephemeral loopback'],
      ['factory', 'gallery-only'],
      ['reviewers', '**M4 identity policy**'],
      ['reviewers', '`reviewedBrowserEvidence`'],
      ['reviewers', 'swan-world-factory.review-policy.v2'],
      ['reviewers', '`browserQaWorker`'],
      ['reviewers', 'same predeclared QA worker'],
      ['reviewers', 'Runner-owned loopback'],
      ['reviewers', 'raw LCP'],
      ['reviewers', 'hashed/decoded'],
      ['reviewers', 'gallery-only'],
    ];
    for (const [field, phrase] of mutations) {
      const report = auditWorldEngineBundle({
        factory: field === 'factory' ? factory.replaceAll(phrase, 'removed') : factory,
        reviewers: field === 'reviewers' ? reviewers.replaceAll(phrase, 'removed') : reviewers,
      });
      assert.match(report.errors.join('\n'), /evidence-bound independent review sequence/i, `${field}: ${phrase}`);
    }
  });

  it('fails closed when the canonical frame-measurement law is missing or substituted', async () => {
    const [experience, techniques] = await Promise.all([
      fs.readFile(path.join(ROOT, 'docs/ai-workflow/design-brain/experience-mode.md'), 'utf8'),
      fs.readFile(path.join(ROOT, 'docs/ai-workflow/design-brain/techniques.md'), 'utf8'),
    ]);
    const mutations = [
      ['authored-work target removed', /Full authored render\/main-thread work budget is \u226416\.7ms/gi, ''],
      ['rAF/work separation', /rAF callback-to-callback p95 is presentation cadence, not authored work/gi, 'rAF callback-to-callback p95 is presentation cadence, not authored work; rAF callback-to-callback p95 <=16.7ms passes Full'],
      ['refresh quantum', /Still-mode 120-frame cadence median identifies the refresh quantum/gi, 'generic idle benchmark'],
      ['refresh eligibility', /60Hz-or-faster/gi, 'any refresh rate'],
      ['missed presentation', /missed presentation is any interval \u22651\.5x the refresh quantum/gi, 'missed presentation uses a fixed 18ms threshold'],
      ['Full hysteresis', /three consecutive 120-frame Full windows with active deadline\/cap breaches/gi, 'three consecutive two-second windows'],
      ['authored-work evidence', /Chrome Performance task\/style\/layout\/script deltas plus Long Animation Frame and Long Task evidence/gi, 'rAF intervals only'],
      ['B1 aggregate gate', /B1 qualification requires zero missed presentations, no LoAF\/long task, and aggregate Chrome work-proxy ms\/presentation under 16\.7ms/gi, 'rAF p95 under 16.7ms qualifies B1'],
      ['aggregate-p95 contradiction', /must never be labeled p95/gi, 'must never be labeled p95; instead report aggregate Chrome work-proxy as p95'],
      ['trace gate', /A saved DevTools\/renderer trace is required to claim p95 and for B2\/B3 production promotion/gi, 'B1 aggregate evidence promotes every renderer and claims p95'],
      ['tolerance contradiction', /no fixed millisecond tolerance/gi, 'no fixed millisecond tolerance except a fixed 2ms tolerance'],
      ['baseline-subtraction contradiction', /no baseline subtraction/gi, 'no baseline subtraction except baseline-subtracted rAF may qualify Full'],
      ['raw receipt', /raw measurement receipt/gi, 'normalized summary receipt'],
      ['production RUM contradiction', /raw unnormalized production RUM/gi, 'raw unnormalized production RUM reported as baseline-normalized production RUM'],
    ];

    for (const [label, pattern, replacement] of mutations) {
      const report = auditWorldEngineBundle({
        experience: experience.replace(pattern, replacement),
        techniques: techniques.replace(pattern, replacement),
      });
      assert.match(report.errors.join('\n'), /canonical frame-measurement law/i, label);
    }
  });

  it('behaviorally rejects a selector that merely stamps the v1 name', async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'world-roulette-substitute-'));
    const moduleDir = path.join(tempRoot, 'scripts', 'ai-workflow');
    await fs.mkdir(moduleDir, { recursive: true });
    await fs.writeFile(path.join(moduleDir, 'world-roulette.mjs'), `
      export const ALGORITHM_ID = 'world-roulette.v1';
      export const ELIGIBILITY_RULES_VERSION = 'world-eligibility.2026-07-12.v1';
      export const drawDigestHex = () => '4d59510226f47a6dd4acd7c1d109376405d68a0c2ee8c4988301b07b897e52ff';
      export const selectWorlds = ({ candidates, count }) => ({
        selectedIds: candidates.slice(0, count).map(candidate => candidate.id),
        receipt: { algorithmId: ALGORITHM_ID, selectedFamilies: [], selectedIds: [], draws: [] }
      });
    `, 'utf8');

    try {
      const errors = await verifyRouletteImplementation({ root: tempRoot });
      assert.ok(errors.length > 0);
      assert.match(errors.join('\n'), /behavior|replay|cycle|receipt/i);
    } finally {
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('behaviorally rejects a selector that skips generated seeds and coerces eligibility', async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'world-roulette-boundary-substitute-'));
    const moduleDir = path.join(tempRoot, 'scripts', 'ai-workflow');
    const realSelectorUrl = pathToFileURL(path.join(ROOT, 'scripts', 'ai-workflow', 'world-roulette.mjs')).href;
    await fs.mkdir(moduleDir, { recursive: true });
    await fs.writeFile(path.join(moduleDir, 'world-roulette.mjs'), `
      import * as real from ${JSON.stringify(realSelectorUrl)};
      export const ALGORITHM_ID = real.ALGORITHM_ID;
      export const ELIGIBILITY_RULES_VERSION = real.ELIGIBILITY_RULES_VERSION;
      export const drawDigestHex = real.drawDigestHex;
      export function selectWorlds(args) {
        if (args.seed === undefined) throw new Error('seed required by substitute');
        const candidates = args.candidates.map((candidate) => {
          const normalized = { ...candidate, eligible: candidate.eligible === false ? false : true };
          if (normalized.id === '-bad') normalized.id = 'coerced.id';
          if (normalized.family === '-bad' || normalized.family === 'bad.family') normalized.family = 'cinematic-reality';
          if (normalized.eligible) delete normalized.rejectionCode;
          if (!normalized.eligible && (typeof normalized.rejectionCode !== 'string' || !/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(normalized.rejectionCode))) {
            normalized.rejectionCode = 'coerced.code';
          }
          return normalized;
        });
        const recentUse = Array.isArray(args.recentUse)
          ? [...new Set(args.recentUse.filter((id) => typeof id === 'string' && /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(id)))]
          : [];
        return real.selectWorlds({ ...args, candidates, recentUse });
      }
    `, 'utf8');

    try {
      const errors = await verifyRouletteImplementation({ root: tempRoot });
      assert.match(errors.join('\n'), /generated 128-bit seed/i);
      assert.match(errors.join('\n'), /malformed eligibility/i);
      assert.match(errors.join('\n'), /stable ID or recent-use grammar/i);
    } finally {
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('rejects cadence-as-authored-work substitutions in the builder handoff', () => {
    const report = auditWorldEngineBundle({
      handoff: 'Full: p95 canonical-animation frame <=16.7ms after warm-up.',
    });

    assert.match(report.errors.join('\n'), /handoff.*forbidden.*frame-measurement/i);
  });
});
