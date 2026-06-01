import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const detailStylesSource = readFileSync(
  resolve(__dirname, './MasterDetailDetailStyles.ts'),
  'utf8',
);

describe('ClientDetailView theme bridge', () => {
  it('keeps active detail navigation styling on theme tokens instead of raw cyan values', () => {
    expect(detailStylesSource).toContain('var(--accent-primary, #60C0F0)');
    expect(detailStylesSource).toContain('color-mix(in srgb, var(--accent-primary, #60C0F0)');
    expect(detailStylesSource).not.toContain("($active ? '#60C0F0'");
    expect(detailStylesSource).not.toContain('outline: 2px solid #60C0F0');
    expect(detailStylesSource).not.toContain("'rgba(96, 192, 240,");
    expect(detailStylesSource).not.toContain('background: rgba(96, 192, 240,');
    expect(detailStylesSource).not.toContain('border-bottom: 1px solid rgba(224, 236, 244, 0.08)');
  });
});
