/**
 * themeRule4.test.ts
 * ==================
 *
 * The gate for Rule 4 ("no file over 300 lines") inside this lane, authored from
 * the failure artefact:
 *
 *   "UniversalThemeContext.tsx is 1890 lines."
 *
 * That file shipped in that state and every gate in the repo stayed green, because
 * the only Rule 4 check that existed —
 *
 *   scripts/creator-brains/consistency-check.mjs:90
 *     check('no engine file exceeds the Rule 4 cap', maxLine <= 300, ...)
 *
 * — walks `scripts/creator-brains/**\/*.mjs` and nothing else. It is structurally
 * incapable of seeing a frontend file. A cap enforced on one corner of the repo is
 * not a cap; it is a green light for every other corner.
 *
 * Design notes, because a Rule 4 gate is easy to write in a way that lies:
 *
 * - The file list is DERIVED from the filesystem, never hand-written. A hand-written
 *   list is a second copy of the thing being checked and rots exactly like one.
 *   Recursive, so a new subdirectory — `palettes/` was added on 2026-09-18 — cannot
 *   hide from the cap by being new.
 * - The count is the repo's canonical counter, copied from
 *   `scripts/creator-brains/consistency-check.mjs:26-29`, not reinvented. An invented
 *   counter disagrees with the repo's own and manufactures defects (it has, twice).
 * - Exemptions are NAMED, carry a reason, and a stale one FAILS.
 * - The instrument is itself controlled: `lineCount` is asserted against known
 *   inputs, so a counter that drifted from the repo's cannot pass silently.
 *
 * HISTORY — the exemption this gate used to grant is GONE.
 * `themePalettes.ts` was 1,596 lines and this file carried an entry exempting it with
 * the reason "pure data table". HY4 round 2 (MEDIUM #3) called that out correctly:
 * an exemption invented by the person it benefits turns a hard cap into a suggestion,
 * and "it is a data table" is an argument ANY large module can make. The table is now
 * split into eight `palettes/` family modules and `themePalettes.ts` is a ~60-line
 * aggregator, so the cap applies with no carve-outs. The `EXEMPT` map survives as
 * machinery for a sanctioned exemption; it must stay empty, and there is a test below
 * that enforces exactly that.
 *
 * Deliberately NOT enforced: a "near the cap" warning threshold. Rule 4 says 300; a
 * gate that fails a file at 297 because 297 feels close would be enforcing a rule the
 * project does not have, and a gate nobody trusts is worse than no gate. Headroom is
 * reported here instead. Tightest files as of 2026-09-18: `ThemeLensPopover.styles.ts`
 * 297 (3 lines of headroom — HY4 round 2 examined this and agreed it is compliant
 * rather than a latent violation), `UniversalThemeContext.tsx` 292.
 */

import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const LANE = __dirname;

/** Rule 4. */
const CAP = 300;

/**
 * Line count the way a human counts: a trailing newline does not add a line.
 * Copied verbatim from `scripts/creator-brains/consistency-check.mjs:26-29` so this
 * gate and the engine gate cannot disagree about what "a line" is.
 */
const lineCount = (text: string) => {
  const n = text.split('\n').length;
  return text.endsWith('\n') ? n - 1 : n;
};

/**
 * Named exemptions. Currently EMPTY, and that is the point — see the
 * `carries no self-granted exemption` test below. Kept as a typed map so a
 * *sanctioned* exemption has somewhere to live rather than being reinvented as an
 * inline `if` in the assertion.
 */
const EXEMPT: Record<string, string> = {};

/** Walk the lane. Recursive, so a new subdirectory cannot hide from the cap. */
const collectSourceFiles = (dir: string): string[] => {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...collectSourceFiles(full));
    } else if (/\.tsx?$/.test(entry.name)) {
      found.push(full);
    }
  }
  return found;
};

const sourceFiles = collectSourceFiles(LANE).sort();
const relative = (full: string) => full.slice(LANE.length + 1).split('\\').join('/');
const sizes = sourceFiles.map((full) => ({
  name: relative(full),
  lines: lineCount(readFileSync(full, 'utf8')),
}));

