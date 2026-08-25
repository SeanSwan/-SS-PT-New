/**
 * @swan/forge — instrument validation (audit-contrast + drift-lint).
 * Standing law (learning corpus 2026-08-23): a gate nobody validated detects nothing.
 * Round 2 (GLM code review): the gate's FAILURE paths are now exercised too —
 * a gate whose only tested behavior is passing has never been seen detecting.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  contrastRatio, hexToRgb, parseTokens, resolveChain, auditPack,
  SEMANTIC_NAMES, PAIRS, waiverApplies,
} from '../scripts/audit-contrast.mjs';
import { lintText, loadExceptions, stripComments } from '../scripts/drift-lint.mjs';

const PKG = dirname(dirname(fileURLToPath(import.meta.url)));

// ── contrast math against known WCAG reference values ────────────────
test('contrast: black on white is exactly 21:1', () => {
  assert.equal(contrastRatio('#000000', '#FFFFFF'), 21);
});
test('contrast: #767676 on white ≈ 4.54:1 (the canonical WCAG boundary gray)', () => {
  const r = contrastRatio('#767676', '#FFFFFF');
  assert.ok(r > 4.5 && r < 4.6, `got ${r}`);
});
test('contrast: order-independent; 3-digit accepted; alpha hex rejected loudly', () => {
  assert.equal(contrastRatio('#FFF', '#000'), contrastRatio('#000000', '#FFFFFF'));
  assert.equal(hexToRgb('#abc')?.join(','), '170,187,204');
  assert.equal(hexToRgb('#8B5CF6CC'), null, '8-digit alpha hex must NOT silently resolve');
  assert.equal(hexToRgb('not-a-color'), null);
});

// ── token parsing + resolution order (§11.A4) ────────────────────────
test('resolution order: component-override wins over pack semantic', () => {
  const { tokens } = parseTokens(':root{--sw-text-inverse: #FFFFFF; --sw-btn-primary-text: #E0ECF4;}');
  assert.equal(resolveChain(tokens, ['--sw-btn-primary-text', '--sw-text-inverse']), '#E0ECF4');
  assert.equal(resolveChain(tokens, ['--sw-btn-accent-text', '--sw-text-inverse']), '#FFFFFF', 'absent override falls through');
});

// ── evasion defense: duplicate audited tokens are a hard fail ────────
test('audit: duplicate declaration of an audited token (media-query evasion) FAILS', () => {
  const evil = `:root{--sw-text-primary: #333344; --sw-bg-base: #FFFFFF;}
    @media (min-width: 99999px){ :root{ --sw-text-primary: #000000; } }`;
  const { duplicates } = auditPack('evil.css', evil);
  assert.ok(duplicates.includes('--sw-text-primary'), 'duplicate audited token must be flagged');
});
test('audit: duplicate of a NON-audited token (e.g. --sw-motion reduced-motion block) is allowed', () => {
  const fine = ':root{--sw-motion: 1;} @media (prefers-reduced-motion: reduce){ :root{--sw-motion: 0;} }';
  const { duplicates } = auditPack('fine.css', fine);
  assert.deepEqual(duplicates, []);
});

// ── the gate's FAIL paths, exercised ─────────────────────────────────
test('audit: a genuinely failing pair reports FAIL (not silently absent)', () => {
  const bad = ':root{--sw-text-primary: #777777; --sw-bg-base: #888888;}';
  const { results } = auditPack('bad.css', bad);
  const r = results.find((x) => x.label === 'body text / page');
  assert.equal(r.status, 'FAIL');
});
test('audit: missing semantic names are reported', () => {
  const { missing } = auditPack('empty.css', ':root{}');
  assert.equal(missing.length, SEMANTIC_NAMES.length);
});
test('audit: unresolvable pair (var()/color-mix value) reports UNRESOLVED', () => {
  const css = ':root{--sw-text-primary: var(--nope); --sw-bg-base: #FFFFFF;}';
  const { results } = auditPack('unres.css', css);
  assert.equal(results.find((x) => x.label === 'body text / page').status, 'UNRESOLVED');
});

// ── Ox F1: a waiver must NEVER mask instrument failure ───────────────
test('audit: corrupt hex on a WAIVED pair is a blocking FAIL, not WAIVED-FAIL', () => {
  const corrupt = ':root{--sw-text-inverse: #FFFFFF; --sw-color-accent: #GGGGGG;}';
  const { results } = auditPack('crystalline-swan.css', corrupt, new Date('2026-09-01'));
  const accent = results.find((x) => x.label === 'button accent label');
  assert.equal(accent.status, 'FAIL', 'null ratio on a waived pair must fail loudly');
});

// ── Ox F2: commented-out tokens must not satisfy the gate ────────────
test('audit: a token that exists only inside /* */ does NOT count as defined', () => {
  const sneaky = ':root{ /* --sw-text-primary: #FFFFFF; */ --sw-bg-base: #000000;}';
  const { missing } = auditPack('sneaky.css', sneaky);
  assert.ok(missing.includes('--sw-text-primary'), 'commented declaration must stay missing');
});
test('audit: a commented duplicate does not trip the duplicate gate', () => {
  const ok = ':root{--sw-text-primary: #FFFFFF; /* --sw-text-primary: #000000; */ }';
  const { duplicates } = auditPack('ok.css', ok);
  assert.deepEqual(duplicates, []);
});

