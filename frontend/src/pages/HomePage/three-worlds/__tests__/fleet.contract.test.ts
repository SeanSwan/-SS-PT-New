/**
 * RED contract suite — Swan Brain Console v3 + 20-variant Three.js fleet.
 * @module pages/HomePage/three-worlds/__tests__/fleet.contract.test
 *
 * Authored BEFORE implementation (Mega Blueprints S1). Every assertion here is
 * intended to FAIL until the corresponding slice lands. A module-not-found or
 * import error is NOT accepted as RED proof — the suite must fail on its own
 * assertions. Requirements traced: R1,R2,R3,R4,R5,R8,R10 (blueprint §6, §7).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

/** Path anchors, counted explicitly: __tests__ -> three-worlds -> HomePage -> pages -> src -> frontend. */
const WORLDS = resolve(__dirname, '..');
const FRONTEND = resolve(__dirname, '../../../../..');
const REPO = resolve(FRONTEND, '..');
const ROUTES = join(FRONTEND, 'src/routes/main-routes.tsx');

const EXPECTED_VARIANTS = 20;

function read(p: string): string {
  return readFileSync(p, 'utf8');
}

/** R1/T3 — the fleet is exactly 20 and every entry is parked. */
describe('T3 fleet registry', () => {
  it('exposes exactly 20 parked variants', async () => {
    const mod = await import('../registry');
    const entries = mod.THREE_WORLDS;
    expect(Array.isArray(entries)).toBe(true);
    expect(entries).toHaveLength(EXPECTED_VARIANTS);
    for (const e of entries) {
      expect(e.status).toBe('parked');
      expect(typeof e.id).toBe('string');
      expect(e.id).toMatch(/^v\d{2}$/);
    }
  });

  it('gives every variant a non-empty tradeoff (R10)', async () => {
    const mod = await import('../registry');
    for (const e of mod.THREE_WORLDS) {
      expect(typeof e.tradeoff).toBe('string');
      expect(e.tradeoff.trim().length).toBeGreaterThan(12);
    }
  });
});

