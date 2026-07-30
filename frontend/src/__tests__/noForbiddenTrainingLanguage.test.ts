import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const sourceRoot = join(__dirname, '..');

const ignoredPathParts = [
  `${sep}__tests__${sep}`,
  `${sep}assets${sep}user-dashboard${sep}dashboard-export${sep}`
];

function sourceFilesFrom(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry);

    if (ignoredPathParts.some((part) => fullPath.includes(part))) {
      continue;
    }

    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...sourceFilesFrom(fullPath));
      continue;
    }

    if (/\.(ts|tsx)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry)) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Strip comments before matching.
 *
 * Rule 9 is about language SHIPPED TO USERS. Comments are removed by the bundler
 * and cannot reach a user, so scanning them produces false positives — and it did:
 * `components/marketing/PrismCapture/prismCopy.ts:4` failed this guard because its
 * JSDoc block explains "(yoga/meditation) apply if copy grows". A comment
 * documenting the rule was being flagged as a violation of the rule.
 *
 * Only whole-line `//` comments and `/* *\/` blocks are removed. The `//` pattern
 * requires line-start or a non-`:` character before it so that a URL like
 * `https://…` inside a string is never truncated. String literals are left
 * untouched, which is the part that actually ships.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('frontend training language guard', () => {
  it('does not ship forbidden wellness terms in runtime source', () => {
    const forbiddenPatterns = [
      { label: 'forbidden term A', pattern: /\byoga\b/i },
      { label: 'forbidden term B', pattern: /\bmeditation\b/i },
      { label: 'forbidden term C', pattern: /\bmeditative\b/i }
    ];

    for (const filePath of sourceFilesFrom(sourceRoot)) {
      const source = stripComments(readFileSync(filePath, 'utf8'));
      const displayPath = relative(sourceRoot, filePath);

      for (const { label, pattern } of forbiddenPatterns) {
        expect(source, `${displayPath} contains ${label}`).not.toMatch(pattern);
      }
    }
  }, 15000);
});