// ── waiver governance: pack-scoped + time-boxed ──────────────────────
test('waiver: applies only to listed pack and only before expiry', () => {
  const accentPair = PAIRS.find((p) => p.label === 'button accent label');
  assert.ok(accentPair.waiver.owner && accentPair.waiver.expiry, 'waiver must carry owner + expiry');
  assert.equal(waiverApplies(accentPair, 'crystalline-swan.css', new Date('2026-09-01')), true);
  assert.equal(waiverApplies(accentPair, 'some-new-pack.css', new Date('2026-09-01')), false, 'non-listed pack gets NO free pass');
  assert.equal(waiverApplies(accentPair, 'crystalline-swan.css', new Date('2027-01-01')), false, 'expired waiver = real failure');
});
test('audit: crystalline accent pair is WAIVED-FAIL today (asserted, not incidental)', () => {
  const css = readFileSync(join(PKG, 'tokens', 'packs', 'crystalline-swan.css'), 'utf8');
  const { results } = auditPack('crystalline-swan.css', css, new Date('2026-09-01'));
  assert.equal(results.find((x) => x.label === 'button accent label').status, 'WAIVED-FAIL');
});

// ── the REAL packs pass their own gate ───────────────────────────────
for (const pack of ['crystalline-swan.css', 'swanguard-editorial.css']) {
  test(`pack ${pack}: all ${SEMANTIC_NAMES.length} names, no duplicates of audited tokens, no unwaived fails`, () => {
    const css = readFileSync(join(PKG, 'tokens', 'packs', pack), 'utf8');
    const { missing, duplicates, results } = auditPack(pack, css, new Date('2026-09-01'));
    assert.deepEqual(missing, [], `missing: ${missing.join(', ')}`);
    assert.deepEqual(duplicates, [], `duplicated audited tokens: ${duplicates.join(', ')}`);
    const hardFails = results.filter((r) => r.status === 'FAIL' || r.status === 'UNRESOLVED');
    assert.deepEqual(hardFails.map((r) => `${r.label}:${r.ratio?.toFixed(2)}`), []);
  });
}

// ── SEMANTIC_NAMES must equal the contract document (no hand-sync drift) ──
test('SEMANTIC_NAMES matches tokens/semantic.contract.md exactly', () => {
  const md = readFileSync(join(PKG, 'tokens', 'semantic.contract.md'), 'utf8');
  const inDoc = new Set([...md.matchAll(/`(--sw-(?!p-)[\w-]+)`/g)].map((m) => m[1]));
  for (const n of SEMANTIC_NAMES) assert.ok(inDoc.has(n), `${n} missing from contract doc`);
  for (const n of inDoc) {
    if (n.startsWith('--sw-btn-') || n.startsWith('--sw-card-') || n.startsWith('--sw-input-')) continue; // component-tier examples
    assert.ok(SEMANTIC_NAMES.includes(n), `${n} in contract doc but not in SEMANTIC_NAMES`);
  }
});

