import { describe, expect, it, vi } from 'vitest';

const quickStatusCheck = vi.fn();

vi.mock('../utils/environmentDiagnostics.mjs', () => ({
  quickStatusCheck,
}));

const { runManualDiagnostics, runCli } = await import('../utils/manualDiagnostics.mjs');

describe('manual configuration diagnostics', () => {
  it('uses the existing offline status check and reports missing configuration', () => {
    quickStatusCheck.mockReturnValueOnce({
      status: 'issues',
      checks: { stripeEnabled: false, hasSecretKey: false, hasPublishableKey: true },
    });

    const result = runManualDiagnostics();

    expect(result.configurationOnly).toBe(true);
    expect(result.recommendations).toHaveLength(2);
    expect(quickStatusCheck).toHaveBeenCalledTimes(1);
  });

  it('CLI output describes configuration checks and never claims a payment succeeded', () => {
    quickStatusCheck.mockReturnValueOnce({
      status: 'operational',
      checks: { stripeEnabled: true, hasSecretKey: true, hasPublishableKey: true },
    });
    const lines = [];
    const code = runCli({ log: (line) => lines.push(line), error: () => undefined });

    expect(code).toBe(0);
    const output = lines.join('\n');
    expect(output).toMatch(/configuration/i);
    expect(output).toMatch(/no payment request|payment success was not tested/i);
    expect(output).not.toMatch(/payment succeeded|all systems operational/i);
  });
});
