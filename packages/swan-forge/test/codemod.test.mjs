/** @swan/forge — codemod self-test. Fixture 2 is the exact break PR #2's build caught;
 *  the PR #2 panel fixtures (Ox + GLM + own pass) each lock one silent-damage vector. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transform, maskedRegions, residualGlowButton } from '../scripts/codemod-glowbutton.mjs';

const FILE = 'frontend/src/pages/x/Y.tsx';
const IMPORT = `import GlowButton from '../../components/ui/buttons/GlowButton';`;

test('codemod: import swap + tag rename; arrow functions inside props survive', () => {
  const src = `${IMPORT}
export const A = () => <GlowButton text="Go" variant="gilded" onClick={() => navigate('/x')} />;
export const B = () => <GlowButton theme="neonBlue" size="large" onClick={(e) => e.preventDefault()}>Join</GlowButton>;`;
  const { out, report } = transform(src, FILE);
  assert.ok(out.includes("import ForgeButton from '"), 'import swapped');
  assert.equal(residualGlowButton(out).length, 0, 'no GlowButton identifiers remain outside comments');
  assert.ok(out.includes(`onClick={() => navigate('/x')}`), 'arrow inside prop untouched');
  assert.ok(out.includes('</ForgeButton>'));
  assert.equal(report.tags, 2);
  assert.equal(report.unknown.size, 0);
  assert.equal(report.errors.length + report.skipped.length, 0);
});

test('codemod: StyledBox-as pattern converts (self-closing AND paired) while OTHER StyledBox usages are left alone', () => {
  const src = `${IMPORT}
import { StyledBox } from '@/components/ui/StyledBox';
const Card = () => (
  <StyledBox as="section" $style={{ padding: 8 }}>
    <StyledBox as={GlowButton} colorScheme="accent" onClick={() => go('/shop')} $style={{ width: '100%', minHeight: '44px' }}>
      Get Started
    </StyledBox>
    <StyledBox as={GlowButton} text="Quick" $style={{ minWidth: 200 }} />
    <StyledBox as="p">unrelated</StyledBox>
  </StyledBox>
);`;
  const { out, report } = transform(src, FILE);
  assert.equal(report.styledBoxAs, 2);
  assert.ok(out.includes(`<ForgeButton colorScheme="accent" onClick={() => go('/shop')} style={{ width: '100%' }}>`), 'paired open converted, $style→style, legacy minHeight:44px floor hack stripped');
  assert.ok(out.includes('Get Started\n    </ForgeButton>'), 'ONLY the paired close was rewritten');
  assert.ok(out.includes(`<ForgeButton text="Quick" style={{ minWidth: 200 }} />`), 'self-closing converted');
  assert.ok(out.includes('<StyledBox as="section"'), 'unrelated StyledBox open untouched');
  assert.ok(out.includes('<StyledBox as="p">unrelated</StyledBox>'), 'unrelated paired StyledBox untouched');
  assert.equal((out.match(/<\/StyledBox>/g) || []).length, 2, 'the two unrelated closes survive');
  assert.equal((out.match(/<\/ForgeButton>/g) || []).length, 1);
});

test('codemod: dropped-by-binding props reported; animateOnRender SUPPORTED; unknown props flagged; words in string values are not props', () => {
  const src = `${IMPORT}
const X = () => <GlowButton text="Start Your Journey" pulse haptic animateOnRender glowIntensity="high" magic="yes" onClick={() => go('/a b')} />;`;
  const { report } = transform(src, FILE);
  assert.deepEqual([...report.dropped].sort(), ['glowIntensity', 'haptic', 'pulse']);
  assert.deepEqual([...report.unknown], ['magic'], '"Your"/"Journey" inside a string value are NOT props');
});

test('codemod: a "}" inside a STRING within an expression must not desync the scanner (old scanner: tags=0, import swapped → silent broken build)', () => {
  // Verified red on the pre-fix scanner (PR #2 own hostile pass): the string's "}" dropped depth
  // to 0, the closing quote then opened a phantom string, and EVERY later tag was skipped.
  const src = `${IMPORT}
const X = () => <GlowButton text="Go" onClick={() => go('x}')} />;
const Y = () => <GlowButton text="Two" />;`;
  const { out, report } = transform(src, FILE);
  assert.equal(report.tags, 2, 'both tags found');
  assert.equal((out.match(/<\/?GlowButton/g) || []).length, 0, 'no GlowButton tag left behind');
  assert.ok(out.includes(`<ForgeButton text="Go" onClick={() => go('x}')} />`), 'expression untouched');
});

test('codemod (GLM 1b): comments inside an open tag — a ">" in a comment is not the tag end', () => {
  const src = `${IMPORT}
const X = () => (
  <GlowButton // go -> /shop
    text="Go" /* a > b */ onClick={() => go('/shop')}
  >Go</GlowButton>
);`;
  const { out, report } = transform(src, FILE);
  assert.equal(report.tags, 1);
  assert.ok(out.includes('<ForgeButton // go -> /shop'), 'open renamed, comment kept');
  assert.ok(out.includes('>Go</ForgeButton>'), 'real close renamed');
  assert.equal(residualGlowButton(out).length, 0);
});

test('codemod (Ox 1b): matches inside template literals / block comments / line comments are NOT rewritten', () => {
  const src = `${IMPORT}
