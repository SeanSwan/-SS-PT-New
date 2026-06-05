import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CopilotModeTabs from './CopilotModeTabs';

const panelSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-clients/components/WorkoutCopilotPanel.tsx'),
  'utf8',
);

const tabStylesSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-clients/components/copilot-local-styles.ts'),
  'utf8',
);

describe('CopilotModeTabs', () => {
  it('keeps tab chrome extracted from the copilot state-machine shell', () => {
    expect(panelSource).toContain("from './CopilotModeTabs'");
    expect(panelSource).toContain('<CopilotModeTabs');
    expect(panelSource).not.toContain('<TabBar>');
    expect(panelSource).not.toContain('<TabButton');
  });

  it('uses accessible tabs with 44px touch targets', async () => {
    const user = userEvent.setup();
    const onSelectSingle = vi.fn();
    const onSelectLongHorizon = vi.fn();

    render(
      <CopilotModeTabs
        activeTab="single"
        onSelectSingle={onSelectSingle}
        onSelectLongHorizon={onSelectLongHorizon}
      />,
    );

    const singleTab = screen.getByRole('tab', { name: /single workout/i });
    const longHorizonTab = screen.getByRole('tab', { name: /long-horizon/i });

    expect(screen.getByRole('tablist', { name: /workout copilot mode/i })).toBeTruthy();
    expect(singleTab.getAttribute('aria-selected')).toBe('true');
    expect(longHorizonTab.getAttribute('aria-selected')).toBe('false');
    expect(tabStylesSource).toContain('min-height: 44px;');

    await user.click(longHorizonTab);

    expect(onSelectLongHorizon).toHaveBeenCalledTimes(1);
    expect(onSelectSingle).not.toHaveBeenCalled();
  });
});
