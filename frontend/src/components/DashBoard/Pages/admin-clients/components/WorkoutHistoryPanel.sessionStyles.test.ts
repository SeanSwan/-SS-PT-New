import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const componentSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-clients/components/WorkoutHistoryPanel.tsx'),
  'utf8',
);
const sessionCardSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-clients/components/WorkoutHistorySessionCard.tsx'),
  'utf8',
);

const sessionStylesSourcePath = resolve(
  process.cwd(),
  'src/components/DashBoard/Pages/admin-clients/components/WorkoutHistoryPanel.sessionStyles.ts',
);

describe('WorkoutHistoryPanel session style extraction', () => {
  it('keeps session, table, PR, and share styles outside the runtime component', () => {
    const sessionStylesSource = readFileSync(sessionStylesSourcePath, 'utf8');

    expect(componentSource).toContain("from './WorkoutHistorySessionCard'");
    expect(sessionCardSource).toContain("from './WorkoutHistoryPanel.sessionStyles'");
    expect(componentSource + sessionCardSource).not.toContain('const SessionCard = styled.div');
    expect(componentSource + sessionCardSource).not.toContain('const ExerciseTable = styled.table');
    expect(componentSource + sessionCardSource).not.toContain('const PRBadge = styled.span');
    expect(componentSource + sessionCardSource).not.toContain('const ShareIconBtn = styled.button');
    expect(sessionStylesSource).toContain('export const SessionCard');
    expect(sessionStylesSource).toContain('export const ExerciseTable');
    expect(sessionStylesSource).toContain('export const PRBadge');
    expect(sessionStylesSource).toContain('export const ShareIconBtn');
  });

  it('uses theme-token fallback colors for dynamic intensity and share chrome', () => {
    const sessionStylesSource = readFileSync(sessionStylesSourcePath, 'utf8');

    expect(sessionStylesSource).toContain('var(--status-danger, #C92A54)');
    expect(sessionStylesSource).toContain('var(--accent-gold, #C6A84B)');
    expect(sessionStylesSource).toContain('var(--accent-secondary, #8B5CF6)');
    expect(sessionStylesSource).toContain('var(--border-subtle');
    expect(sessionStylesSource).toContain('var(--border-accent-soft');
    expect(sessionStylesSource).toContain('var(--border-gold-soft');
    expect(sessionStylesSource).toContain('var(--accent-secondary-bg-soft');
    expect(sessionStylesSource).toContain('var(--shadow-accent-soft');
    expect(sessionStylesSource).not.toContain("return '#C92A54'");
    expect(sessionStylesSource).not.toContain('color: #E0ECF4;');

    [
      'rgba(255, 255, 255, 0.03)',
      'rgba(255, 255, 255, 0.08)',
      'rgba(96, 192, 240, 0.2)',
      'rgba(96, 192, 240, 0.1)',
      'rgba(255, 255, 255, 0.03)',
      'rgba(198, 168, 75, 0.4)',
      'rgba(198, 168, 75, 0.2)',
      'rgba(139, 92, 246, 0.4)',
      'rgba(139, 92, 246, 0.12)',
      'rgba(96, 192, 240, 0.4)',
    ].forEach((rawDeclaration) => {
      expect(sessionStylesSource).not.toContain(rawDeclaration);
    });
  });
});