export const DOCS = \`Embed: <GlowButton text="Hi" />\`;
/* legacy: <GlowButton text="old" /> */
// <GlowButton text="note" />
const X = () => <GlowButton text="Real" />;`;
  const { out, report } = transform(src, FILE);
  assert.equal(report.tags, 1, 'only the real tag counts');
  assert.ok(out.includes('Embed: <GlowButton text="Hi" />'), 'template literal untouched');
  assert.ok(out.includes('/* legacy: <GlowButton text="old" /> */'), 'block comment untouched');
  assert.ok(out.includes('<ForgeButton text="Real" />'));
  assert.equal(report.skipped.length, 3, 'each masked match is reported, not silently ignored');
});

test('codemod (GLM 1c/1d): nested paired same-tag opens are SKIPPED + reported, never mis-paired; "</Tag >" closes are found', () => {
  const nested = `${IMPORT}
const X = () => <GlowButton text="outer"><GlowButton text="inner">x</GlowButton></GlowButton>;`;
  const r1 = transform(nested, FILE);
  assert.equal(r1.report.tags, 1, 'inner (unambiguous) is converted; outer is skipped');
  assert.ok(r1.report.skipped.some((s) => /nests another paired/.test(s)));
  assert.ok(r1.out.includes('<ForgeButton text="inner">x</ForgeButton>'));
  assert.ok(r1.out.includes('<GlowButton text="outer">'), 'outer left for manual migration');
  assert.ok(r1.report.residual.length > 0, 'residual invariant flags the skipped outer tag');
  const spaced = `${IMPORT}
const Y = () => <GlowButton text="Go">Go</GlowButton >;`;
  const r2 = transform(spaced, FILE);
  assert.ok(r2.out.includes('<ForgeButton text="Go">Go</ForgeButton>'), 'whitespace-before-">" close is paired and renamed');
  assert.equal(residualGlowButton(r2.out).length, 0);
});

test('codemod (GLM 1a hard-fail): an unterminated tag is an ERROR for the file, not a silent break', () => {
  const src = `${IMPORT}
const X = () => <GlowButton text="Go" onClick={() => go(`;
  const { out, report } = transform(src, FILE);
  assert.equal(out, src, 'file NOT transformed');
  assert.equal(report.errors.length, 1);
});

test('codemod (Ox 1a): spread props bypass the audit → reported', () => {
  const src = `${IMPORT}
const cta = { text: 'Join', pulse: true };
const X = () => <GlowButton {...cta} />;`;
  const { report } = transform(src, FILE);
  assert.ok(report.notes.some((n) => /spread props/.test(n)));
});

test('codemod (Ox 1c): a default import named GlowButton from a NON-legacy path is left alone and reported (import-hijack guard)', () => {
  const src = `import GlowButton from '../mocks/GlowButton';
const X = () => <GlowButton text="Go" />;`;
  const { out, report } = transform(src, FILE);
  assert.equal(report.imports, 0);
  assert.ok(out.includes("import GlowButton from '../mocks/GlowButton'"));
  assert.ok(report.notes.some((n) => /import-hijack/.test(n)));
  assert.ok(report.residual.length > 0, 'the untouched import is a residual → file is blocked');
});

test('codemod (GLM 1e): minHeight strip is digit-anchored — 440 is not rewritten to 0', () => {
  const src = `${IMPORT}
import { StyledBox } from '@/components/ui/StyledBox';
const X = () => <StyledBox as={GlowButton} text="Go" $style={{ minHeight: 440, x: 1 }} />;`;
  const { out } = transform(src, FILE);
  assert.ok(out.includes('style={{ minHeight: 440, x: 1 }}'), 'minHeight: 440 survives');
});

