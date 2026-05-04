/**
 * Phase 4 — Swan Coach v15 view_available_slots regression locks
 * ================================================================
 * Behavioral + source-text locks for the v15 dispatcher and the
 * scheduleCommands registry entry. v15 was the next slice on the
 * Swan Coach Command Lane (per CLAUDE.md priority order). The
 * dispatcher and registry entry shipped earlier without a regression
 * test suite — Phase 4 closes that gap before Sean flips it on with
 * the rest of the Phase 3 + 4 cumulative review.
 *
 * Plan: PHASE-3-PLAUD-MERGE-INGESTION-PLAN-v3-2026-05-04.md and
 * docs/ai-workflow/AI-HANDOFF/SWAN-COACH-CONTINUITY-HANDOFF-2026-04-11.md
 *
 * What this file locks:
 *   1. Dispatcher signature: (params, ctx) -> flat summary object
 *   2. Trainer self-query: default trainerId to ctx.user.id
 *   3. Trainer cross-query: REJECTED with honest error
 *   4. Admin without trainerId: REJECTED with honest error
 *   5. Admin with trainerId: PASSES THROUGH
 *   6. Default duration is 60 minutes
 *   7. Real calendar-date validation rejects 2026-02-30 (UTC drift guard)
 *   8. Service is invoked with (trainerId, Date, duration)
 *   9. Empty slot result still returns valid summary (count=0, first/last null)
 *  10. Slot result is flattened (count + first start HH:MM + last end HH:MM)
 *  11. Registry entry has Zod schema for inputs (trainerId optional, date required, duration default 60)
 *  12. Registry entry is non-destructive, no confirmation required
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DISP_SRC = readFileSync(
  resolve(__dirname, '../../services/ai/dispatchers/availabilityDispatchers.mjs'), 'utf8',
);
const REG_SRC = readFileSync(
  resolve(__dirname, '../../services/ai/commandRegistry/scheduleCommands.mjs'), 'utf8',
);
const DISPATCHER_INDEX = readFileSync(
  resolve(__dirname, '../../services/ai/commandDispatcher.mjs'), 'utf8',
);

// Mock availabilityService so behavioral tests are pure-unit (no DB)
vi.mock('../../services/availabilityService.mjs', () => ({
  default: {
    getAvailableSlots: vi.fn(),
    getAvailabilityForTrainer: vi.fn(),
    createOverride: vi.fn(),
  },
}));

// Pull in dispatcher AFTER the mock so it imports the mocked service
import { dispatchViewAvailableSlots } from '../../services/ai/dispatchers/availabilityDispatchers.mjs';
import availabilityService from '../../services/availabilityService.mjs';

describe('Phase 4 — v15 view_available_slots dispatcher (source contract)', () => {
  it('exports dispatchViewAvailableSlots as a named async function', () => {
    expect(DISP_SRC).toMatch(/export\s+async\s+function\s+dispatchViewAvailableSlots/);
  });

  it('uses the shared resolveTrainerId RBAC helper (no inline duplication)', () => {
    expect(DISP_SRC).toMatch(/dispatchViewAvailableSlots[\s\S]{0,800}resolveTrainerId/);
  });

  it('uses parseDateOnlyLocal for real-calendar date validation (UTC-drift guard)', () => {
    expect(DISP_SRC).toMatch(/dispatchViewAvailableSlots[\s\S]{0,800}parseDateOnlyLocal/);
  });

  it('default duration is 60 when params.duration omitted', () => {
    expect(DISP_SRC).toMatch(/params\.duration\s*\?\?\s*60/);
  });

  it('returns flat scalar summary (count + first/last HH:MM)', () => {
    expect(DISP_SRC).toMatch(/availableSlotCount/);
    expect(DISP_SRC).toMatch(/firstSlotStartUtc/);
    expect(DISP_SRC).toMatch(/lastSlotEndUtc/);
    // HH:MM extraction from ISO timestamp via .slice(11, 16)
    expect(DISP_SRC).toMatch(/slice\(11,\s*16\)/);
  });

  it('registered in commandDispatcher.mjs command map', () => {
    expect(DISPATCHER_INDEX).toMatch(/dispatchViewAvailableSlots/);
    expect(DISPATCHER_INDEX).toMatch(/\['view_available_slots',\s*dispatchViewAvailableSlots\]/);
  });
});

describe('Phase 4 — v15 view_available_slots dispatcher (behavior)', () => {
  beforeEach(() => {
    vi.mocked(availabilityService.getAvailableSlots).mockReset();
  });

  it('trainer self-query defaults trainerId to ctx.user.id when omitted', async () => {
    vi.mocked(availabilityService.getAvailableSlots).mockResolvedValue([]);
    const result = await dispatchViewAvailableSlots(
      { date: '2026-05-15' },
      { user: { id: 42, role: 'trainer' } },
    );
    expect(result.trainerId).toBe(42);
    expect(availabilityService.getAvailableSlots).toHaveBeenCalledWith(42, expect.any(Date), 60);
  });

  it('trainer cannot query another trainer (RBAC reject)', async () => {
    await expect(dispatchViewAvailableSlots(
      { trainerId: 99, date: '2026-05-15' },
      { user: { id: 42, role: 'trainer' } },
    )).rejects.toThrow(/can only manage their own/i);
    expect(availabilityService.getAvailableSlots).not.toHaveBeenCalled();
  });

  it('admin without explicit trainerId is rejected with honest error', async () => {
    await expect(dispatchViewAvailableSlots(
      { date: '2026-05-15' },
      { user: { id: 1, role: 'admin' } },
    )).rejects.toThrow(/specify a trainerId/i);
    expect(availabilityService.getAvailableSlots).not.toHaveBeenCalled();
  });

  it('admin with explicit trainerId passes through unchanged', async () => {
    vi.mocked(availabilityService.getAvailableSlots).mockResolvedValue([]);
    const result = await dispatchViewAvailableSlots(
      { trainerId: 99, date: '2026-05-15' },
      { user: { id: 1, role: 'admin' } },
    );
    expect(result.trainerId).toBe(99);
    expect(availabilityService.getAvailableSlots).toHaveBeenCalledWith(99, expect.any(Date), 60);
  });

  it('rejects impossible calendar dates (Feb 30) — UTC drift guard', async () => {
    await expect(dispatchViewAvailableSlots(
      { date: '2026-02-30' },
      { user: { id: 42, role: 'trainer' } },
    )).rejects.toThrow();
    expect(availabilityService.getAvailableSlots).not.toHaveBeenCalled();
  });

  it('rejects malformed date string (not YYYY-MM-DD)', async () => {
    await expect(dispatchViewAvailableSlots(
      { date: 'tomorrow' },
      { user: { id: 42, role: 'trainer' } },
    )).rejects.toThrow();
  });

  it('rejects non-zero-padded dates (Codex Phase 4 hardening)', async () => {
    // 2026-5-15 currently round-trips successfully because Number('5') === 5,
    // so without the strict format check it would silently parse as May 15 2026.
    // The AI/voice lane may emit non-zero-padded dates from natural-language
    // extraction — strict format catches this class.
    await expect(dispatchViewAvailableSlots(
      { date: '2026-5-15' },
      { user: { id: 42, role: 'trainer' } },
    )).rejects.toThrow(/YYYY-MM-DD|valid calendar date/i);
    expect(availabilityService.getAvailableSlots).not.toHaveBeenCalled();
  });

  it('honors custom duration when supplied', async () => {
    vi.mocked(availabilityService.getAvailableSlots).mockResolvedValue([]);
    await dispatchViewAvailableSlots(
      { date: '2026-05-15', duration: 30 },
      { user: { id: 42, role: 'trainer' } },
    );
    expect(availabilityService.getAvailableSlots).toHaveBeenCalledWith(42, expect.any(Date), 30);
  });

  it('empty service result returns count=0 + first/last null', async () => {
    vi.mocked(availabilityService.getAvailableSlots).mockResolvedValue([]);
    const result = await dispatchViewAvailableSlots(
      { date: '2026-05-15' },
      { user: { id: 42, role: 'trainer' } },
    );
    expect(result).toMatchObject({
      trainerId: 42,
      date: '2026-05-15',
      durationMinutes: 60,
      availableSlotCount: 0,
      firstSlotStartUtc: null,
      lastSlotEndUtc: null,
    });
  });

  it('flattens multi-slot result to count + first start + last end (HH:MM)', async () => {
    vi.mocked(availabilityService.getAvailableSlots).mockResolvedValue([
      { startTime: '2026-05-15T09:00:00.000Z', endTime: '2026-05-15T10:00:00.000Z' },
      { startTime: '2026-05-15T11:00:00.000Z', endTime: '2026-05-15T12:00:00.000Z' },
      { startTime: '2026-05-15T14:00:00.000Z', endTime: '2026-05-15T15:00:00.000Z' },
    ]);
    const result = await dispatchViewAvailableSlots(
      { date: '2026-05-15' },
      { user: { id: 42, role: 'trainer' } },
    );
    expect(result.availableSlotCount).toBe(3);
    expect(result.firstSlotStartUtc).toBe('09:00');
    expect(result.lastSlotEndUtc).toBe('15:00');
  });
});

describe('Phase 4 — v15 view_available_slots registry entry', () => {
  it('command type matches the dispatcher key', () => {
    expect(REG_SRC).toMatch(/type:\s*['"]view_available_slots['"]/);
  });

  // Helper: find the v15 entry block by slicing from the type line to the
  // next top-level entry start (or end of file). Avoids the fixed-window
  // ambiguity where the entry runs longer than a small char count.
  function v15EntryBlock() {
    const start = REG_SRC.indexOf("'view_available_slots'");
    expect(start).toBeGreaterThan(0);
    // Next entry begins at "type: '" inside another { ... } block
    const remainder = REG_SRC.slice(start);
    const nextEntry = remainder.indexOf("type: '", 30); // skip past current
    const end = nextEntry > 0 ? start + nextEntry : REG_SRC.length;
    return REG_SRC.slice(start, end);
  }

  it('input schema requires date, makes trainerId optional, defaults duration to 60', () => {
    const block = v15EntryBlock();
    expect(block).toMatch(/trainerId:\s*z\.number\(\)\.int\(\)\.positive\(\)\.optional\(\)/);
    expect(block).toMatch(/date:\s*DateSchema/);
    expect(block).toMatch(/duration:\s*z\.number\(\)\.int\(\)\.min\(15\)\.max\(180\)\.default\(60\)/);
  });

  it('non-destructive, no confirmation required (clean read)', () => {
    const block = v15EntryBlock();
    expect(block).toMatch(/destructive:\s*false/);
    expect(block).toMatch(/requiresConfirmation:\s*false/);
  });

  it('roleRequired is admin + trainer', () => {
    const block = v15EntryBlock();
    expect(block).toMatch(/roleRequired:\s*\[['"]admin['"],\s*['"]trainer['"]\]/);
  });
});
