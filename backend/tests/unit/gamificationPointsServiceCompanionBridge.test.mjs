import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const serviceSource = readFileSync(
  resolve(__dirname, '../../services/gamification/GamificationPointsService.mjs'),
  'utf8'
);

describe('GamificationPointsService companion bridge integration', () => {
  it('schedules companion ledger events from the shared idempotent point ledger', () => {
    expect(serviceSource).toContain("import { scheduleCompanionLedgerEvents } from './CompanionEventBridgeService.mjs';");
    expect(serviceSource).toContain('metadata,');
    expect(serviceSource).toMatch(/scheduleLedgerRealtimeEvent\(result, eventEntry, outerTransaction\);\s*scheduleCompanionLedgerEvents\(\{ result, entry: eventEntry, transaction: outerTransaction \}\);/);
    expect(serviceSource).toMatch(/scheduleLedgerRealtimeEvent\(result, eventEntry, null\);\s*scheduleCompanionLedgerEvents\(\{ result, entry: eventEntry, transaction: null \}\);/);
  });
});