test('codemod (GLM 1f): residual GlowButton identifiers (named import, value position) block the file', () => {
  const src = `import GlowButton, { type GlowButtonProps } from '../../components/ui/buttons/GlowButton';
const M = motion(GlowButton);
const X = () => <GlowButton text="Go" />;`;
  const { report } = transform(src, FILE);
  assert.equal(report.imports, 0, 'the combined import form is not the rewritten shape');
  assert.ok(report.residual.length >= 2, 'residuals reported for the import + motion(GlowButton)');
});

test('codemod: maskedRegions covers template literals, comments AND same-line plain strings; an unterminated quote is JSX text, not a string', () => {
  const src = `const a = 'x'; // c\n/* b */ const t = \`q\`;\nconst J = () => <span>don't</span>; const D = \`tpl\`;`;
  const m = maskedRegions(src);
  assert.equal(m[src.indexOf("'x'") + 1], 1, 'closed plain string masked');
  assert.equal(m[src.indexOf('// c')], 1);
  assert.equal(m[src.indexOf('/* b */') + 3], 1);
  assert.equal(m[src.indexOf('`q`') + 1], 1);
  assert.equal(m[src.indexOf('</span>')], 0, "the apostrophe in don't does not mask the rest of the line");
  assert.equal(m[src.indexOf('`tpl`') + 1], 1, 'the template AFTER the apostrophe is still masked (GLM B2)');
});

test('codemod (Ox W1): a tag inside a plain string is never rewritten — bytes unchanged, SKIPPED reported', () => {
  const src = `${IMPORT}
const help = 'Try <GlowButton text="Hi" />';
const X = () => <GlowButton text="Real" />;`;
  const { out, report } = transform(src, FILE);
  assert.ok(out.includes(`const help = 'Try <GlowButton text="Hi" />';`), 'string bytes unchanged');
  assert.equal(report.tags, 1);
  assert.ok(report.skipped.length >= 1);
  assert.ok(out.includes('<ForgeButton text="Real" />'));
});

test('codemod (GLM B1): an import statement inside a template literal / comment is NOT rewritten', () => {
  const src = `${IMPORT}
const DOCS = \`Usage:
import GlowButton from '../ui/buttons/GlowButton';
<GlowButton text="x" />\`;
/* import GlowButton from '../ui/buttons/GlowButton'; */
const X = () => <GlowButton text="Real" />;`;
  const { out, report } = transform(src, FILE);
  assert.equal(report.imports, 1, 'only the real import is rewritten');
  assert.ok(out.includes(`import GlowButton from '../ui/buttons/GlowButton';\n<GlowButton text="x" />\``), 'template bytes unchanged');
  assert.ok(out.includes(`/* import GlowButton from '../ui/buttons/GlowButton'; */`), 'comment bytes unchanged');
  assert.ok(report.skipped.filter((s) => /import GlowButton/.test(s)).length === 2);
});

test('codemod (GLM B2): a JSX apostrophe followed by a template on the same line — the template stays masked', () => {
  const src = `${IMPORT}
const Note = () => <span>don't</span>; const DOCS = \`Embed: <GlowButton text="Hi" />\`;
const X = () => <GlowButton text="Real" />;`;
  const { out, report } = transform(src, FILE);
  assert.ok(out.includes('Embed: <GlowButton text="Hi" />'), 'template bytes unchanged');
  assert.equal(report.tags, 1);
});

test('codemod (GLM nit): escape-STATE in findTagEnd — an attr string ending in an escaped backslash closes correctly', () => {
  const src = `${IMPORT}
const X = () => <GlowButton text="Go" title={'C:\\\\'} onClick={() => go('/x')} />;
const Y = () => <GlowButton text="Two" />;`;
  const { report } = transform(src, FILE);
  assert.equal(report.tags, 2);
  assert.equal(report.errors.length, 0);
});

test('codemod (Ox W3): a </GlowButton> inside a comment never pairs with a real open', () => {
  const src = `${IMPORT}
const X = () => (
  <GlowButton text="Go">
    {/* </GlowButton> */}
    Go
  </GlowButton>
);`;
  const { out, report } = transform(src, FILE);
  assert.equal(report.tags, 1);
  assert.ok(out.includes('{/* </GlowButton> */}'), 'comment bytes unchanged');
  assert.ok(out.includes('Go\n  </ForgeButton>'), 'the real close was renamed');
});

test('codemod: no GlowButton → no change, no report noise', () => {
  const src = `export const Z = () => <button>plain</button>;`;
  const { out, report } = transform(src, FILE);
  assert.equal(out, src);
  assert.equal(report.tags + report.imports + report.styledBoxAs + report.residual.length, 0);
});
