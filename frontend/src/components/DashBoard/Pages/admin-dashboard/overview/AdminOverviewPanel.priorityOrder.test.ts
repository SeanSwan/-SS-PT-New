import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const source = readFileSync(resolve(__dirname, './AdminOverviewPanel.tsx'), 'utf8');
const signalSource = readFileSync(resolve(__dirname, './AdminSignalBar.tsx'), 'utf8');

const indexOfRequired = (needle: string) => {
  const index = source.indexOf(needle);
  expect(index, `${needle} should be mounted in AdminOverviewPanel`).toBeGreaterThanOrEqual(0);
  return index;
};

describe('AdminOverviewPanel action priority', () => {
  it('orders sections Alerts -> Queues -> Business -> Ops -> Community -> Telemetry (SignalBar order = scroll order, SWA-138 S5)', () => {
    const signalIndex = indexOfRequired('<BentoFull><WidgetErrorBoundary name="Signal bar"><AdminSignalBar /></WidgetErrorBoundary></BentoFull>');
    const quickActionsIndex = indexOfRequired('<BentoFull><WidgetErrorBoundary name="Quick actions"><AdminQuickActions actions={quickActions} /></WidgetErrorBoundary></BentoFull>');
    const assistantIndex = indexOfRequired('<AITerminalPanel');
    const alertsIndex = indexOfRequired('id="admin-alerts"');
    const queuesIndex = indexOfRequired('id="admin-queues"');
    const businessIndex = indexOfRequired('id="admin-business-lens"');
    const operationsIndex = indexOfRequired('id="admin-operations"');
    const communityIndex = indexOfRequired('id="admin-community-safety"');
    const telemetryIndex = indexOfRequired('id="admin-telemetry"');

    expect(signalIndex).toBeLessThan(quickActionsIndex);
    expect(quickActionsIndex).toBeLessThan(assistantIndex);
    expect(assistantIndex).toBeLessThan(alertsIndex);
    expect(alertsIndex).toBeLessThan(queuesIndex);
    expect(queuesIndex).toBeLessThan(businessIndex);
    expect(businessIndex).toBeLessThan(operationsIndex);
    expect(operationsIndex).toBeLessThan(communityIndex);
    expect(communityIndex).toBeLessThan(telemetryIndex);
  });

  it('promotes operational intelligence out of the old collapsed telemetry details block', () => {
    expect(source).not.toContain('TelemetryDetails');
    expect(source).not.toContain('TelemetryGrid');
    expect(source).not.toContain('<details');
    expect(source).not.toContain('Access Deep Telemetry');
    expect(source.indexOf('<BentoThird><WidgetErrorBoundary name="Social overview"><SocialOverviewWidget /></WidgetErrorBoundary></BentoThird>')).toBeGreaterThanOrEqual(0);
    expect(source.indexOf('<BentoHalf><WidgetErrorBoundary name="Upcoming check-ins"><UpcomingChecksWidget /></WidgetErrorBoundary></BentoHalf>')).toBeGreaterThanOrEqual(0);
    expect(source.indexOf('<BentoHalf><WidgetErrorBoundary name="Cancelled sessions"><CancelledSessionsWidget maxItems={10} showChargeButtons={true} /></WidgetErrorBoundary></BentoHalf>')).toBeGreaterThanOrEqual(0);
  });

  it('keeps signal shortcuts honest and wired to visible sections', () => {
    expect(signalSource).toContain("Counts stay inside the live widgets");
    expect(signalSource).not.toContain('0');
    expect(signalSource).not.toContain('99');
    expect(signalSource).toContain("href: '#admin-alerts'");
    expect(signalSource).toContain("href: '#admin-queues'");
    expect(signalSource).toContain("href: '#admin-community-safety'");
    expect(signalSource).toContain("href: '#admin-business-lens'");
    expect(signalSource).toContain("href: '#admin-telemetry'");
    // Every anchor must point at a section id the panel actually renders:
    for (const anchor of ['admin-alerts', 'admin-queues', 'admin-business-lens', 'admin-operations', 'admin-community-safety', 'admin-telemetry']) {
      expect(source).toContain(`id="${anchor}"`);
    }
  });

  it('seeds the admin assistant with one-tap operator prompts', () => {
    expect(source).toContain('ADMIN_OVERVIEW_ASSISTANT_PROMPTS');
    expect(source).toContain('quickPrompts={ADMIN_OVERVIEW_ASSISTANT_PROMPTS}');
  });
});
