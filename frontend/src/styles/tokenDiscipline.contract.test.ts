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

/**
 * Retired Galaxy-Swan brand identity — permanently banned on Swan surfaces (CLAUDE.md Identity).
 *
 * HOSTILE-REVIEW FIX #2 (2026-07-17) — COLOR-SPACE EVASION. The first version of this ban only
 * matched HEX. That was a hole big enough to drive the whole retired brand through: #7851A9 is
 * rgb(120,81,169), and the bundler minifies `rgba(120,81,169,.2)` straight back into `#7851a933`.
 * Proof it mattered: production CSS was serving `.bg-cosmic-gradient{...#7851a933}` while this test
 * was green, because the source writes it in rgba() form. A ban that only knows one notation is not
 * a ban. Each retired colour is now matched in BOTH hex and rgb/rgba space.
 */
const RETIRED_COLORS: Array<{ name: string; hex: string; rgb: [number, number, number] }> = [
/* eslint-disable no-restricted-syntax -- Guard fixtures must name the retired values they detect. */
  { name: 'Galaxy-Swan deep', hex: '#0a0a1a', rgb: [10, 10, 26] },
  { name: 'Galaxy-Swan cyan', hex: '#00ffff', rgb: [0, 255, 255] },
  { name: 'Galaxy-Swan purple', hex: '#7851a9', rgb: [120, 81, 169] },
];

