/**
 * commandAudit.test.mjs
 * =====================
 * Slice F1 — audit-trail writer behavior:
 *   - params are redacted (PHI masked, long text stripped) before storage
 *   - hashing is canonical (key-order independent)
 *   - writes are best-effort: a failing insert never throws
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AiCommandAuditLog from '../../models/AiCommandAuditLog.mjs';
import {
  recordCommandAudit,
  redactParams,
  hashParams,
} from '../../services/ai/commandAudit.mjs';

vi.mock('../../models/AiCommandAuditLog.mjs', () => ({
  default: { create: vi.fn() },
}));

const createMock = vi.mocked(AiCommandAuditLog.create);

const BASE_ENTRY = {
  userId: 7,
  userRole: 'trainer',
  outcome: 'success',
  commandType: 'log_workout',
};

beforeEach(() => {
  createMock.mockReset();
  createMock.mockResolvedValue({});
});

describe('redactParams', () => {
  it('masks email addresses inside string values', () => {
    const out = redactParams({ note: 'reach me at test@example.com please' });
    expect(JSON.stringify(out)).not.toContain('test@example.com');
  });

  it('strips long free-text fields entirely', () => {
    const longText = 'a'.repeat(500);
    const out = redactParams({ transcript: longText });
    expect(out.transcript).toBe('[REDACTED_LONG_TEXT:500chars]');
  });

  it('preserves numbers, booleans, and short clean strings', () => {
    const out = redactParams({ clientId: 12, sets: 3, done: true, exercise: 'goblet squat' });
    expect(out).toEqual({ clientId: 12, sets: 3, done: true, exercise: 'goblet squat' });
  });

  it('recurses into nested objects and arrays', () => {
    const out = redactParams({ entries: [{ note: 'call 555-123-4567 now' }] });
    expect(JSON.stringify(out)).not.toContain('555-123-4567');
  });
});

describe('hashParams', () => {
  it('is stable regardless of key order', () => {
    expect(hashParams({ a: 1, b: 'x' })).toBe(hashParams({ b: 'x', a: 1 }));
  });

  it('returns null for null/undefined params', () => {
    expect(hashParams(null)).toBeNull();
    expect(hashParams(undefined)).toBeNull();
  });

  it('produces a 64-char sha256 hex digest', () => {
    expect(hashParams({ a: 1 })).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('recordCommandAudit', () => {
  it('writes a row with redacted params and hash — never raw params', async () => {
    const ok = await recordCommandAudit({
      ...BASE_ENTRY,
      params: { note: 'email test@example.com', clientId: 12 },
    });
    expect(ok).toBe(true);
    expect(createMock).toHaveBeenCalledTimes(1);
    const row = createMock.mock.calls[0][0];
    expect(row.userId).toBe(7);
    expect(row.outcome).toBe('success');
    expect(row.paramsHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(row.paramsRedacted)).not.toContain('test@example.com');
    expect(row.paramsRedacted.clientId).toBe(12);
  });

  it('skips and returns false when required fields are missing', async () => {
    expect(await recordCommandAudit({ userRole: 'admin', outcome: 'success' })).toBe(false);
    expect(await recordCommandAudit({ userId: 1, outcome: 'success' })).toBe(false);
    expect(await recordCommandAudit({ userId: 1, userRole: 'admin' })).toBe(false);
    expect(createMock).not.toHaveBeenCalled();
  });

  it('is best-effort: a failing insert returns false and never throws', async () => {
    createMock.mockRejectedValueOnce(new Error('db down'));
    await expect(recordCommandAudit(BASE_ENTRY)).resolves.toBe(false);
  });
});
