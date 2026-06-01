import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const componentPath = resolve(__dirname, './VoiceMemoUpload.tsx');
const stylesPath = resolve(__dirname, './VoiceMemoUpload.styles.ts');

const componentSource = readFileSync(componentPath, 'utf8');
const stylesSource = existsSync(stylesPath) ? readFileSync(stylesPath, 'utf8') : '';
const combinedSource = `${componentSource}\n${stylesSource}`;

function lineCount(source: string): number {
  return source.trimEnd().split(/\r?\n/).length;
}

describe('VoiceMemoUpload extraction and action contract', () => {
  it('keeps review actions explicit non-submit buttons with touch-safe sizing', () => {
    expect(componentSource.match(/type="button"/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
    expect(combinedSource).toMatch(/const ActionButton = styled\.button[\s\S]*min-height: 44px;/);
    expect(combinedSource).toMatch(/const ActionButton = styled\.button[\s\S]*&:focus-visible/);
  });

  it('keeps style bulk extracted and every active file under the project cap', () => {
    expect(existsSync(stylesPath)).toBe(true);
    expect(componentSource).not.toMatch(/import styled/);
    expect(lineCount(componentSource)).toBeLessThanOrEqual(300);
    expect(lineCount(stylesSource)).toBeLessThanOrEqual(300);
  });

  it('keeps parsed pain flag rows keyed by their safety evidence, not array position', () => {
    expect(componentSource).not.toMatch(/painFlags\.map\(\(flag, i\)[\s\S]*?<PainFlag key=\{i\}/);
    expect(componentSource).toContain('voiceMemoPainFlagKey');
  });
});
