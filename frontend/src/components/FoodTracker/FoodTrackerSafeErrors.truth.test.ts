import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('mounted FoodTracker safe error copy', () => {
  it('keeps active NutritionWorkspace tabs from rendering raw backend or provider messages', () => {
    const workspace = readSource('src/components/DashBoard/workspaces/NutritionWorkspace.tsx');
    expect(workspace).toContain("{activeTab === 'garden' && <GardeningTab />}");
    expect(workspace).toContain("{activeTab === 'farms' && <FarmFinderTab />}");
    expect(workspace).toContain("{activeTab === 'supplements' && <SupplementsTab />}");

    const activeSource = [
      readSource('src/components/FoodTracker/GardeningTab.tsx'),
      readSource('src/components/FoodTracker/FarmFinderTab.tsx'),
      readSource('src/components/FoodTracker/SupplementsTab.tsx'),
    ].join('\n');

    const forbiddenRawErrorSnippets = [
      'setError(data.error ||',
      'setError(err?.response?.data?.error ||',
      'setError(err?.response?.data?.message ||',
      'setDetailError(err?.response?.data?.error ||',
      'setGapError(err?.response?.data?.message ||',
      "err?.message || 'Failed",
      "data.error || 'Search failed'",
      "data.error || 'Zone not found'",
      "data.error || 'Failed to filter plants'",
    ];

    for (const snippet of forbiddenRawErrorSnippets) {
      expect(activeSource, snippet).not.toContain(snippet);
    }
  });
});