describe('Rule 4 — 300-line cap across the ThemeContext lane', () => {
  /**
   * Control on the instrument. If someone swaps this counter for a different one
   * (e.g. `split('\n').length`, which reports 1 more for any newline-terminated
   * file), this fails before it can mis-report a real file.
   */
  it('counts lines the way the repo counts them', () => {
    expect(lineCount('a\nb\n')).toBe(2);
    expect(lineCount('a\nb')).toBe(2);
    expect(lineCount('a\n')).toBe(1);
    // Pinned deliberately: the canonical counter reports 1 for an empty string
    // (`''.split('\n')` is `['']`, and there is no trailing newline to subtract).
    // That is the repo's semantics, and this gate exists to match the repo's
    // counter rather than to have a nicer opinion about empty files.
    expect(lineCount('')).toBe(1);
  });

  it('actually swept the lane', () => {
    // A gate that collects nothing passes vacuously. This is the anti-vacuity check.
    expect(sizes.length).toBeGreaterThan(10);

    // And it must see the file that failed the rule in the first place, or it is
    // not covering the case it was written for.
    expect(sizes.map((s) => s.name)).toContain('UniversalThemeContext.tsx');
  });

  it('sweeps the palettes/ subdirectory the split created', () => {
    // The split moved 1,596 lines out of themePalettes.ts into a NEW subdirectory.
    // If the walk were non-recursive, the cap would silently stop covering the
    // largest block of data in the lane — a gate blinded by the very change that
    // needed it. Assert the new files are actually in scope.
    const names = sizes.map((s) => s.name);
    for (const expected of ['palettes/obsidian.ts', 'palettes/fonts.ts', 'palettes/abyss.ts']) {
      expect(names).toContain(expected);
    }
  });

  it('keeps every non-exempt file at or under the cap', () => {
    const over = sizes.filter((s) => !(s.name in EXEMPT) && s.lines > CAP);

    expect(
      over,
      over.length
        ? `over Rule 4's ${CAP} lines: ` +
            over.map((s) => `${s.name} (${s.lines})`).join(', ')
        : ''
    ).toEqual([]);
  });

  /**
   * LIVE, not dormant — this is the assertion that caught the round-4 defect.
   *
   * With `EXEMPT` empty this is equivalent to the test above, and that is the point:
   * it states the same rule from the other side, so an exemption added without the
   * file that justifies it (or a file over the cap with no exemption) fails here as
   * well. It previously sat under a `describe` labelled
   * "(dormant while EXEMPT is empty)" — which was wrong about this one, and a
   * mislabelled live assertion is how a real failure gets read as noise.
   */
  it('exempts exactly the files that exceed the cap, and no others', () => {
    const overCap = sizes.filter((s) => s.lines > CAP).map((s) => s.name).sort();

    expect(overCap).toEqual(Object.keys(EXEMPT).sort());
  });

  /**
   * The cap check must be able to FAIL. `_probeOverCap.ts` — 301 lines of comments,
   * imported by nothing — was left in `palettes/` by the round-3 red-probe pass and
   * turned this gate red in the delivered tree (2 of 99 tests). The lesson is not
   * "do not probe"; it is that a permanent fixture inside the swept directory breaks
   * the gate it was written to prove.
   *
   * So the proof is now self-contained and self-cleaning: a temporary directory
   * OUTSIDE the lane, removed in `finally`. Nothing can leak into `src/`, and the
   * walker, the counter and the comparison are all exercised on a known input.
   */
  it('detects an over-cap file when one exists (control on the check, not just the walker)', () => {
    const fixture = join(tmpdir(), `swan-rule4-probe-${process.pid}-${Date.now()}`);
    const overCapFile = join(fixture, 'overCap.ts');
    const underCapFile = join(fixture, 'underCap.ts');

    try {
      mkdirSync(fixture, { recursive: true });
      writeFileSync(overCapFile, `${'// probe\n'.repeat(CAP + 1)}`);
      writeFileSync(underCapFile, 'export const tiny = 1;\n');

      const found = collectSourceFiles(fixture).sort();
      expect(found).toHaveLength(2);

      const measured = found.map((full) => lineCount(readFileSync(full, 'utf8')));
      expect(measured).toContain(CAP + 1);
      expect(measured).toContain(1);

      const over = found.filter((full) => lineCount(readFileSync(full, 'utf8')) > CAP);
      expect(over).toEqual([overCapFile]);
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });

  it('carries no self-granted exemption', () => {
    // HY4 round 2 (MEDIUM #3). `themePalettes.ts` held an exemption that THIS FILE
    // granted it, with the reason "pure data table". The reviewer's objection was
    // not that the reason was false — it was that a rule whose carve-out is written
    // by the party it exempts is not a rule. The table is now split, so the cap
    // applies everywhere with no carve-outs.
    //
    // If a future change wants an exemption, that is an amendment to Rule 4 itself
    // and it is Sean's decision, not the builder's. Raise it; do not add it here.
    expect(
      Object.keys(EXEMPT),
      'Rule 4 is a hard cap. Adding an exemption is a policy change — raise it with Sean, do not grant it here.'
    ).toEqual([]);
  });

  // The two checks below ARE dormant while EXEMPT is empty — they iterate
  // `Object.keys(EXEMPT)` and therefore assert nothing today. They are kept because
  // they become live the moment a sanctioned exemption is added, and because they
  // document the contract that entry would have to satisfy. The third check that
  // used to live here was NOT dormant and has been moved up to the live block.
  describe('exemption contract (dormant — iterates EXEMPT, which is empty)', () => {
    it('exempts nothing that is not there any more', () => {
      const present = new Set(sizes.map((s) => s.name));

      for (const name of Object.keys(EXEMPT)) {
        expect(
          present.has(name),
          `exemption for "${name}" outlived the file — delete the entry (${EXEMPT[name]})`
        ).toBe(true);
      }
    });

    it('never exempts a test file', () => {
      // The cap is a production-code discipline; a long test file is a different
      // conversation. Exempting one here would silently widen the exemption list.
      for (const name of Object.keys(EXEMPT)) {
        expect(name).not.toMatch(/\.test\./);
      }
    });

    it('grants an exemption only to a file that actually needs one', () => {
      // The converse of the stale check: an exemption on a file that is comfortably
      // under the cap is dead weight that hides the real reason the entry exists.
      for (const name of Object.keys(EXEMPT)) {
        const entry = sizes.find((s) => s.name === name);
        expect(entry, name).toBeTruthy();
        expect(
          entry!.lines,
          `${name} is exempted but only ${entry!.lines} lines — drop the exemption`
        ).toBeGreaterThan(CAP);
      }
    });
  });
});
