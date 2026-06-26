import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const frontendRoot = resolve(__dirname, '../../..');
const repoRoot = resolve(frontendRoot, '..');

const activeFiles = [
  'src/components/DashBoard/workspaces/WorkoutsWorkspace.tsx',
  'src/components/DashBoard/Pages/trainer-dashboard/TrainerOverviewPage.tsx',
  'src/components/DashBoard/Pages/trainer-dashboard/SwanCoachDockTrainer.tsx',
  'src/components/DashBoard/Pages/content-studio/ContentStudioHub.tsx',
];

const readActive = (path: string): string =>
  readFileSync(resolve(frontendRoot, path), 'utf8');

describe('global AI entrypoint retirement', () => {
  it('keeps the inline AICommandBar archived and disconnected from active dashboard surfaces', () => {
    expect(existsSync(resolve(frontendRoot, 'src/components/Shared/AICommandBar'))).toBe(false);
    expect(existsSync(resolve(repoRoot, 'archive/pending-deletion/2026-06-25/global-ai-entrypoints/frontend/src/components/Shared/AICommandBar'))).toBe(true);

    activeFiles.forEach((path) => {
      const source = readActive(path);
      expect(source, path).not.toContain('AICommandBar');
      expect(source, path).not.toContain('Shared/AICommandBar');
    });
  });
});