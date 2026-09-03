/**
 * Card 1.4 — the wrong-client guard has a RENDERING consumer.
 *
 * `intentBarState.ts` was written after a wrong-client write reached production
 * on a destructive command. It was correct, it was tested, and for six weeks it
 * was imported by nothing but its own test file — so the guarantee existed only
 * in the suite. "Exists" is not "renders"; this asserts the difference.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(__dirname, '..', '..');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

const files = walk(SRC);
const importers = files.filter((f) => /from '.*intentBarState'/.test(readFileSync(f, 'utf8')));

describe('intentBarState has a real consumer', () => {
  it('at least one NON-TEST module imports it', () => {
    expect(importers.map((f) => path.relative(SRC, f))).not.toEqual([]);
  });

  it('a COMPONENT (.tsx) imports it — a util importing a util proves nothing about rendering', () => {
    expect(importers.some((f) => f.endsWith('.tsx'))).toBe(true);
  });

  it('the component that imports it renders the chip tone it computes', () => {
    const component = importers.find((f) => f.endsWith('.tsx'));
    const src = readFileSync(component as string, 'utf8');
    expect(src).toMatch(/chipTone/);
    expect(src).toMatch(/identityCrossing/);
  });
});
