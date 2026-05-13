import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const headerSource = readFileSync(resolve(__dirname, './header.tsx'), 'utf-8');
const navSource = readFileSync(resolve(__dirname, './components/NavigationLinks.tsx'), 'utf-8');
const logoSource = readFileSync(resolve(__dirname, './components/Logo.tsx'), 'utf-8');

describe('Header layout contract', () => {
  it('keeps the logo, navigation, and action icons in non-overlapping desktop columns', () => {
    expect(headerSource).toContain('display: grid;');
    expect(headerSource).toContain('grid-template-columns: auto minmax(0, 1fr) auto auto;');
    expect(headerSource).toContain('column-gap:');
    expect(navSource).toContain('min-width: 0;');
    expect(navSource).toContain('margin-left: 0;');
    expect(logoSource).toContain('flex-shrink: 0;');
  });
});
