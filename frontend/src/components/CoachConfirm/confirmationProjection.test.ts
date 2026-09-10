/**
 * SCU G02 / AF11 — the projection decoder is the sheet's ONE source.
 * v2 (signed, stored) wins over the request-time envelope; v1 (no projection)
 * decodes conservatively from the record so in-flight legacy approvals render
 * exactly as they did pre-G02.
 */
import { describe, it, expect } from 'vitest';
import { decodeConfirmationProjection } from './confirmationProjection';
import { armDelayMs } from './confirmationSheetState';
import type { Tier } from './confirmationSheetState';

// One mint uses one expiry; independent wall-clock reads can disagree by 1ms.
const FUTURE = '2030-01-01T00:00:00.000Z';

const fallbacks = (over: Partial<{ tier: Tier; isDestructive: boolean; affectedCount: number; physical: boolean; irreversible: boolean }> = {}) => ({
  tier: 'read_back' as Tier,
  isDestructive: false,
  affectedCount: 1,
  physical: false,
  irreversible: false,
  ...over,
});

const v2Projection = (over: Record<string, unknown> = {}) => ({
  policyVersion: 2,
  tier: 'deliberate',
  isDestructive: true,
  requiresPhysicalConfirm: true,
  affectedCount: 12,
  targetUserId: 42,
  entityRevision: 'assignment-77',
  reversibility: 'none',
  expiresAt: FUTURE,
  displayFields: {
    description: 'Cancel session 184',
    commandType: 'cancel_session',
    affectedCount: 12,
    targetUser: 42,
  },
  ...over,
});

const v2Op = (over: Record<string, unknown> = {}) => ({
  id: 'op-1',
  commandType: 'cancel_session',
  type: 'DELETE',
  description: 'Cancel session 184',
  params: { sessionId: 184, clientId: 42 },
  affectedCount: 12,
  clientId: 42,
  requiresPhysicalConfirm: true,
  expiresAt: FUTURE,
  projection: v2Projection(),
  ...over,
});

describe('decodeConfirmationProjection — v2 stored wins (AF11)', () => {
  it('uses the stored tier/destructive/affectedCount over EVERY parent hint', () => {
    const decoded = decodeConfirmationProjection(
      v2Op(),
      fallbacks({ tier: 'fire_and_forget', isDestructive: false, affectedCount: 1, physical: false }),
      armDelayMs,
    );
    expect(decoded.source).toBe('stored');
    expect(decoded.tier).toBe('deliberate');
    expect(decoded.isDestructive).toBe(true);
    expect(decoded.affectedCount).toBe(12);
    // The projection must also decide the arm delay (3500 for >3 records),
    // not the envelope's 1-record hint.
    expect(armDelayMs({ tier: decoded.tier, isDestructive: decoded.isDestructive, affectedCount: decoded.affectedCount })).toBe(3500);
  });

  it('a stored irreversible projection shows the badge for a command the fallback list never knew', () => {
    const decoded = decodeConfirmationProjection(
      v2Op({ projection: v2Projection({ isDestructive: false, reversibility: 'none', commandType: 'brand_new_write' }) }),
      fallbacks(),
      armDelayMs,
    );
    // registry says 'none' (has an undo story) for a non-destructive write -> no badge
    expect(decoded.irreversible).toBe(false);
  });

  it('a destructive command with no undo story still shows the badge', () => {
    const decoded = decodeConfirmationProjection(
      v2Op({ projection: v2Projection({ reversibility: 'none' }) }),
      fallbacks({ isDestructive: false }),
      armDelayMs,
    );
    expect(decoded.irreversible).toBe(true);
  });

  it('an inverse-bearing command declares itself reversible', () => {
    const decoded = decodeConfirmationProjection(
      v2Op({ projection: v2Projection({ isDestructive: true, reversibility: 'inverse' }) }),
      fallbacks(),
      armDelayMs,
    );
    expect(decoded.irreversible).toBe(false);
  });

  it('an unknown stored tier fails closed instead of falling back to the envelope tier', () => {
    const decoded = decodeConfirmationProjection(
      v2Op({ projection: v2Projection({ tier: 'yolo' }) }),
      fallbacks({ tier: 'deliberate' }),
      armDelayMs,
    );
    expect(decoded.source).toBe('invalid');
  });
});

describe('decodeConfirmationProjection — legacy v1 (no projection)', () => {
  const legacyOp = {
    id: 'op-legacy',
    kind: 'pending_confirmed',
    commandType: 'notify_client',
    params: { clientId: 42 },
    clientId: 42,
    expiresAt: FUTURE,
    requiresPhysicalConfirm: true,
  };

  it('prefers the STORED physical flag over the envelope (the pre-existing F2-04 rule)', () => {
    const decoded = decodeConfirmationProjection(legacyOp, fallbacks({ physical: false }), armDelayMs);
    expect(decoded.source).toBe('legacy');
    expect(decoded.physical).toBe(true);
  });

  it('an unknown legacy command with no destructive marker is NOT declared irreversible', () => {
    const decoded = decodeConfirmationProjection(
      { id: 'op-x', commandType: 'brand_new_write', type: 'PATCH', params: {} },
      fallbacks(),
      armDelayMs,
    );
    expect(decoded.isDestructive).toBe(false);
    expect(decoded.irreversible).toBe(false);
  });

  it('a legacy destructive record keeps its badge', () => {
    const decoded = decodeConfirmationProjection(
      { id: 'op-d', type: 'DELETE', commandType: 'cancel_session', destructive: true, params: { clientId: 42 }, affectedCount: 1 },
      fallbacks(),
      armDelayMs,
    );
    expect(decoded.isDestructive).toBe(true);
    expect(decoded.irreversible).toBe(true);
  });

  it('a legacy non-destructive known-irreversible command keeps its badge (the old client-side list, now a fallback)', () => {
    const decoded = decodeConfirmationProjection(legacyOp, fallbacks(), armDelayMs);
    expect(decoded.irreversible).toBe(true);
  });
});
