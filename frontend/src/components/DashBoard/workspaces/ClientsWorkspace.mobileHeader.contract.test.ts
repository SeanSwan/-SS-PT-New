import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const styles = readFileSync(resolve(__dirname, './ClientsWorkspace.styles.ts'), 'utf8');

describe('ClientsWorkspace mobile selected-client header contract', () => {
  it('suppresses the duplicate full client card on small selected-client detail screens', () => {
    expect(styles).toContain('> section + *');
    expect(styles).toContain('display: none;');
  });
});