/** R3/T4 — every variant genuinely renders through three.js. */
describe('T4 real three usage', () => {
  it('resolves every variant to a scene family that builds real geometry', async () => {
    const { THREE_WORLDS } = await import('../registry');
    const { assertVariantHasGeometry } = await import('../scenes/looks');
    const problems: string[] = [];
    for (const e of THREE_WORLDS) {
      try {
        assertVariantHasGeometry(e.skeleton.hero_mechanics);
      } catch (err) {
        problems.push(`${e.id}: ${(err as Error).message}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('ships a real component file per variant that mounts the shared world', async () => {
    const { THREE_WORLDS } = await import('../registry');
    const problems: string[] = [];
    for (const e of THREE_WORLDS) {
      const file = join(WORLDS, e.id, `${e.componentFile}`);
      if (!existsSync(file)) { problems.push(`${e.id}: missing ${e.componentFile}`); continue; }
      const src = read(file);
      if (!/from\s+['"]three['"]/.test(src)) problems.push(`${e.id}: no three import`);
      if (!/WorldPage/.test(src)) problems.push(`${e.id}: does not mount WorldPage`);
      if (!/SKELETON/.test(src)) problems.push(`${e.id}: does not bind its skeleton`);
    }
    expect(problems).toEqual([]);
  });

  it('gives every variant a distinct scene family signature', async () => {
    const { THREE_WORLDS } = await import('../registry');
    const { familySignature } = await import('../scenes/looks');
    const sigs = THREE_WORLDS.map((e: { skeleton: { hero_mechanics: string } }) =>
      familySignature(e.skeleton.hero_mechanics as never));
    // 8 families across 20 variants: at most 3 variants may share a family.
    const counts = new Map<string, number>();
    for (const s of sigs) counts.set(s, (counts.get(s) ?? 0) + 1);
    const overused = [...counts.entries()].filter(([, n]) => n > 3);
    expect(overused).toEqual([]);
    expect(new Set(sigs).size).toBeGreaterThanOrEqual(6);
  });
});

/** R2/T5 — structural divergence, not restyling. */
describe('T5 skeleton divergence', () => {
  it('carries a complete skeleton contract for all 20', async () => {
    const mod = await import('../registry');
    for (const e of mod.THREE_WORLDS) {
      const s = e.skeleton;
      expect(s.nav_model).toBeTruthy();
      expect(s.hero_mechanics).toBeTruthy();
      expect(s.grid).toBeTruthy();
      expect(Array.isArray(s.anti_specs)).toBe(true);
      expect(s.anti_specs.length).toBeGreaterThanOrEqual(2);
    }
  });

  /**
   * HONESTLY LABELLED: this checks CONFIG-TUPLE UNIQUENESS, not visual divergence.
   *
   * It was previously described as proving the 20 variants are structurally distinct.
   * All three round-3 reviewers rejected that: `hero_mechanics` is a unique value per
   * variant by the type system, so the tuple cannot collide unless a mechanic name is
   * literally reused — the test can only fail on copy-paste in the author's own table.
   *
   * An unfalsifiable check inside a suite whose totals get quoted as evidence corrupts
   * every number it inflates, so the claim is narrowed to what it can actually detect.
   * Real divergence evidence is the browser layer: 20 unique screenshot digests, and
   * the per-variant geometry/overlap assertions in gallery-verify.mjs.
   */
  it('has no duplicate nav_model + hero_mechanics + grid tuple (config uniqueness only)', async () => {
    const mod = await import('../registry');
    const seen = new Map<string, string>();
    const collisions: string[] = [];
    for (const e of mod.THREE_WORLDS) {
      const k = `${e.skeleton.nav_model}|${e.skeleton.hero_mechanics}|${e.skeleton.grid}`;
      if (seen.has(k)) collisions.push(`${seen.get(k)} == ${e.id} (${k})`);
      seen.set(k, e.id);
    }
    expect(collisions).toEqual([]);
  });

  it('carries exactly one alien wildcard', async () => {
    const mod = await import('../registry');
    const wild = mod.THREE_WORLDS.filter((e: { skeleton: { wildcard?: string } }) => Boolean(e.skeleton.wildcard));
    expect(wild).toHaveLength(1);
  });
});

/** R5/T7 — copy must not read as generated filler. */
describe('T7 anti-slop copy gate', () => {
  it('contains zero banned phrases across the copy pack', async () => {
    const mod = await import('../copy/pack');
    const flat = JSON.stringify(mod.COPY_PACK).toLowerCase();
    const { findSlop } = await import('../copy/antiSlop');
    expect(findSlop(flat)).toEqual([]);
  });

  /**
   * THE ROUND-4 VOCABULARY EXTENSIONS. Three classes passed the round-3 gate that
   * should not have, and each was named by a reviewer:
   *   - stem inflections: "empower"/"empowering" were banned but "empowers" passed,
   *     because the word-boundary regex stops at the 's'.
   *   - unhyphenated variants: "game-changing" was banned but "game changing" passed.
   *   - house vocabulary: "NASM-certified" is banned BY HOUSE RULE (the credentials
   *     rule: 26+ years / NASM-protocol, never "NASM-certified") — and the pack's own
   *     shared sub said exactly that until this gate caught it.
   */
  it('catches stem inflections of banned slop verbs', async () => {
    const { findSlop } = await import('../copy/antiSlop');
    const hits = findSlop('This program empowers you. We unlocks potential. Stop delving into excuses.');
    expect(hits.length).toBeGreaterThanOrEqual(3);
    expect(hits.every((h) => h.startsWith('ai-connective-tissue'))).toBe(true);
  });

  it('catches unhyphenated variants of hyphenated intensifiers', async () => {
    const { findSlop } = await import('../copy/antiSlop');
    expect(findSlop('A world class gym with cutting edge equipment.').length).toBeGreaterThanOrEqual(2);
  });

  it('bans the credentials-claim vocabulary by house rule', async () => {
    const { findSlop } = await import('../copy/antiSlop');
    const hits = findSlop('Get NASM-certified coaching today. NASM certified trainers await.');
    expect(hits.length).toBe(2);
    expect(hits.every((h) => h.startsWith('house-vocabulary'))).toBe(true);
  });

  it('does not let the new classes catch honest protocol references', async () => {
    const { findSlop } = await import('../copy/antiSlop');
    // The NASM OPT model and NASM assessments are named METHODS, not credential
    // claims — exactly what the house voice is supposed to use.
    expect(findSlop('Built on the NASM OPT model and the NASM overhead squat assessment.')).toEqual([]);
  });

  it('writes every headline, sub and CTA label as a finished literal', () => {
    const src = read(join(WORLDS, 'copy', 'pack.ts'));
    // Only the literal-copy blocks are inspected. The stat formatter is EXPECTED to
    // compose from marketingStats — that is the single-source-of-truth rule, not slop.
    const start = src.indexOf('export const SHARED');
    const end = src.indexOf('export const COPY_PACK');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const literalBlocks = src.slice(start, end);
    const interpolations = literalBlocks.match(/\$\{([^}]*)\}/g) ?? [];
    // A finished sentence never needs interpolation. The ONLY permitted exception is
    // splicing a verified figure from marketingStats, which is data, not phrasing.
    const allowed = /^\$\{(YEARS_EXPERIENCE_CLAIM|EXERCISE_LIBRARY_CLAIM|CLIENTS_TRANSFORMED_CLAIM|SATISFACTION_CLAIM|statText\([^)]*\))\}$/;
    const offenders = interpolations.filter((i) => !allowed.test(i));
    expect(offenders).toEqual([]);
  });
});

/** R8/T6 — canonical surfaces must not move. */
describe('T6 canonical isolation', () => {
  it('never lets a route import the parked registry', () => {
    expect(read(ROUTES)).not.toMatch(/playgroundRegistry|three-worlds/);
  });

  it('keeps HomePage.V4 as the mounted homepage', () => {
    expect(read(ROUTES)).toMatch(/HomePage\.V4/);
  });
});

/**
 * Rule 4 — the 300-line cap applies to everything new here.
 *
 * NOTE ON SUITE SPLIT: the engine fail-closed contract (R7/T8) lives in
 * `scripts/swan-brain-console/fleet-contract.test.mjs`, run by `node --test`,
 * because it asserts against a repo-level .mjs module outside this Vite root.
 * It is a GREEN regression guard there. This file covers the build contract.
 */
describe('rule 4 line cap', () => {
  it('keeps every new variant file at or under 300 lines', () => {
    const over: string[] = [];
    const walk = (dir: string) => {
      if (!existsSync(dir)) return;
      for (const name of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, name.name);
        if (name.isDirectory()) { if (name.name !== '__tests__') walk(p); continue; }
        if (!/\.(ts|tsx|mjs)$/.test(name.name)) continue;
        const lines = read(p).split('\n').length;
        if (lines > 300) over.push(`${p}: ${lines}`);
      }
    };
    walk(WORLDS);
    walk(resolve(FRONTEND, 'src/pages/SwanBrainConsole'));
    expect(over).toEqual([]);
  });
});
