import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const hookPath = join(__dirname, '..', 'hooks', 'use-toast.tsx');

describe('useToast entropy contract', () => {
  it('does not use Math.random for toast identifiers', () => {
    const source = readFileSync(hookPath, 'utf8');
    const generatorStart = source.indexOf('const generateToastId');
    const generatorSource = source.slice(generatorStart, source.indexOf('// Context', generatorStart));

    expect(generatorSource).not.toMatch(/Math\.random/);
    expect(generatorSource).toMatch(/crypto\.randomUUID|getRandomValues/);
  });
});