// ── drift-lint rules fire on known-bad fixtures and stay quiet on good ─
test('drift-lint R1: raw hex (incl. 8-digit alpha) in Forge css flagged; tokens clean', () => {
  assert.equal(lintText('css/x.css', '.sw-x { color: #FF0000; }', { isForgeCss: true }).length, 1);
  assert.equal(lintText('css/x.css', '.sw-x { color: #8B5CF6CC; }', { isForgeCss: true }).length, 1, '8-digit alpha hex must flag');
  assert.equal(lintText('css/x.css', '.sw-x { color: var(--sw-text-primary); }', { isForgeCss: true }).length, 0);
});
test('drift-lint R3: reorder properties flagged, case-insensitively, incl. grid-area', () => {
  const bad = '.x { FLEX-DIRECTION: ROW-REVERSE; }\n.y { order: 2; }\n.z { grid-area: 2 / 1; }';
  assert.equal(lintText('tokens/packs/p.css', bad, { isPack: true }).filter((f) => f.rule === 'R3').length, 3);
});
test('drift-lint R5: pack redefining a primitive floor is flagged; referencing one is not', () => {
  assert.equal(lintText('tokens/packs/p.css', ':root{ --sw-p-target-min: 20px; }', { isPack: true }).filter((f) => f.rule === 'R5').length, 1);
  assert.equal(lintText('tokens/packs/p.css', ':root{ --sw-x: var(--sw-p-target-min); }', { isPack: true }).filter((f) => f.rule === 'R5').length, 0);
});
test('drift-lint R2/R4: consumer override + legacy import detected', () => {
  const consumer = [
    'import GlowButton from "../ui/buttons/GlowButton";',
    '.sw-btn { padding: 0 !important; }',
  ].join('\n');
  const rules = lintText('app/x.tsx', consumer, { isConsumer: true }).map((f) => f.rule).sort();
  assert.deepEqual(rules, ['R2', 'R4']);
});
test('drift-lint: comments never flag AND never hide (Ox F7, both directions)', () => {
  assert.equal(lintText('css/x.css', ' * example: color: #FF0000;', { isForgeCss: true }).length, 0);
  assert.equal(lintText('css/x.css', 'see GlowButton import */', { isConsumer: true }).length, 0, 'block-comment continuation line must not flag R4');
  assert.equal(lintText('css/x.css', '/* brand: #FF0000 */\n.x { color: var(--sw-border); }', { isForgeCss: true }).length, 0, 'inline block comment must not flag R1');
  const hidden = lintText('css/x.css', '.x { color: #FF0000; } /* legit note */', { isForgeCss: true });
  assert.equal(hidden.length, 1, 'violation BEFORE a trailing comment must still flag');
});
test('drift-lint: stripComments preserves line numbers', () => {
  const out = stripComments('a\n/* two\nthree */\nb');
  assert.equal(out.split('\n').length, 4);
  assert.equal(out.split('\n')[3], 'b');
});
test('drift-lint R3: direction ltr flagged too (reordering in an RTL document)', () => {
  assert.equal(lintText('tokens/packs/p.css', '.x { direction: ltr; }', { isPack: true }).filter((f) => f.rule === 'R3').length, 1);
});

// ── exception ledger: unexpired suppresses, expired does not ─────────
test('exceptions: expiry is enforced by the parser', () => {
  const ledger = [
    '| path-substring | rule | owner | expiry | reason |',
    '| Legacy.css | R2 | sean | 2099-01-01 | live |',
    '| Old.css | R2 | sean | 2020-01-01 | expired |',
  ].join('\n');
  const rows = loadExceptions(ledger, new Date('2026-08-24'));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].pathSub, 'Legacy.css');
});

// ── R6 + the tagger: the T2 standing-law and context-classification instruments ──────

test('drift-lint R6: a hand-written styled(ForgeButton) that RESTYLES is flagged; one that POSITIONS is not', () => {
  // The codemod refuses to CREATE a skin-fighting wrapper; R6 is the half that survives the
  // merge and stops one being hand-written afterwards (Ox T2 B3). Same boundary function.
  const clean = 'export const A = styled(ForgeButton)`\n  margin-top: 1rem;\n  flex: 1;\n`;';
  assert.equal(lintText('a.tsx', clean, { isConsumer: true }).filter((v) => v.rule === 'R6').length, 0);
  const override = 'export const B = styled(ForgeButton)`\n  --sw-btn-height: 40px;\n`;';
  assert.equal(lintText('b.tsx', override, { isConsumer: true }).filter((v) => v.rule === 'R6').length, 0,
    '--sw-btn-* IS the sanctioned override surface, not a violation');
  for (const decl of ['background: red;', 'outline: none;', 'line-height: 1;', 'width: 300px;',
    'filter: brightness(2);', 'text-shadow: 0 0 2px red;', '&:hover { background: red; }', '${skinCss}']) {
    const src = `export const C = styled(ForgeButton)\`\n  ${decl}\n\`;`;
    const hits = lintText('c.tsx', src, { isConsumer: true }).filter((v) => v.rule === 'R6');
    assert.equal(hits.length, 1, `${decl} must raise R6`);
  }
});

