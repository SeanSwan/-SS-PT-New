/**
 * style-hooks — the class-level guard for "an emitted class no stylesheet reads".
 * @module scripts/swan-brain-console/app/style-hooks.test
 *
 * WHY THIS FILE EXISTS (round 10, 2026-09-20)
 *
 * Round 7 found that the Gate Health panel's table carried `class="gate-table"` while
 * `app.css` styles `.table`, so the table matched no rule at all — no padding, no borders,
 * and not the `@media` rule that turns it into its own scroller. The fix was one line, and
 * the guard that came with it (`app-gates.test.mjs`, "the gate table carries a class app.css
 * actually styles") asserts about ONE element in ONE module.
 *
 * The defect was never one element. It was a CLASS: *a class token a producer assigns that
 * no stylesheet defines.* Round 10 swept for the rest of it and found three live instances,
 * two of them in the lines immediately above and below the one round 7 fixed —
 *
 *   - `tone-ok | tone-bad | tone-warn | tone-unknown`, emitted on six summary cards and on
 *     every table row. Measured in Chromium, all four statuses computed to the same colour at
 *     the same weight: PASS, FAIL and NOT RUN were visually identical, in the one panel whose
 *     header says that is the outcome it exists to prevent.
 *   - `gate-headline`, the panel's computed answer, which measured 16px/400 — the same as
 *     body text, in the panel an operator is told to read first.
 *   - `judge-left | judge-right`, the only place the Judge panel's side was recorded at all,
 *     while its own legend says "1 left wins · 2 right wins" and the layout stacks at ≤720px.
 *
 * So this suite asserts the class, not an instance: every class token every app module
 * assigns is either (a) defined by a stylesheet, (b) a declared verifier hook — a class a
 * test SELECTS on, which legitimately needs no rule — or (c) a member of a declared dynamic
 * vocabulary that is itself checked.
 *
 * THE THREE WAYS THIS GUARD COULD BE VACUOUS, AND WHAT STOPS EACH
 *   1. The scanner silently stops matching. -> `the scan is not vacuous` pins the file count,
 *      a token floor, a call-site floor, and four tokens that must be found.
 *   2. The class argument's position is assumed rather than read. -> it is parsed out of each
 *      module's own `node(...)` signature, and a module with a `node(` call whose class
 *      position cannot be determined is a FAILURE, never a skip.
 *   3. A class is computed and the scan cannot see its value. -> every template-literal class
 *      expression must be declared in `DYNAMIC`, and every member of a declared vocabulary
 *      must have a rule. An undeclared dynamic site fails.
 *
 * The parser lives in `../styleScan.mjs` (Node-only, so not under `app/`).
 * Run: node --test scripts/swan-brain-console/app/style-hooks.test.mjs
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { scanModule, styledClasses, derivedHooks } from '../styleScan.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CONSOLE = resolve(HERE, '..');
const APP = HERE;
const read = (f) => readFileSync(join(APP, f), 'utf8');

/* ── What is in scope, derived from the directory rather than listed ───────── */

/** The round-6 defect was a hand-maintained list that had drifted from its directory. */
const MODULES = readdirSync(APP)
  .filter((f) => /\.(js|mjs)$/.test(f) && !/\.test\./.test(f))
  .sort();
const STYLESHEETS = readdirSync(APP).filter((f) => f.endsWith('.css')).sort();

/**
 * Class expressions the scanner cannot resolve statically, each naming the vocabulary its
 * value is drawn from. A declaration is a promise: every member must have a rule.
 */
const DYNAMIC = [
  {
    file: 'app-gates.mjs',
    site: 'card tone-${statusTone(key)} and tone-${r.tone}',
    prefix: 'tone-',
    vocabulary: 'STATUS_TONE',
  },
  {
    /*
     * ROUND 11 — the site MOVED to `app-judge-render.mjs` when the rendering half was split out
     * of `app-judge.js`. A declaration names a file, so it had to move with the code; leaving it
     * pointed at the old file is how a declaration quietly stops covering anything.
     */
    file: 'app-judge-render.mjs',
    site: 'judge-variant judge-${side}',
    prefix: 'judge-',
    /*
     * Not an exported constant: `side` is a parameter and the only two values it is ever
     * called with are in `pairRow` — `variantCard(pair.left, 'left')`. Literal members are
     * the weaker form of the two declarations, so they are used only where there is no
     * constant to point at.
     */
    members: ['left', 'right'],
  },
];

/* ── The scan ──────────────────────────────────────────────────────────────── */

