/**
 * Contract: the user tree's world bridge CONSUMES, never emits.
 *
 * LAW 8 REFINEMENT 6 draws a hard line: a design surface reads --world-* through
 * one bridge; emitting or modifying those names, SurfaceLensGate, makeLensFrame
 * or AppearanceProfile belongs to the World Engine. A surface that starts
 * emitting turns a token contract into two competing sources of truth.
 *
 * Every scan below strips comments first. A doc comment that NAMES the forbidden
 * thing — as this file and the bridge both do — is documentation, not a
 * violation; a contract that greps prose convicts the compliant file.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const dir = 'src/components/UserDashboard';
const stripComments = (src: string): string =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, ''))
    .join('\n');

const bridgeCode = stripComments(
  readFileSync(resolve(process.cwd(), `${dir}/userDashboard.tokens.ts`), 'utf8'),
);

describe('user dashboard world bridge', () => {
  it('every token falls back to what the tree already renders', () => {
    const reads = [...bridgeCode.matchAll(/var\(--world-[a-z-]+,\s*var\(--[a-z-]+,\s*[^)]+\)\)/g)];
    expect(reads.length).toBeGreaterThanOrEqual(3);
  });

  it('reads only world tokens the engine actually emits', () => {
    const used = new Set([...bridgeCode.matchAll(/--world-[a-z-]+/g)].map((m) => m[0]));
    // Confirmed consumed in the trainer tree today (clientCardSystem.ts et al).
    const known = new Set(['--world-accent', '--world-panel-radius', '--world-row-radius']);
    expect([...used].filter((t) => !known.has(t))).toEqual([]);
  });

  it('the tree emits no world token and touches no engine primitive', () => {
    const walk = (d: string): string[] =>
      readdirSync(resolve(process.cwd(), d), { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
    const sources = walk(dir).filter((f) => /\.tsx?$/.test(f) && !/\.test\./.test(f));
    // An EMITTER writes the custom property; a consumer only reads it in var().
    const emits = /--world-[a-z-]+\s*:/;
    const engineOwned = /SurfaceLensGate|makeLensFrame|AppearanceProfile/;
    const offenders = sources.filter((f) => {
      const code = stripComments(readFileSync(resolve(process.cwd(), f), 'utf8'));
      return emits.test(code) || engineOwned.test(code);
    });
    expect(offenders).toEqual([]);
  });
});
