import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SOURCE = fs.readFileSync(path.resolve(__dirname, 'CrystallineLockOverlay.tsx'), 'utf8');

const getStyledBlock = (source: string, componentName: string): string => {
  const start = source.indexOf(`const ${componentName} = styled.`);
  expect(start).toBeGreaterThanOrEqual(0);

  const rest = source.slice(start);
  const nextComponent = rest.search(/\r?\n\r?\nconst [A-Z][A-Za-z0-9]+ = styled\./);
  return nextComponent === -1 ? rest : rest.slice(0, nextComponent);
};

describe('CrystallineLockOverlay touch targets', () => {
  it('keeps the premium CTA at the project 44px minimum', () => {
    const configureButtonSource = getStyledBlock(SOURCE, 'ConfigureButton');

    expect(configureButtonSource).toMatch(/display:\s*inline-flex/);
    expect(configureButtonSource).toMatch(/align-items:\s*center/);
    expect(configureButtonSource).toMatch(/min-height:\s*44px/);
    expect(configureButtonSource).toMatch(/min-width:\s*44px/);
  });
});