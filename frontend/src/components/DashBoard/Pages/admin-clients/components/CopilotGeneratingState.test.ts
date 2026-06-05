import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const panelSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-clients/components/WorkoutCopilotPanel.tsx'),
  'utf8',
);

const generatingSourcePath = resolve(
  process.cwd(),
  'src/components/DashBoard/Pages/admin-clients/components/CopilotGeneratingState.tsx',
);

describe('CopilotGeneratingState extraction', () => {
  it('keeps the generating state chrome outside the copilot state-machine shell', () => {
    const generatingSource = readFileSync(generatingSourcePath, 'utf8');

    expect(panelSource).toContain("from './CopilotGeneratingState'");
    expect(panelSource).toContain('<CopilotGeneratingState />');
    expect(panelSource).not.toContain('Generating Workout Plan...');
    expect(generatingSource).toContain('Generating Workout Plan...');
    expect(generatingSource).toContain('Analyzing client profile');
  });
});
