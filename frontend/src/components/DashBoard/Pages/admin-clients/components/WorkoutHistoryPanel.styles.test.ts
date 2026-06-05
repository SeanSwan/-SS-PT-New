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

const stylesSourcePath = resolve(
  process.cwd(),
  'src/components/DashBoard/Pages/admin-clients/components/WorkoutHistoryPanel.styles.ts',
);

describe('WorkoutHistoryPanel style extraction', () => {
  it('keeps edit and notes styles outside the canonical workout history component', () => {
    const stylesSource = readFileSync(stylesSourcePath, 'utf8');

    expect(componentSource).toContain("from './WorkoutHistorySessionCard'");
    expect(sessionCardSource).toContain("from './WorkoutHistoryPanel.styles'");
    expect(componentSource + sessionCardSource).not.toContain('const EditActionBar = styled.div');
    expect(componentSource + sessionCardSource).not.toContain('const NotesBlock = styled.div');
    expect(stylesSource).toContain('export const EditActionBar');
    expect(stylesSource).toContain('export const NotesBlock');
  });
});
