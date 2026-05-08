import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SOURCE_EXTENSIONS = /\.(ts|tsx)$/;
const JSX_EXTENSION = /\.tsx$/;
const TEST_FILE = /\.(test|spec)\.tsx?$/;

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .flatMap((entry) => {
      const absolute = join(dir, entry);
      const stat = statSync(absolute);
      return stat.isDirectory() ? walk(absolute) : [absolute];
    });
}

function displayPath(file: string): string {
  return relative(ROOT, file).replaceAll('\\', '/');
}

function findOpeningTags(source: string, tag: string): Array<{ text: string; index: number }> {
  const found: Array<{ text: string; index: number }> = [];
  const needle = `<${tag}`;
  let cursor = 0;

  while (cursor < source.length) {
    const start = source.indexOf(needle, cursor);
    if (start === -1) break;

    const next = source[start + needle.length];
    if (next && /[A-Za-z0-9_$-]/.test(next)) {
      cursor = start + needle.length;
      continue;
    }

    let quote: '"' | "'" | null = null;
    let braceDepth = 0;
    let end = start + needle.length;

    for (; end < source.length; end += 1) {
      const char = source[end];
      const previous = source[end - 1];

      if (quote) {
        if (char === quote && previous !== '\\') quote = null;
        continue;
      }

      if (char === '"' || char === "'") {
        quote = char;
        continue;
      }
      if (char === '{') {
        braceDepth += 1;
        continue;
      }
      if (char === '}') {
        braceDepth = Math.max(0, braceDepth - 1);
        continue;
      }
      if (char === '>' && braceDepth === 0) {
        end += 1;
        break;
      }
    }

    found.push({ text: source.slice(start, end), index: start });
    cursor = end;
  }

  return found;
}

describe('Coach assistant button type policy', () => {
  it('declares an explicit type on every Coach assistant button element', () => {
    const files = walk(ROOT).filter((file) => SOURCE_EXTENSIONS.test(file) && !TEST_FILE.test(file));
    const styledButtonNames = new Set<string>();

    files.forEach((file) => {
      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(/\bconst\s+([A-Z][A-Za-z0-9_]*)\s*=\s*styled\.button/g)) {
        styledButtonNames.add(match[1]);
      }
    });

    const productionTsxFiles = files.filter((file) => JSX_EXTENSION.test(file));
    const tags = ['button', ...styledButtonNames].sort();
    const violations: string[] = [];

    productionTsxFiles.forEach((file) => {
      const source = readFileSync(file, 'utf8');
      tags.forEach((tag) => {
        for (const match of findOpeningTags(source, tag)) {
          const openingTag = match.text;
          if (/\btype\s*=/.test(openingTag)) continue;
          const line = source.slice(0, match.index).split('\n').length;
          violations.push(`${displayPath(file)}:${line} missing type on <${tag}>`);
        }
      });
    });

    expect(violations).toEqual([]);
  });
});
