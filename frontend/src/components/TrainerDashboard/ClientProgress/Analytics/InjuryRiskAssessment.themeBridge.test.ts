import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readSource = (relativePath: string) => readFileSync(
  resolve(__dirname, relativePath),
  'utf8',
);

describe('InjuryRiskAssessment theme bridge', () => {
  it('keeps injury risk assessment under the line cap with extracted styles and logic', () => {
    const source = readSource('./InjuryRiskAssessment.tsx');
    const viewSource = readSource('./InjuryRiskAssessmentView.tsx');
    const styleSource = readSource('./InjuryRiskAssessment.styles.ts');
    const logicSource = readSource('./InjuryRiskAssessment.logic.ts');

    expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(viewSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(styleSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(logicSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(viewSource).toContain("from './InjuryRiskAssessment.styles'");
    expect(viewSource).toContain("from './InjuryRiskAssessment.logic'");
    expect(existsSync(resolve(__dirname, './InjuryRiskAssessment.styles.ts'))).toBe(true);
    expect(existsSync(resolve(__dirname, './InjuryRiskAssessment.logic.ts'))).toBe(true);
  });

  it('bridges injury risk assessment styling to dashboard theme tokens', () => {
    const styleSource = readSource('./InjuryRiskAssessment.styles.ts');

    expect(styleSource).toContain('var(--bg-elevated');
    expect(styleSource).toContain('var(--text-primary');
    expect(styleSource).toContain('var(--text-secondary');
    expect(styleSource).toContain('var(--accent-primary');
    expect(styleSource).toContain('var(--shadow-strong');

    expect(styleSource).not.toContain('color: #e2e8f0');
    expect(styleSource).not.toContain('color: #94a3b8');
    expect(styleSource).not.toContain('color: #fff');
    expect(styleSource).not.toContain('color: #60C0F0');
    expect(styleSource).not.toContain('rgba(15, 23, 42');
    expect(styleSource).not.toContain('rgba(255, 255, 255');
    expect(styleSource).not.toContain('rgba(0, 0, 0');
    expect(styleSource).not.toContain('rgba(96, 192, 240');
  });
});
