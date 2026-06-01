import { readFileSync } from 'fs';
import { resolve } from 'path';

const readSource = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('WorkoutLogger cancel confirmation contract', () => {
  const loggerSource = readSource('src/components/WorkoutLogger/WorkoutLogger.tsx');
  const dialogSource = readSource('src/components/WorkoutLogger/WorkoutLoggerConfirmDialog.tsx');

  it('keeps unsaved-workout discard inside the SwanStudios UI instead of window.confirm', () => {
    expect(loggerSource).not.toContain('window.confirm');
    expect(loggerSource).toContain("from './WorkoutLoggerConfirmDialog'");
    expect(loggerSource).toContain('<WorkoutLoggerConfirmDialog');
    expect(loggerSource).toContain('setConfirmRequest');
  });

  it('uses an accessible 44px-touch confirmation dialog', () => {
    expect(dialogSource).toContain('role="dialog"');
    expect(dialogSource).toContain('aria-modal="true"');
    expect(dialogSource).toMatch(/min-height:\s*44px/);
    expect(dialogSource).toMatch(/min-width:\s*44px/);
  });
});