const SCANS = MODULES.map((f) => scanModule(read, f));
const ALL = new Set(SCANS.flatMap((s) => [...s.tokens]));
const STYLED = styledClasses(read, STYLESHEETS);
const HOOKS = derivedHooks([
  ...readdirSync(CONSOLE).filter((f) => f.endsWith('.mjs')).map((f) => readFileSync(join(CONSOLE, f), 'utf8')),
  ...readdirSync(join(CONSOLE, 'mcp')).filter((f) => f.endsWith('.mjs')).map((f) => readFileSync(join(CONSOLE, 'mcp', f), 'utf8')),
  ...readdirSync(APP).filter((f) => /\.test\.(js|mjs)$/.test(f)).map((f) => readFileSync(join(APP, f), 'utf8')),
]);

/* ── The guard ─────────────────────────────────────────────────────────────── */

describe('every class an app module assigns is styled, hooked, or declared dynamic', () => {
  test('the scan is not vacuous', () => {
    assert.ok(MODULES.length >= 7, `scanned only ${MODULES.length} modules: ${MODULES.join(', ')}`);
    assert.ok(STYLESHEETS.length >= 3, `read only ${STYLESHEETS.length} stylesheets`);
    assert.ok(STYLED.size >= 40, `the stylesheets yielded only ${STYLED.size} class names`);
    assert.ok(ALL.size >= 30, `the scan found only ${ALL.size} class tokens`);
    // Four tokens the modules demonstrably assign. If the scanner breaks, these go first.
    for (const t of ['table', 'panel', 'card', 'mono']) {
      assert.ok(ALL.has(t), `the scanner never saw '${t}' — it is no longer reading these files`);
    }
    assert.ok(
      SCANS.reduce((n, s) => n + s.sites, 0) >= 30,
      'the scanner found too few node(...) call sites to be reading the real source',
    );
  });

  test('no module assigns a class that nothing reads', () => {
    const orphans = [];
    for (const s of SCANS) {
      for (const t of s.tokens) {
        if (STYLED.has(t) || HOOKS.has(t)) continue;
        orphans.push(`${s.file}: .${t}`);
      }
    }
    assert.deepEqual(
      orphans.sort(), [],
      'these classes are assigned but no stylesheet defines them and no test selects on '
      + `them, so they do nothing: ${orphans.sort().join(', ')}`,
    );
  });

  test('the class position is read from each module, never assumed', () => {
    const blind = SCANS.filter((s) => s.notes.length).map((s) => `${s.file}: ${s.notes.join('; ')}`);
    assert.deepEqual(blind, [], `the scanner could not locate a class argument: ${blind.join(' | ')}`);
  });

  test('every class expression the scanner cannot resolve is declared', () => {
    const undeclared = [];
    for (const s of SCANS) {
      for (const expr of s.dynamic) {
        if (!DYNAMIC.some((d) => d.file === s.file && expr.includes(d.prefix))) {
          undeclared.push(`${s.file}: ${expr}`);
        }
      }
      for (const expr of s.unresolved) undeclared.push(`${s.file}: ${expr} (not a literal at all)`);
    }
    assert.deepEqual(
      undeclared, [],
      'a class is computed here and this suite cannot see its value. Either make it a '
      + `literal, or add it to DYNAMIC with the vocabulary it draws from: ${undeclared.join(' | ')}`,
    );
  });

  test('every member of a declared dynamic vocabulary has a rule', async () => {
    assert.ok(DYNAMIC.length > 0, 'DYNAMIC is empty — this test would be vacuous');
    for (const d of DYNAMIC) {
      let members;
      if (d.vocabulary) {
        const mod = await import(pathToFileURL(join(APP, d.file)).href);
        const vocab = mod[d.vocabulary];
        assert.ok(vocab, `${d.file} does not export ${d.vocabulary}`);
        members = Object.values(vocab);
      } else {
        assert.ok(Array.isArray(d.members), `${d.file}'s DYNAMIC entry declares no vocabulary`);
        members = d.members;
      }
      assert.ok(members.length >= 2, `${d.file}: ${members.length} members — too few to check`);
      const missing = members.map((m) => `${d.prefix}${m}`).filter((c) => !STYLED.has(c));
      assert.deepEqual(
        missing, [],
        `${d.file} emits these classes (${d.site}) and no stylesheet defines them: ${missing.join(', ')}`,
      );
    }
  });

  test('hook classes are derived from the selectors that use them', () => {
    // The one hook this codebase actually has. If it disappears, the derivation above has
    // stopped reading the consumers — and a broken selector scan silently excuses every
    // orphan instead of catching it.
    assert.ok(
      HOOKS.has('gate-table'),
      'gate-table is selected by console-verify.mjs and was not derived as a hook — the '
      + 'selector scan is broken',
    );
  });

  test('the scanner reads every class form it claims to — and only those', () => {
    /*
     * ROUND 11 (2026-09-20). Astra falsified the first version of this scanner with four
     * mutations, and the suite returned GREEN on two of them:
     *   - a static segment AFTER an interpolation: `` `card tone-${k} after-interpolation` ``
     *   - a second argument to `classList.add`:      `add('first', 'second')`
     * Double-quoted arguments and `setAttribute('class', …)` were not read at all.
     *
     * This is the guard on the guard. The forms must be SEEN — and the force-flag literal in
     * `toggle(name, force)` must NOT be mistaken for a class, which is the false positive the
     * first attempt at this fix produced.
     */
    const FIXTURE = [
      "function node(tag, className, text) { return { tag, className, text }; }",
      'node(\'div\', `card tone-${k} after-interpolation`);',
      'node(\'div\', "double-quoted-class");',
      "el.classList.add('first', 'second');",
      'el.classList.add("third");',
      "el.classList.toggle('toggled', x !== 'NOT_A_CLASS');",
      "el.setAttribute('class', 'via-set-attribute');",
      'el.setAttribute("class", "via-double-set");',
    ].join('\n');
    const r = scanModule(() => FIXTURE, 'fixture.mjs');
    const found = new Set(r.tokens);
    const expected = [
      'card', 'after-interpolation', 'double-quoted-class', 'first', 'second', 'third',
      'toggled', 'via-set-attribute', 'via-double-set',
    ];
    for (const t of expected) {
      assert.ok(found.has(t), `the scanner did not see the class token "${t}"`);
    }
    assert.ok(!found.has('NOT_A_CLASS'), 'a toggle() force-flag literal was read as a class');
  });
});

