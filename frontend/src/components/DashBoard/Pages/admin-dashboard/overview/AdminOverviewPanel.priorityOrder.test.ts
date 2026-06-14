import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const source = readFileSync(resolve(__dirname, './AdminOverviewPanel.tsx'), 'utf8');

describe('AdminOverviewPanel action priority', () => {
  it('puts Quick Actions before passive telemetry on the admin first screen', () => {
    const quickActionsIndex = source.indexOf('<BentoFull><AdminQuickActions actions={quickActions} /></BentoFull>');
    const assistantIndex = source.indexOf('<AITerminalPanel');
    const metricsIndex = source.indexOf('<AdminOverviewMetrics');

    expect(quickActionsIndex).toBeGreaterThanOrEqual(0);
    expect(assistantIndex).toBeGreaterThanOrEqual(0);
    expect(metricsIndex).toBeGreaterThanOrEqual(0);
    expect(quickActionsIndex).toBeLessThan(assistantIndex);
    expect(quickActionsIndex).toBeLessThan(metricsIndex);
  });

  it('seeds the admin assistant with one-tap operator prompts', () => {
    expect(source).toContain('ADMIN_OVERVIEW_ASSISTANT_PROMPTS');
    expect(source).toContain('quickPrompts={ADMIN_OVERVIEW_ASSISTANT_PROMPTS}');
  });
});
