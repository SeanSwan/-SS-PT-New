import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const coreRoot = resolve(process.cwd(), 'src/core/style-lens-os');
const testFilePattern = /(?:\.test\.|\.spec\.)/;

const collectSourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const absolute = join(dir, name);
    if (statSync(absolute).isDirectory()) return collectSourceFiles(absolute);
    return /\.(ts|tsx)$/.test(name) && !testFilePattern.test(name)
      ? [absolute]
      : [];
  });

describe('Style Lens OS dependency boundary', () => {
  it('keeps the generic core free of Swan routes, components, tokens, and adapters', () => {
    const files = collectSourceFiles(coreRoot);
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      const label = relative(coreRoot, file);
      expect(source, label).not.toMatch(
        /SwanStudios|Crystalline Swan|Dual-Button|components\/DashBoard|style-lenses\/swanstudios|routes\//,
      );
      // A-PACK A5 (boundary law 2): core imports NOTHING from adapters/ —
      // this pattern was the gap; the walker itself already visits every file.
      expect(source, label).not.toMatch(
        /from ['"][^'"]*(?:components|routes|adapters|style-lenses\/swanstudios)/,
      );
    }
  });

  it('contains no MUI, Recharts, remote renderer, or arbitrary HTML execution path', () => {
    for (const file of collectSourceFiles(coreRoot)) {
      const source = readFileSync(file, 'utf8');
      expect(source).not.toMatch(/@mui|material-ui|recharts/i);
      expect(source).not.toMatch(/dangerouslySetInnerHTML|eval\(|new Function\(/);
      expect(source).not.toMatch(/import\(\s*[a-zA-Z_$]/);
    }
  });
});
