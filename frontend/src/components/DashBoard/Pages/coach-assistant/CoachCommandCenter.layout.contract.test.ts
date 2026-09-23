import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const styles = readFileSync(resolve(__dirname, './CoachCommandCenter.crystallineFocusStyles.ts'), 'utf8');

describe('Coach Command Center conversation layout contract', () => {
  it('bounds the transcript to the viewport so the composer remains reachable', () => {
    expect(styles).toMatch(/\.tab-content \{[\s\S]*?min-height: 0;/);
    expect(styles).toContain('overflow: hidden;');
    expect(styles).toContain('max-height: calc(100dvh - 520px);');
  });
});
