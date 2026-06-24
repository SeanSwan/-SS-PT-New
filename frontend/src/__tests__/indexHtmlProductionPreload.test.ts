import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(__dirname, '..', '..');

describe('index.html production preload contract', () => {
  it('does not preload the Vite source entry directly', () => {
    const source = readFileSync(resolve(repoRoot, 'index.html'), 'utf8');

    expect(source).not.toContain('href="/src/main.jsx" as="script"');
    expect(source).toContain('<script type="module" src="/src/main.jsx"></script>');
  });
});
