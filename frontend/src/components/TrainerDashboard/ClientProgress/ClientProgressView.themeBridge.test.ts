import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const viewPath = resolve(__dirname, './ClientProgressView.tsx');
const stylesPath = resolve(__dirname, './ClientProgressView.styles.ts');
const sparklinePath = resolve(__dirname, './ClientProgressSparkline.tsx');

describe('ClientProgressView theme bridge', () => {
  it('keeps the overview surface under the line cap with extracted styles and chart chrome', () => {
    const source = readFileSync(viewPath, 'utf8');

    expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(source).toContain("from './ClientProgressView.styles'");
    expect(existsSync(stylesPath)).toBe(true);
    expect(existsSync(sparklinePath)).toBe(true);
  });

  it('bridges the overview surface to dashboard theme tokens', () => {
    const styleSource = readFileSync(stylesPath, 'utf8');
    const sparklineSource = readFileSync(sparklinePath, 'utf8');

    expect(styleSource).toContain('var(--bg-elevated');
    expect(styleSource).toContain('var(--text-primary');
    expect(styleSource).toContain('var(--text-secondary');
    expect(styleSource).toContain('var(--accent-primary');
    expect(styleSource).toContain('var(--shadow-strong');
    expect(sparklineSource).toContain('var(--chart-primary');

    expect(styleSource).not.toContain("from '../../../theme/tokens'");
    expect(styleSource).not.toContain('rgba(12, 14, 24');
    expect(styleSource).not.toContain('rgba(139, 92, 246');
    expect(sparklineSource).not.toContain('stroke="#50A0F0"');
    expect(sparklineSource).not.toContain('floodColor="#50A0F0"');
  });
});
