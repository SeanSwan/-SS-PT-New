import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readSource = (relativePath: string) => readFileSync(
  resolve(__dirname, relativePath),
  'utf8',
);

const extractedFiles = [
  './GoalProgressTracker.tsx',
  './GoalProgressTracker.logic.ts',
  './GoalProgressTracker.styles.ts',
  './GoalProgressTracker.base.styles.ts',
  './GoalProgressTracker.detail.styles.ts',
  './GoalProgressTracker.insight.styles.ts',
  './GoalProgressTrackerView.tsx',
  './GoalProgressTrackerGoalList.tsx',
  './GoalProgressTrackerGoalDetails.tsx',
  './GoalProgressTrackerAddGoalModal.tsx',
  './GoalProgressTrackerAchievements.tsx',
];

describe('GoalProgressTracker theme bridge', () => {
  it('keeps goal progress tracking under the line cap with extracted view, styles, and logic', () => {
    for (const relativePath of extractedFiles) {
      expect(existsSync(resolve(__dirname, relativePath))).toBe(true);
      expect(readSource(relativePath).split(/\r?\n/).length).toBeLessThanOrEqual(300);
    }

    const source = readSource('./GoalProgressTracker.tsx');

    expect(source).toContain("from './GoalProgressTrackerView'");
    expect(source).toContain("from './GoalProgressTracker.logic'");
    expect(source).not.toContain('styled.');
  });

  it('bridges goal progress styling to dashboard theme tokens', () => {
    const combinedSource = extractedFiles.map(readSource).join('\n');

    expect(combinedSource).toContain('var(--bg-elevated');
    expect(combinedSource).toContain('var(--text-primary');
    expect(combinedSource).toContain('var(--text-secondary');
    expect(combinedSource).toContain('var(--accent-primary');
    expect(combinedSource).toContain('var(--shadow-strong');
    expect(combinedSource).toContain('var(--overlay-strong');

    expect(combinedSource).not.toMatch(/color:\s*#[0-9A-Fa-f]{3,8}/);
    expect(combinedSource).not.toMatch(/background:\s*#[0-9A-Fa-f]{3,8}/);
    expect(combinedSource).not.toContain('background: rgba(0, 0, 0, 0.7)');
    expect(combinedSource).not.toContain('rgba(15,23,42');
    expect(combinedSource).not.toContain('rgba(255, 255, 255');
  });
});
