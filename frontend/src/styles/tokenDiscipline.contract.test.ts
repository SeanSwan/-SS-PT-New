/**
 * tokenDiscipline.contract.test.ts — the enforcement layer for Palette Law A.
 *
 * WHY THIS EXISTS
 * The design ratification (docs/ai-workflow/AI-HANDOFF/DESIGN-RATIFICATION-FINAL-2026-07-16.md)
 * mandated "a ban without enforcement is just a comment". The Village prescribed Stylelint; a
 * rule-26 receipt (PREREQ-SLICE-CORRECTED-2026-07-16.md) found this repo has no Stylelint and
 * already enforces theme discipline with vitest contract tests. A repo-wide contract test delivers
 * the same ban with zero new dependencies AND covers styled-components template literals, which
 * Stylelint cannot without extra plugins.
 *
 * WHAT IT LOCKS (each assertion maps to receipted ground truth)
 *  1. Retired Galaxy-Swan brand hexes never return to mounted code.
 *  2. tokens.css stays the SOLE declarer of the Obsidian/Carbon/Graphite trio.
 *  3. themeUtils.ts stays the SOLE injector of the semantic vars (--bg-base, --accent-x, --text-x).
 *  4. universal-theme-styles.css (a competing token owner, live at App.tsx:78) gains no NEW importers.
 *  5. theme/tokens.ts (static, theme-blind) gains no new importers — deprecation ratchet.
 *
 * HOW IT BREAKS: it scans source text, so a violation written via computed strings would evade it.
 * That is acceptable — this guards accident and drift, not a determined bypass.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, sep } from 'path';

const SRC = join(__dirname, '..');

/** Retired Galaxy-Swan brand identity — permanently banned on Swan surfaces (CLAUDE.md Identity). */
const RETIRED_HEXES = [
  ['#0a', '0a1a'].join(''),
  ['#00', 'ffff'].join(''),
  ['#785', '1a9'].join(''),
];

/**
 * Exemptions.
 *
 * HOSTILE-REVIEW FIX (2026-07-17): these were substring matches — a bypass. A real component named
 * e.g. `ArchiveEditorial.tsx` (this design program literally has an "Archive Editorial" candidate)
 * would have been silently exempted from the ban. Directory exemptions now match a whole PATH
 * SEGMENT; test files are matched by extension, not by the substring '.test.'.
 */
const EXEMPT_SUFFIXES = ['.deleted'];
const EXEMPT_SEGMENTS = ['__tests__', 'archive', 'archived', 'dashboard-export'];
const isTestFile = (path: string): boolean => /\.(test|spec)\.[cm]?[jt]sx?$/.test(path);

/** Test files legitimately quote banned strings (guard tests assert their absence). */
function isExempt(path: string): boolean {
  if (isTestFile(path)) return true;
  if (EXEMPT_SUFFIXES.some((s) => path.endsWith(s))) return true;
  const segments = path.split('/');
  return EXEMPT_SEGMENTS.some((seg) => segments.includes(seg));
}

const CODE_EXT = ['.ts', '.tsx', '.js', '.jsx', '.css'];

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.git' || entry === 'dist' || entry === 'build') continue;
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(full, acc);
    else if (CODE_EXT.some((e) => entry.endsWith(e))) acc.push(full);
  }
  return acc;
}

const ALL_FILES = walk(SRC);
const rel = (f: string): string => relative(SRC, f).split(sep).join('/');
const read = (f: string): string => readFileSync(f, 'utf-8');
/** Non-exempt source files — the surface every ban below applies to. */
const MOUNTED = ALL_FILES.filter((f) => !isExempt(rel(f)));

