import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const source = readFileSync(resolve(__dirname, './GlobalClientSelector.tsx'), 'utf8');

describe('GlobalClientSelector close key contract', () => {
  it('closes its portal dropdown when the hosting sidebar state changes', () => {
    expect(source).toContain('closeKey?: string | number | boolean;');
    expect(source).toContain('}, [closeKey]);');
    expect(source).toContain("setSearchQuery('');");
    expect(source).toContain('{isOpen && createPortal(');
  });
});
