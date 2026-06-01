import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('CoachCommandCenter theme bridge', () => {
  it('uses CSS variable fallback tokens for queue metric accents', () => {
    const logicSource = readFileSync(resolve(__dirname, 'CoachCommandCenter.logic.ts'), 'utf8');

    expect(logicSource).not.toMatch(/accent:\s*'#[0-9a-fA-F]{3,8}'/);
    expect(logicSource).toContain("accent: 'var(--accent-primary, #60c0f0)'");
    expect(logicSource).toContain("accent: 'var(--success, #47e89a)'");
    expect(logicSource).toContain("accent: 'var(--accent-gold, #c6a84b)'");
    expect(logicSource).toContain("accent: 'var(--error, #ff6d85)'");
  });
});