describe('token discipline — Palette Law A enforcement', () => {
  it('bans retired Galaxy-Swan hexes in mounted source', () => {
    const offenders: string[] = [];
    for (const file of MOUNTED) {
      const lower = read(file).toLowerCase();
      for (const hex of RETIRED_HEXES) {
        if (lower.includes(hex)) offenders.push(`${rel(file)} → ${hex}`);
      }
    }
    // SwanGalaxyLuxuryButton.tsx retains #0A0A1A but has zero consumers (receipted 2026-07-17).
    // Listed so its removal is a deliberate act, not an accident — shrink this list, never grow it.
    const KNOWN_ORPHANS = [`components/ui/SwanGalaxyLuxuryButton.tsx → ${RETIRED_HEXES[0]}`];
    const unexpected = offenders.filter((o) => !KNOWN_ORPHANS.includes(o));
    expect(
      unexpected,
      `Retired Galaxy-Swan hex in mounted code. Use var(--token, #CrystallineFallback).\n${unexpected.join('\n')}`,
    ).toEqual([]);
  });

  it('keeps tokens.css the sole declarer of the Obsidian/Carbon/Graphite trio', () => {
    const declarers = MOUNTED.filter((f) => {
      const txt = read(f);
      return /--obsidian-black\s*:/.test(txt) || /--carbon\s*:/.test(txt) || /--graphite\s*:/.test(txt);
    }).map(rel);
    expect(declarers, 'The dark trio must be declared once, in styles/tokens.css.').toEqual(['styles/tokens.css']);
  });

  it('keeps themeUtils.ts the sole injector of the semantic vars', () => {
    // A second injector = two owners of --bg-base/--accent-* = the dimmer switch silently forks.
    // tokens.css is excluded on purpose: it owns a disjoint brand-name namespace and is bridged
    // deliberately by generateBrandRgbBridge() (themeUtils.ts:88-108).
    const injectors = MOUNTED.filter((f) => {
      if (rel(f) === 'styles/tokens.css') return false;
      const txt = read(f);
      return /--bg-base\s*:/.test(txt) && /--accent-primary\s*:/.test(txt);
    }).map(rel);
    expect(injectors, 'Only utils/theme/themeUtils.ts may declare the semantic token set.').toEqual([
      'utils/theme/themeUtils.ts',
    ]);
  });

  it('ratchets the competing second token owner (universal-theme-styles.css)', () => {
    // FINDING 2026-07-17 (this test caught it; the rule-26 receipt had wrongly reported "zero importers"):
    // universal-theme-styles.css:28-31 declares --bg-surface / --bg-elevated (#1A1F2E) / --text-primary
    // (#E6EDF3) — NON-Swan GitHub greys — on :root, the SAME vars themeUtils.ts:187-191 owns.
    // It IS live: App.tsx:78 imports it. Two owners of one contract.
    // Why the app still looks right: themeUtils injects <style id="theme-variables"> into <head> at
    // RUNTIME, so it lands after the bundled CSS and wins on document order. That is luck, not design —
    // before injection (first paint / if injection throws) the GitHub greys paint instead.
    // Ruled P1 for the token-cleanup slice (rule 37: cleanup is a separate pass), NOT smuggled into
    // this infrastructure slice. This ratchet stops a SECOND importer from landing meanwhile.
    const KNOWN_VIOLATION = ['App.tsx'];
    const importers = MOUNTED.filter((f) => {
      if (rel(f).includes('universal-theme-styles.css')) return false;
      return read(f).includes('universal-theme-styles');
    }).map(rel);
    const unexpected = importers.filter((i) => !KNOWN_VIOLATION.includes(i));
    expect(
      unexpected,
      `universal-theme-styles.css is a competing token owner. Do not add importers; the existing one (App.tsx:78) is being removed in the token-cleanup slice.\n${unexpected.join('\n')}`,
    ).toEqual([]);
  });

  it('ratchets down theme/tokens.ts (static, theme-blind, competing)', () => {
    // Styling from this file ignores all 18 themes. Migration is its own slice (rule 37);
    // this ratchet stops the bleeding. Lower the number when you migrate — never raise it.
    const importers = MOUNTED.filter((f) => {
      const path = rel(f);
      if (path === 'theme/tokens.ts') return false;
      const txt = read(f);
      const importsByPath = /from\s+['"][^'"]*theme\/tokens['"]/.test(txt);
      const importsAsSibling = path.startsWith('theme/') && /from\s+['"]\.\.?\/tokens['"]/.test(txt);
      return importsByPath || importsAsSibling;
    }).map(rel);
    const CEILING = 7; // receipted 2026-07-17
    expect(
      importers.length,
      `theme/tokens.ts importers must not grow (ceiling ${CEILING}). Use the theme system instead.\n${importers.join('\n')}`,
    ).toBeLessThanOrEqual(CEILING);
  });
});
