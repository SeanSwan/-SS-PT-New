import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(__dirname, './ClientMeasurementPanel.tsx'), 'utf8');

describe('ClientMeasurementPanel theme contract', () => {
  it('keeps the measurement modal connected to Swan theme tokens', () => {
    expect(source).toContain('var(--accent-primary, #60C0F0)');
    expect(source).toContain('var(--bg-elevated, #141419)');
    expect(source).toContain('var(--text-muted');
    expect(source).not.toContain('background: linear-gradient(135deg, #60C0F0, #00c8ff)');
    expect(source).not.toContain('border-top-color: #60C0F0');
    expect(source).not.toContain("color: '#94a3b8'");
    expect(source).not.toContain('background: rgba(29, 31, 43, 0.98)');
  });
});
