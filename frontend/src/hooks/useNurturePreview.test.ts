/**
 * Tests for useNurturePreview's defensive normalizers.
 * The dry-run shape is owned by automationService (a lane that evolves), so these
 * lock the panel's resilience to shape drift / partial payloads.
 */
import { describe, it, expect } from 'vitest';
import { normalizePreview, normalizeTemplates } from './useNurturePreview';

describe('normalizePreview', () => {
  it('passes a full real payload through', () => {
    const raw = {
      dryRun: true,
      total: 2,
      summary: { wouldSend: 1, wouldDefer: 1, wouldCancel: 0, wouldFail: 0 },
      byReason: { ok_to_send: 1, quiet_hours: 1 },
      items: [
        { id: 1, userId: 9, leadId: null, recipientKind: 'user', channel: 'sms', templateName: 'welcome', action: 'send', reason: 'ok_to_send', hasPhone: true, suppressed: false },
        { id: 2, userId: null, leadId: 5, recipientKind: 'lead', channel: 'sms', templateName: 'follow_up_day1', action: 'defer', reason: 'quiet_hours', hasPhone: true, suppressed: false },
      ],
    };
    const out = normalizePreview(raw);
    expect(out.total).toBe(2);
    expect(out.summary.wouldSend).toBe(1);
    expect(out.items).toHaveLength(2);
    expect(out.byReason.quiet_hours).toBe(1);
  });

  it('derives total from items when total is missing, and fills summary zeros', () => {
    const out = normalizePreview({ items: [{ id: 1 }, { id: 2 }, { id: 3 }] });
    expect(out.total).toBe(3);
    expect(out.summary).toEqual({ wouldSend: 0, wouldDefer: 0, wouldCancel: 0, wouldFail: 0 });
  });

  it('returns a safe empty shape for junk/missing input', () => {
    for (const junk of [null, undefined, 'nope', 42]) {
      const out = normalizePreview(junk as any);
      expect(out.total).toBe(0);
      expect(out.items).toEqual([]);
      expect(out.summary.wouldSend).toBe(0);
    }
  });
});

describe('normalizeTemplates', () => {
  it('normalizes an array of {name,message}', () => {
    const out = normalizeTemplates([{ name: 'welcome', message: 'Hi {clientName}' }, { name: 'd1', rendered: 'Day 1' }]);
    expect(out).toEqual([{ name: 'welcome', message: 'Hi {clientName}' }, { name: 'd1', message: 'Day 1' }]);
  });

  it('normalizes a name-keyed object', () => {
    const out = normalizeTemplates({ welcome: 'Hi there', followup: 'Still in?' });
    expect(out).toContainEqual({ name: 'welcome', message: 'Hi there' });
    expect(out).toContainEqual({ name: 'followup', message: 'Still in?' });
  });

  it('returns [] for empty/missing', () => {
    expect(normalizeTemplates(null)).toEqual([]);
    expect(normalizeTemplates(undefined)).toEqual([]);
  });
});
