import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const source = readFileSync(resolve(__dirname, './FeatureAccessPage.tsx'), 'utf8');

describe('FeatureAccessPage feature catalog wiring', () => {
  it('renders options from the shared feature access catalog', () => {
    expect(source).toContain("from './featureAccessCatalog'");
    expect(source).toContain('FEATURE_ACCESS_FEATURES[0].key');
    expect(source).toContain('FEATURE_ACCESS_FEATURES.map');
    expect(source).not.toContain('const FEATURES = [');
  });
});