import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '../..');
const repoRoot = path.resolve(backendRoot, '..');

const readRepoFile = (relativePath) =>
  fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

describe('supplement care-first copy', () => {
  it('avoids restriction and deficiency framing on the supplement surface', () => {
    const source = [
      readRepoFile('backend/services/supplementData.mjs'),
      readRepoFile('frontend/src/components/FoodTracker/SupplementsTab.tsx'),
    ].join('\n');

    expect(source).not.toMatch(
      /caloric restriction|wasted macros|nutritional deficiencies|zero sugar|no sugar|zero calories|not ideal for cutting/i
    );
    expect(source).toMatch(/possible|pattern|support|hydration|coach/i);
  });
});
