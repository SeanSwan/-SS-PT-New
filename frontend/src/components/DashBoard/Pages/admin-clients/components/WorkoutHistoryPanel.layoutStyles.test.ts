import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const componentSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-clients/components/WorkoutHistoryPanel.tsx'),
  'utf8',
);

const layoutStylesSourcePath = resolve(
  process.cwd(),
  'src/components/DashBoard/Pages/admin-clients/components/WorkoutHistoryPanel.layoutStyles.ts',
);

describe('WorkoutHistoryPanel layout style extraction', () => {
  it('keeps top-level layout, tab, and status styles outside the runtime component', () => {
    const layoutStylesSource = readFileSync(layoutStylesSourcePath, 'utf8');

    expect(componentSource).toContain("from './WorkoutHistoryPanel.layoutStyles'");
    expect(componentSource).not.toContain('const SummaryBar = styled.div');
    expect(componentSource).not.toContain('const TabBar = styled.div');
    expect(componentSource).not.toContain('const EmptyState = styled.div');
    expect(layoutStylesSource).toContain('export const SummaryBar');
    expect(layoutStylesSource).toContain('export const TabBar');
    expect(layoutStylesSource).toContain('export const EmptyState');
  });
});
