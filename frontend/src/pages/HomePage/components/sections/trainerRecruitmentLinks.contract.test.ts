import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const heroSource = readFileSync(
  resolve(process.cwd(), 'src/pages/HomePage/components/sections/HeroSection.tsx'),
  'utf8',
);
const trainersSource = readFileSync(
  resolve(process.cwd(), 'src/pages/HomePage/components/sections/TrainersSection.tsx'),
  'utf8',
);
// RE-ANCHOR (2026-09-02, finding H5): the quick-nav pills — including the
// "Trainer Staff Review" → /contact link this contract guards — moved from the
// hero to QuickLinksStrip. The contract's INTENT is unchanged: trainer interest
// routes through staff contact, and no public surface links privileged trainer
// self-registration. The self-registration ban now covers all three files.
const quickLinksSource = readFileSync(
  resolve(process.cwd(), 'src/pages/HomePage/components/sections/QuickLinksStrip.tsx'),
  'utf8',
);

describe('public trainer recruitment links', () => {
  it('does not route public visitors into privileged trainer self-registration', () => {
    expect(heroSource).not.toContain('/signup?role=trainer');
    expect(trainersSource).not.toContain('/signup?role=trainer');
    expect(quickLinksSource).not.toContain('/signup?role=trainer');
  });

  it('keeps trainer interest routed through SwanStudios staff contact', () => {
    expect(quickLinksSource).toContain("to: '/contact'");
    expect(trainersSource).toContain("navigate('/contact')");
  });

  it('the hero itself no longer carries the quick-nav pills (finding H5)', () => {
    expect(heroSource).not.toContain('Trainer Staff Review');
    expect(heroSource).not.toContain('CapsuleRow');
  });
});
