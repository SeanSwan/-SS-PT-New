/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ SESSION SHELL — static law suite (Slice 0, tests-first).    │
 * │ Mandate M3 (anti-jump by structure): zero scrollIntoView,   │
 * │ zero scroll-behavior:smooth, zero window.scrollTo anywhere  │
 * │ in runner/** or runner/shell/**. Plus the standing runner   │
 * │ laws extended RECURSIVELY (the original harness reads only  │
 * │ the flat runner dir): no raw colors outside var()/color-mix │
 * │ in *.styles.ts, ≤300-line files, reduced-motion guards.     │
 * │ Source: SESSION-SHELL-HANDOFF-2026-07-30 §3 M3 + §5 floors. │
 * └─────────────────────────────────────────────────────────────┘
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const RUNNER_DIR = resolve(__dirname, '..');

/** Recursive source-file walk (tests excluded — they may QUOTE banned strings). */
function walkSources(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      out.push(...walkSources(full));
    } else if (/\.(ts|tsx)$/.test(name) && !name.includes('.test.')) {
      out.push(full);
    }
  }
  return out;
}

const files = walkSources(RUNNER_DIR);
const label = (file: string) => relative(RUNNER_DIR, file).replace(/\\/g, '/');

describe('M3 anti-jump static bans (runner/** + shell/**)', () => {
  it('scanned a real tree (non-vacuous guard)', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it('zero scrollIntoView calls — anti-jump is structural, not conventional', () => {
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      expect(source, `${label(file)} calls scrollIntoView — banned in shell code (M3)`)
        .not.toMatch(/\.scrollIntoView\s*\(/);
    }
  });

  it('zero scroll-behavior: smooth — programmatic scrolls must be instant', () => {
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      expect(source, `${label(file)} declares scroll-behavior: smooth — banned in shell code (M3)`)
        .not.toMatch(/scroll-behavior:\s*smooth/);
    }
  });

  it('zero window.scrollTo — the stage canvas is the only scroller', () => {
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      expect(source, `${label(file)} calls window.scrollTo — the page never scrolls (M3)`)
        .not.toMatch(/window\.scrollTo\s*\(/);
    }
  });
});

describe('standing runner laws, extended recursively into shell/', () => {
  it('no raw hex/rgb color literals outside var() fallbacks or color-mix in styles', () => {
    for (const file of files.filter((f) => /\.styles\.ts$/.test(f) || /recipes[\\/].+\.ts$/.test(f))) {
      const source = readFileSync(file, 'utf8');
      const offenders = source
        .split('\n')
        .filter((line) => /#[0-9A-Fa-f]{3,8}\b|rgba?\(/.test(line))
        .filter((line) => !/var\(--|color-mix\(/.test(line));
      expect({ file: label(file), offenders }).toEqual({ file: label(file), offenders: [] });
    }
  });

  it('every file honors the 300-line project cap', () => {
    for (const file of files) {
      const lines = readFileSync(file, 'utf8').split(/\r?\n/).length;
      expect(lines, `${label(file)} exceeds 300 lines`).toBeLessThanOrEqual(301);
    }
  });

  it('files with transitions/animations carry a reduced-motion guard', () => {
    for (const file of files.filter((f) => /\.(styles\.ts|tsx)$/.test(f))) {
      const source = readFileSync(file, 'utf8');
      if (/animation:|transition:/.test(source)) {
        expect(source, `${label(file)} animates without a prefers-reduced-motion guard`)
          .toMatch(/prefers-reduced-motion/);
      }
    }
  });
});
