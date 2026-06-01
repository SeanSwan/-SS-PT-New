import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const source = readFileSync(resolve(__dirname, './ScheduleStats.tsx'), 'utf8');

describe('ScheduleStats client source policy', () => {
  it('does not show paid-credit refill warnings for free-tracking client sources', () => {
    expect(source).toContain('isNonDeductingClientSource');
    expect(source).toContain('clientSource?: string | null;');
    expect(source).toContain('const isNonDeductingClient = isNonDeductingClientSource(clientSource);');
    expect(source).toContain('const shouldShowLowCreditsWarning = mode === \'client\' && lowCredits && !isNonDeductingClient;');
    expect(source).toContain('{shouldShowLowCreditsWarning && (');
    expect(source).not.toContain("{mode === 'client' && lowCredits && (");
  });

  it('uses source-aware signal text for the client credits card', () => {
    expect(source).toContain('getClientSessionSignal({');
    expect(source).toContain('clientSource,');
    expect(source).toContain('availableSessions: sessionsRemaining');
    expect(source).toContain('{clientSessionSignal.label}');
    expect(source).toContain('{clientSessionSignal.note}');
  });
});
