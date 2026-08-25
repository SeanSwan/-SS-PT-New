/** @swan/forge — codemod self-test. The fixture is the exact break PR #2's build caught. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transform } from '../scripts/codemod-glowbutton.mjs';

const FILE = 'frontend/src/pages/x/Y.tsx';

test('codemod: import swap + tag rename; arrow functions inside props survive', () => {
  const src = `import GlowButton from '../../components/ui/buttons/GlowButton';
export const A = () => <GlowButton text="Go" variant="gilded" onClick={() => navigate('/x')} />;
export const B = () => <GlowButton theme="neonBlue" size="large" onClick={(e) => e.preventDefault()}>Join</GlowButton>;`;
  const { out, report } = transform(src, FILE);
  assert.ok(out.includes("import ForgeButton from '"), 'import swapped');
  assert.ok(!/\bGlowButton\b(?!\))/.test(out.replace(/\/\/.*$/gm, '')), 'no GlowButton identifiers remain outside comments');
  assert.ok(out.includes(`onClick={() => navigate('/x')}`), 'arrow inside prop untouched');
  assert.ok(out.includes('</ForgeButton>'));
  assert.equal(report.tags, 2);
  assert.equal(report.unknown.size, 0);
});

test('codemod: StyledBox-as pattern converts (self-closing AND paired) while OTHER StyledBox usages are left alone', () => {
  const src = `import GlowButton from './GlowButton';
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
  const src = `import GlowButton from './GlowButton';
const X = () => <GlowButton text="Start Your Journey" pulse haptic animateOnRender glowIntensity="high" magic="yes" onClick={() => go('/a b')} />;`;
  const { report } = transform(src, FILE);
  assert.deepEqual([...report.dropped].sort(), ['glowIntensity', 'haptic', 'pulse']);
  assert.deepEqual([...report.unknown], ['magic'], '"Your"/"Journey" inside a string value are NOT props');
});

test('codemod: no GlowButton → no change, no report noise', () => {
  const src = `export const Z = () => <button>plain</button>;`;
  const { out, report } = transform(src, FILE);
  assert.equal(out, src);
  assert.equal(report.tags + report.imports + report.styledBoxAs, 0);
});