test('tag-legacy-hex: REFUSES every context it cannot positively classify, and never guesses', async () => {
  const { commentFormFor } = await import('../scripts/tag-legacy-hex.mjs');
  const at = (src, idx) => { const l = src.split('\n'); let a = 0; for (let i = 0; i < idx; i++) a += l[i].length + 1; return [a, l[idx]]; };
  // Both of these produced a `//` in the first version. (b) is the class that already shipped once:
  // appended after JSX children, `//` is not a comment — it is TEXT, and it renders.
  const jsxText = '<td>\n  Status colour #ef4444 retired\n</td>';
  assert.equal(commentFormFor('x.tsx', jsxText, ...at(jsxText, 1)), null, 'JSX text line → REFUSE');
  const openTag = "<div style={{ color: '#ef4444' }}>";
  assert.equal(commentFormFor('x.tsx', openTag, ...at(openTag, 0)), null, 'opening-tag line → REFUSE');
  // A backtick inside a quoted string used to flip parity for the rest of the file, putting a
  // `//` INSIDE the CSS where it is not a comment.
  const poisoned = 'const s = "a ` b";\nexport const B = styled.div`\n  color: #ef4444;\n`;';
  assert.match(commentFormFor('x.ts', poisoned, ...at(poisoned, 2)), /^\/\* /, 'still recognised as CSS template');
  // Positively classifiable contexts still tag.
  const jsxChild = "const A = () => (\n  <p>{e && <B style={{ color: '#ef4444' }}>x</B>}</p>\n);";
  assert.match(commentFormFor('x.tsx', jsxChild, ...at(jsxChild, 1)), /^\{\/\* /);
  const plain = "const c = '#ef4444';";
  assert.match(commentFormFor('x.ts', plain, ...at(plain, 0)), /^\/\/ /);
});

test('drift-lint R6: the four ways past the first version are all closed (own probe, before the panel named them)', () => {
  // A standing law that only recognises one syntax is not a standing law.
  const bypasses = {
    'attrs': 'const B = styled(ForgeButton).attrs({})`background: red;`;',
    'withConfig': 'const C = styled(ForgeButton).withConfig({})`background: red;`;',
    'object styles': 'const F = styled(ForgeButton)({ background: "red" });',
    'newline before tick': 'const H = styled(ForgeButton)\n  `background: red;`;',
    're-extended wrapper': 'const D = styled(ForgeButton)`margin: 0;`;\nconst E = styled(D)`background: red;`;',
  };
  for (const [name, src] of Object.entries(bypasses)) {
    const hits = lintText('x.tsx', src, { isConsumer: true }).filter((v) => v.rule === 'R6');
    assert.equal(hits.length, 1, `${name} must raise exactly one R6`);
  }
  // Object-styles syntax is flagged because it cannot be audited — "cannot verify" is not "fine".
  assert.match(lintText('x.tsx', bypasses['object styles'], { isConsumer: true })[0].detail, /cannot be audited statically/);
  // A transitively-extended wrapper names its chain so the reader knows why it was caught.
  assert.match(lintText('x.tsx', bypasses['re-extended wrapper'], { isConsumer: true })[0].detail, /transitively wraps ForgeButton/);
  // ...and a layout-only chain stays clean through the same paths.
  const clean = 'const A = styled(ForgeButton).attrs({ type: "button" })`margin-top: 1rem;`;\nconst Z = styled(A)`flex: 1;`;';
  assert.equal(lintText('x.tsx', clean, { isConsumer: true }).filter((v) => v.rule === 'R6').length, 0);
});

test('GOLDEN: the layout allow-list is pinned — widening the boundary must be a reviewed diff', async () => {
  // The entire governance boundary reduces to one list. Adding a property to it was a one-line
  // edit with no failing fixture (Ox T2-R2 N3b). This pins the exact set AND asserts the regex
  // agrees with it, so widening either half without the other turns red.
  const { LAYOUT_ALLOWED_PROPS, styledWrapperBlocker } = await import('../scripts/codemod-glowbutton.mjs');
  assert.deepEqual([...LAYOUT_ALLOWED_PROPS].sort(), [
    'align-self', 'flex', 'flex-basis', 'flex-grow', 'flex-shrink',
    'grid-area', 'grid-column', 'grid-column-end', 'grid-column-start',
    'grid-row', 'grid-row-end', 'grid-row-start', 'justify-self',
    'margin', 'margin-block', 'margin-block-end', 'margin-block-start',
    'margin-bottom', 'margin-inline', 'margin-inline-end', 'margin-inline-start',
    'margin-left', 'margin-right', 'margin-top', 'order', 'place-self',
  ], 'the allow-list changed — is this a deliberate, reviewed widening of the rule-84 boundary?');
  for (const p of LAYOUT_ALLOWED_PROPS) assert.equal(styledWrapperBlocker(`${p}: 0;`), null, `${p} is on the manifest but the matcher blocks it`);
  // The sanctioned token surface is the --sw-btn-* namespace, NOT the whole --sw- family.
  assert.equal(styledWrapperBlocker('--sw-btn-height: 40px;'), null);
  assert.match(styledWrapperBlocker('--sw-accent: red;'), /outside the published --sw-btn-\* override surface/);
  assert.match(styledWrapperBlocker('--brand-x: red;'), /outside the published/);
});

test('allow-list VALUE seams: a length flex-basis is sizing; min-width:0 is the flex-overflow fix', async () => {
  // The name-only check locked `width: 300px` out the front door and left `flex: 0 0 320px`
  // open at the back — flex-basis IS the main-axis size (GLM T2-R2 §3). And blocking
  // `min-width: 0` made every real flex row cost a manual decision for a property that sets
  // no size at all.
  const { styledWrapperBlocker } = await import('../scripts/codemod-glowbutton.mjs');
  for (const ok of ['flex: 1;', 'flex: 1 1 auto;', 'min-width: 0;', 'min-width: 0px;', 'min-inline-size: 0;']) {
    assert.equal(styledWrapperBlocker(ok), null, `${ok} is layout`);
  }
  for (const no of ['flex: 0 0 320px;', 'flex: 0 0 20%;', 'min-width: 300px;', 'min-inline-size: 20rem;']) {
    assert.ok(styledWrapperBlocker(no), `${no} is sizing and must block`);
  }
  assert.match(styledWrapperBlocker('flex: 0 0 320px;'), /main-axis SIZING/);
});

test('tagger lexer: a regex literal containing a backtick must NOT poison template state (GLM T2-R2 §5)', async () => {
  const { lexStateAt, commentFormFor } = await import('../scripts/tag-legacy-hex.mjs');
  const at = (src, ln) => { const l = src.split('\n'); let a = 0; for (let i = 0; i < ln; i++) a += l[i].length + 1; return a; };
  // Without regex-literal state, `/^`{3}/m` opens a template that never closes, and every later
  // line lexes as CSS — so a JSX line receives a bare /* */ that renders as visible text.
  for (const src of [
    'const FENCE = /^`{3}/m;\nconst X = () => (\n  <p>Pay by #ef4444 card</p>\n);',
    "const s = t.replace(/`/g, '');\nconst Y = () => (\n  <p>Pay by #ef4444 card</p>\n);",
    "const q = /it's/;\nconst Z = '#ef4444';",
  ]) {
    const ln = src.split('\n').length - 2;
    assert.equal(lexStateAt(src, at(src, ln)), 'normal', 'regex literal must not leave us inside a template');
  }
  const jsx = 'const FENCE = /^`{3}/m;\nconst X = () => (\n  <p>Pay by #ef4444 card</p>\n);';
  const form = commentFormFor('x.tsx', jsx, at(jsx, 2), jsx.split('\n')[2]);
  assert.ok(form === null || form.startsWith('{/*'), 'never the bare /* */ form in JSX children');
});