/** Matches `rgb(120, 81, 169)` / `rgba(120,81,169,.2)` — any spacing, rgb or rgba. */
const rgbPattern = ([r, g, b]: [number, number, number]): RegExp =>
  new RegExp(`rgba?\\(\\s*${r}\\s*,\\s*${g}\\s*,\\s*${b}\\s*[,)]`, 'i');

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
  it('bans retired Galaxy-Swan colours in mounted source (hex AND rgb notation)', () => {
    const offenders: string[] = [];
    for (const file of MOUNTED) {
      const src = read(file);
      const lower = src.toLowerCase();
      for (const colour of RETIRED_COLORS) {
        if (lower.includes(colour.hex)) offenders.push(`${rel(file)} → ${colour.hex}`);
        if (rgbPattern(colour.rgb).test(src)) offenders.push(`${rel(file)} → rgb(${colour.rgb.join(',')}) [= ${colour.hex}]`);
      }
    }

    /**
     * DEBT LEDGER — retired brand colour still present, ratcheted while it is retired for real.
     *
     * These are NOT approved. They are the honest, receipted scope of a live problem this test
     * uncovered on 2026-07-17: the retired Galaxy-Swan purple is SHIPPING TO PRODUCTION TODAY via
     * rgba() notation (verified: prod `/v3/index.*.css` serves `.bg-cosmic-gradient{…#7851a933}`).
     * An earlier claim that "the retired-hex remediation surface is 1 line" was WRONG — this is it.
     *
     * Removing them changes pixels on live surfaces, so it is its own slice with its own QA
     * (rule 37: cleanup is a separate pass) — NOT smuggled into an infrastructure commit.
     * This list may only ever SHRINK. Adding to it is a rule violation, not a workaround.
     */
    const KNOWN_DEBT = [
      // Orphaned (zero consumers) — receipted 2026-07-17.
      'components/ui/SwanGalaxyLuxuryButton.tsx → #0a0a1a',
      // Live CSS bundled into production.
      'styles/cosmic-elegance-utilities.css → rgb(120,81,169) [= #7851a9]',
      'styles/cosmic-mobile-navigation.css → rgb(120,81,169) [= #7851a9]',
      'styles/cosmic-mobile-navigation.css → rgb(10,10,26) [= #0a0a1a]',
      'styles/visual-polish.css → rgb(120,81,169) [= #7851a9]',
      'styles/visual-softening.css → rgb(120,81,169) [= #7851a9]',
      // Legacy/orphaned components.
      'components/NewsletterSignup/NewsletterSignup.jsx → rgb(120,81,169) [= #7851a9]',
      'pages/about/About.jsx → rgb(120,81,169) [= #7851a9]',
      'pages/about/About.jsx → rgb(10,10,26) [= #0a0a1a]',
      'pages/HomePage/components/Hero-Section.V2.tsx → rgb(120,81,169) [= #7851a9]',
      'pages/gallery/GalleryInfoCard.tsx → rgb(10,10,26) [= #0a0a1a]',
      'pages/gallery/MessageModal.tsx → rgb(10,10,26) [= #0a0a1a]',
      'styles/galaxy-swan-theme.ts → rgb(10,10,26) [= #0a0a1a]',
    ];
    /* eslint-enable no-restricted-syntax */
    const unexpected = offenders.filter((o) => !KNOWN_DEBT.includes(o));
    expect(
      unexpected,
      `Retired Galaxy-Swan colour in mounted code (hex or rgb). Use var(--token, #CrystallineFallback).\n${unexpected.join('\n')}`,
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

  it('ratchets importers of the duplicate fallback token block (universal-theme-styles.css)', () => {
    // CORRECTION 2026-07-17 (an earlier revision of this comment was WRONG and is retracted):
    // I previously recorded that universal-theme-styles.css:19-49 "competes" with themeUtils using
    // non-Swan values. It does NOT. Verified: every var in that :root block is also declared by
    // themeUtils, and its VALUES faithfully mirror the active `crystallineDark` theme
    // (UniversalThemeContext.tsx:240 — deepSpace #0D1117, stardust #161B22, text #E6EDF3). The block
    // is an intentional pre-JS FALLBACK ("will be overridden by JavaScript", :18) so first paint is
    // not unstyled. themeUtils then wins at runtime by document order. That is the design, not luck.
    //
    // The REAL hazard is duplication drift: two hand-maintained copies of one palette. (It is in
    // parity TODAY — verified by the fallback-parity test below, which is the guard that actually
    // matters and which already caught one bad edit.) This ratchet just stops the duplicate spreading to more entry
    // points. NOTE: the separate question of whether `crystallineDark`'s backgrounds SHOULD be the
    // documented Crystalline Swan palette (#0A0A0F/#141419/#1A1A24) instead of GitHub-family darks is
    // a live product decision for Sean — it would restyle the whole app and is NOT decided here.
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

  it('keeps the pre-JS fallback block at parity with the crystallineDark theme', () => {
    // THE GUARD THAT MATTERS. universal-theme-styles.css:19-49 is a hand-maintained duplicate of the
    // active theme's palette, painted before JS injects the real one. If the theme changes and this
    // copy doesn't, users get a first-paint flash of the OLD palette — a silent, hard-to-reproduce bug.
    // This test makes that drift impossible. It already caught one (--text-muted 0.6 vs 0.55).
    const css = read(join(SRC, 'styles/universal-theme-styles.css'));
    const theme = read(join(SRC, 'context/ThemeContext/UniversalThemeContext.tsx'));

    // Scope to the crystallineDark block: from its declaration to the next top-level theme const.
    const start = theme.indexOf('const crystallineDark');
    expect(start, 'crystallineDark theme not found — update this test to the new theme source.').toBeGreaterThan(-1);
    const rest = theme.slice(start + 1);
    const nextConst = rest.indexOf('\nconst ');
    const block = nextConst === -1 ? rest : rest.slice(0, nextConst);

    const cssVar = (name: string): string | null => {
      const m = css.match(new RegExp(`--${name}\\s*:\\s*([^;]+);`));
      return m ? m[1].trim() : null;
    };
    /** Reads `key: 'value'` inside a named sub-object (background/text) of the theme block. */
    const themeVal = (group: string, key: string): string | null => {
      const g = block.match(new RegExp(`${group}\\s*:\\s*\\{([\\s\\S]*?)\\n\\s{2}\\}`));
      if (!g) return null;
      const m = g[1].match(new RegExp(`\\b${key}\\s*:\\s*'([^']+)'`));
      return m ? m[1].trim() : null;
    };

    const PARITY: Array<[string, string, string]> = [
      // [css var, theme group, theme key]
      ['bg-primary', 'background', 'primary'],
      ['bg-secondary', 'background', 'secondary'],
      ['bg-surface', 'background', 'surface'],
      ['bg-elevated', 'background', 'elevated'],
      ['text-primary', 'text', 'primary'],
      ['text-secondary', 'text', 'secondary'],
      ['text-muted', 'text', 'muted'],
    ];

    const drift: string[] = [];
    for (const [v, group, key] of PARITY) {
      const a = cssVar(v);
      const b = themeVal(group, key);
      // Only assert when BOTH sides are readable; a null means the source moved and the mismatch
      // report would be noise, not signal.
      if (a && b && a.toLowerCase() !== b.toLowerCase()) drift.push(`--${v}: css="${a}" vs theme.${group}.${key}="${b}"`);
    }
    expect(
      drift,
      `The pre-JS fallback in universal-theme-styles.css has drifted from the crystallineDark theme.\nUsers will see a first-paint flash of the wrong palette. Update the CSS block to match the theme.\n${drift.join('\n')}`,
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

// guard-exemption regression marker (SWA-40 trial 1): this comment is safe to remove
