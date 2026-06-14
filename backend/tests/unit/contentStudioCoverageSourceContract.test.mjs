import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const routeSource = readFileSync(
  resolve(process.cwd(), 'routes/contentStudioRoutes.mjs'),
  'utf8',
);
const aiChatRouteSource = readFileSync(
  resolve(process.cwd(), 'routes/aiChatRoutes.mjs'),
  'utf8',
);

describe('Content Studio coverage source contract', () => {
  it('keeps Coverage Tracker reads on the shared Rolodex coverage service', () => {
    expect(routeSource).toContain('contentStudioCoverageService.mjs');
    expect(routeSource).toContain('loadContentStudioCoveragePayload');
    expect(routeSource).not.toContain("attributes: ['id', 'name', 'exerciseType', 'bodyPartCategory', 'primaryMuscles', 'difficulty', 'exercise_key', 'videoUrl', 'source']");
  });

  it('adds a privacy-safe video coverage summary to Swan Coach prompts', () => {
    expect(aiChatRouteSource).toContain('buildSwanCoachCoveragePromptBlockFromModels');
    expect(aiChatRouteSource).toMatch(/systemPrompt\s*\+=\s*await\s+buildSwanCoachCoveragePromptBlockFromModels/);
  });
});
