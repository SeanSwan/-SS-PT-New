/**
 * Contract: LAW 4 — nature enters as light behaviour, never as animal form.
 *
 * The Arsenal section rendered a literal winged-swan illustration on the
 * highest-traffic surface in the product. The swan lives in the Crystallize and
 * nowhere else; facets imply the bird, you never draw the bird. Until the
 * caustic asset is generated (Blueprint v2 S6), the section renders its
 * substrate alone — an empty substrate is on-law, a creature is not.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const dir = 'src/pages/HomePage/components/sections';
const arsenal = readFileSync(resolve(process.cwd(), `${dir}/ArsenalSection.tsx`), 'utf8');
/** Comments may NAME the retired asset (that is the record); code may not use it. */
const codeOf = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');

describe('optics, not creatures', () => {
  it('the Arsenal no longer renders the winged-swan asset', () => {
    expect(codeOf(arsenal)).not.toContain('features-swan-bg');
  });

  it('it renders a caustic substrate instead', () => {
    expect(arsenal).toContain('CausticSubstrate');
  });

  it('the substrate renders on every tier — balanced/essential are not left bare', () => {
    const code = codeOf(arsenal);
    const at = code.indexOf('<CausticSubstrate');
    expect(at).toBeGreaterThan(-1);
    // No `isFull &&` gate immediately preceding the substrate.
    expect(code.slice(Math.max(0, at - 120), at)).not.toMatch(/isFull\s*&&\s*\($/);
    // The parallax drift IS still tier-gated — motion is what a tier governs.
    expect(code).toMatch(/motionStyleProps\(isFull \?/);
  });

  it('the retired illustrated-creature asset is referenced by no section', () => {
    // Scoped to the VERIFIED violation. features-swan-bg.png was opened and is
    // an illustrated crystalline swan with spread wings over an aurora and
    // star-bokeh field — LAW 4 (creature form) plus LAW 3 (purple-cyan wash,
    // AI-fantasy energy) in one asset.
    //
    // Deliberately NOT banned here: hero-swan-bg.png and testimonials-swan-bg.png
    // were also opened and are PHOTOGRAPHS of a real swan on water. Sean's
    // standing decision keeps the photographic Swans hero, and this contract
    // does not overrule a human decision on evidence it never examined. The
    // testimonials backdrop is recorded as an open LAW-3 question (its Milky Way
    // is a purple-cyan wash) — a question for Sean, not a silent deletion.
    const files = readdirSync(resolve(process.cwd(), dir))
      .filter((f) => /\.tsx$/.test(f) && !/\.test\./.test(f));
    const offenders = files.filter((f) =>
      codeOf(readFileSync(resolve(process.cwd(), `${dir}/${f}`), 'utf8')).includes('features-swan-bg'));
    expect(offenders).toEqual([]);
  });
});
