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

describe('frontend training language guard', () => {
  it('does not ship forbidden wellness terms in runtime source', () => {
    const forbiddenPatterns = [
      { label: 'forbidden term A', pattern: /\byoga\b/i },
      { label: 'forbidden term B', pattern: /\bmeditation\b/i },
      { label: 'forbidden term C', pattern: /\bmeditative\b/i }
    ];

    for (const filePath of sourceFilesFrom(sourceRoot)) {
      const source = readFileSync(filePath, 'utf8');
      const displayPath = relative(sourceRoot, filePath);

      for (const { label, pattern } of forbiddenPatterns) {
        expect(source, `${displayPath} contains ${label}`).not.toMatch(pattern);
      }
    }
  }, 15000);
});
