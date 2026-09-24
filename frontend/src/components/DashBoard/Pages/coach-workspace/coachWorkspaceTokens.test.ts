/**
 * Rule 6 + brain-v4 J14 guard: every colour in coach-workspace/** is a token.
 * The ONLY literal colours allowed are the dark-first fallbacks inside
 * var(--x, #fallback) in workspaceTokens.ts. A new hex/rgb/hsl/named colour in
 * any other workspace file is a sync bug (it would ignore the header theme
 * changer and the lens), so it fails here.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));
const sources = readdirSync(dir).filter((name) => /\.(ts|tsx)$/.test(name) && !/\.test\./.test(name));
const COLOUR = /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(|\b(?:black|white|red|blue|green|gray|grey)\b(?=\s*[;,)])/gi;

/** Remove every var(--x, <fallback>) so only colours OUTSIDE a fallback remain. */
function stripVarFallbacks(css: string): string {
  let out = css;
  for (let i = 0; i < 6; i += 1) out = out.replace(/var\(--[\w-]+,\s*[^()]*(?:\([^()]*\)[^()]*)*\)/g, 'var(--x)');
  return out;
}

describe('coach workspace colour tokens', () => {
  it('scans real files (positive control)', () => {
    expect(sources).toContain('workspaceTokens.ts');
    expect(sources.length).toBeGreaterThan(10);
  });

  it('workspaceTokens.ts has literals ONLY as var() fallbacks', () => {
    const src = readFileSync(join(dir, 'workspaceTokens.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(src.match(COLOUR)?.length ?? 0).toBeGreaterThan(5); // fallbacks exist (control)
    expect(stripVarFallbacks(src).match(COLOUR) ?? []).toEqual([]);
  });

  it('no other workspace file contains a literal colour', () => {
    const offenders = sources
      .filter((name) => name !== 'workspaceTokens.ts')
      .flatMap((name) => {
        const code = readFileSync(join(dir, name), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
        return (code.match(COLOUR) ?? []).map((hit) => `${name}: ${hit}`);
      });
    expect(offenders).toEqual([]);
  });

  it('CONTROL: the detector catches a literal outside a fallback', () => {
    expect(stripVarFallbacks('color: #fff; background: var(--a, #000);').match(COLOUR)).toEqual(['#fff']);
  });
});