/* ── Round 13 (Astra H09): a `var()` must reference a token that EXISTS ────── */

/**
 * Why this guard exists, and why it strips comments first.
 *
 * Astra round 13 (H09) found `.judge-persistence` written as `var(--warn, #b45309)`. `--warn` is
 * defined NOWHERE in these stylesheets, so the fallback was ALWAYS the rendered colour — a dark
 * amber on a dark surface, about 3.93:1, below the repository's 4.5:1 floor for small text. The
 * warning exists to stop the operator losing work, and it could not be read. `var(--x, fallback)`
 * with an undefined `--x` is not a themed value; it is a hardcoded one wearing a theme's clothes.
 *
 * COMMENT STRIPPING IS LOAD-BEARING. The first draft scanned raw CSS and flagged three
 * references — `--token` (onboard.css) and `--warn`, `--x` (judge.css). Two were inside the
 * explanatory COMMENTS describing this very defect, including the one you are reading. A guard
 * that reads prose and claims to read code is the defect class it is written to catch.
 */
const stripCssComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '');

/** Every custom property DEFINED across the app's stylesheets. */
function definedTokens() {
  const defined = new Set();
  for (const f of STYLESHEETS) {
    for (const m of stripCssComments(read(f)).matchAll(/(--[a-z0-9-]+)\s*:/gi)) {
      defined.add(m[1]);
    }
  }
  return defined;
}

/** Every custom property REFERENCED via `var()` across the app's stylesheets. */
function referencedTokens() {
  const refs = new Map();
  for (const f of STYLESHEETS) {
    for (const m of stripCssComments(read(f)).matchAll(/var\(\s*(--[a-z0-9-]+)\s*(,[^)]*)?\)/gi)) {
      if (!refs.has(m[1])) refs.set(m[1], { fallback: Boolean(m[2]), files: new Set() });
      refs.get(m[1]).files.add(f);
    }
  }
  return refs;
}

describe('CSS custom properties — a reference must resolve (Astra H09)', () => {
  test('RED — no stylesheet references an UNDEFINED token', () => {
    /*
     * MUTATION: change `.judge-persistence`'s `var(--danger)` back to `var(--warn, #b45309)`.
     * `--warn` is undefined, so this test goes RED — which is exactly the defect Astra found.
     */
    const defined = definedTokens();
    const missing = [...referencedTokens()]
      .filter(([token]) => !defined.has(token))
      .map(([token, info]) => `${token} (used in ${[...info.files].join(', ')})`);
    assert.deepEqual(missing, [],
      'these tokens are referenced by var() but defined nowhere — a fallback is not a definition');
  });

  test('the scan is not vacuous — it sees the palette and the references', () => {
    // Guards the guard: if comment-stripping or the regexes broke, the test above would compare
    // empty sets and pass. MUTATION: break `stripCssComments` (strip everything).
    const defined = definedTokens();
    const refs = referencedTokens();
    assert.ok(defined.size >= 15, `only ${defined.size} tokens found — the definition scan is broken`);
    assert.ok(refs.size >= 5, `only ${refs.size} references found — the reference scan is broken`);
    // Named anchors: a real palette token and a real reference.
    assert.ok(defined.has('--danger'), 'the palette scan missed --danger');
    assert.ok(refs.has('--danger'), 'the reference scan missed a var(--danger) use');
  });
});
