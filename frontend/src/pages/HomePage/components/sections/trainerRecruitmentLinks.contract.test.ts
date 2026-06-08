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

describe('public trainer recruitment links', () => {
  it('does not route public visitors into privileged trainer self-registration', () => {
    expect(heroSource).not.toContain('/signup?role=trainer');
    expect(trainersSource).not.toContain('/signup?role=trainer');
  });

  it('keeps trainer interest routed through SwanStudios staff contact', () => {
    expect(heroSource).toContain("to: '/contact'");
    expect(trainersSource).toContain("navigate('/contact')");
  });
});
