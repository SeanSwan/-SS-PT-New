import { describe, expect, it } from 'vitest';
import { decodeConfirmationProjection } from './confirmationProjection';
import { armDelayMs, type Tier } from './confirmationSheetState';

const fallback = (over: Partial<{
  tier: Tier;
  isDestructive: boolean;
  affectedCount: number;
  physical: boolean;
  irreversible: boolean;
}> = {}) => ({
  tier: 'read_back' as Tier,
  isDestructive: false,
  affectedCount: 1,
  physical: false,
  irreversible: false,
  ...over,
});

const producerProjection = (over: Record<string, unknown> = {}) => ({
  policyVersion: 2,
  tier: 'deliberate',
  isDestructive: true,
  requiresPhysicalConfirm: true,
  affectedCount: 4,
  targetUserId: 42,
  entityRevision: 'assignment-77',
  reversibility: 'none',
  expiresAt: '2030-01-01T00:00:00.000Z',
  displayFields: {
    description: 'Cancel session 184',
    commandType: 'cancel_session',
    affectedCount: 4,
    targetUser: 42,
  },
  ...over,
});

const producerOperation = (over: Record<string, unknown> = {}) => ({
  id: 'op-g02',
  commandType: 'cancel_session',
  type: 'DELETE',
  description: 'Cancel session 184',
  params: { sessionId: 184, clientId: 42 },
  affectedCount: 4,
  clientId: 42,
  requiresPhysicalConfirm: true,
  expiresAt: '2030-01-01T00:00:00.000Z',
  projection: producerProjection(),
  ...over,
});

function decode(operation: Record<string, unknown>, input = fallback()) {
  return decodeConfirmationProjection(operation, input, armDelayMs);
}

const absentOrMalformed: Array<[string, unknown]> = [
  ['null', null],
  ['undefined', undefined],
  ['empty object', {}],
  ['primitive', 'legacy-looking'],
  ['array', []],
];

const duplicateConflicts: Array<[string, Record<string, unknown>]> = [
  ['affectedCount', { affectedCount: 1 }],
  ['requiresPhysicalConfirm', { requiresPhysicalConfirm: false }],
  ['destructive', { destructive: false }],
  ['description', { description: 'Different stored description' }],
  ['commandType', { commandType: 'different_command' }],
  ['clientId', { clientId: 99 }],
  ['expiresAt', { expiresAt: '2030-01-02T00:00:00.000Z' }],
];

function without(base: Record<string, unknown>, key: string) {
  const copy = { ...base };
  delete copy[key];
  return copy;
}

const malformedPresent: Array<[string, unknown]> = [
  ['wrong policy version', producerProjection({ policyVersion: 1 })],
  ['unknown tier', producerProjection({ tier: 'yolo' })],
  ['string destructive flag', producerProjection({ isDestructive: 'true' })],
  ['numeric physical flag', producerProjection({ requiresPhysicalConfirm: 1 })],
  ['null count', producerProjection({ affectedCount: null })],
  ['NaN count', producerProjection({ affectedCount: Number.NaN })],
  ['infinite count', producerProjection({ affectedCount: Number.POSITIVE_INFINITY })],
  ['negative count', producerProjection({ affectedCount: -1 })],
  ['fractional count', producerProjection({ affectedCount: 1.5 })],
  ['string count', producerProjection({ affectedCount: '4' })],
  ['zero target', producerProjection({ targetUserId: 0 })],
  ['negative target', producerProjection({ targetUserId: -2 })],
  ['fractional target', producerProjection({ targetUserId: 42.5 })],
  ['unsafe target', producerProjection({ targetUserId: Number.MAX_SAFE_INTEGER + 1 })],
  ['string target', producerProjection({ targetUserId: '42' })],
  ['missing policy version', without(producerProjection(), 'policyVersion')],
  ['missing tier', without(producerProjection(), 'tier')],
  ['missing destructive flag', without(producerProjection(), 'isDestructive')],
  ['missing physical flag', without(producerProjection(), 'requiresPhysicalConfirm')],
  ['missing count', without(producerProjection(), 'affectedCount')],
  ['missing target', without(producerProjection(), 'targetUserId')],
  ['missing entity revision', without(producerProjection(), 'entityRevision')],
  ['empty entity revision', producerProjection({ entityRevision: '' })],
  ['object entity revision', producerProjection({ entityRevision: { revision: 7 } })],
  ['missing reversibility', without(producerProjection(), 'reversibility')],
  ['unknown reversibility', producerProjection({ reversibility: 'rollback-maybe' })],
  ['missing expiry', without(producerProjection(), 'expiresAt')],
  ['empty expiry', producerProjection({ expiresAt: '' })],
  ['unparseable expiry', producerProjection({ expiresAt: 'tomorrow-ish' })],
  ['missing display fields', without(producerProjection(), 'displayFields')],
  ['array display fields', producerProjection({ displayFields: [] })],
  ['missing description', producerProjection({
    displayFields: { commandType: 'cancel_session', affectedCount: 4, targetUser: 42 },
  })],
  ['wrong description type', producerProjection({
    displayFields: { description: 184, commandType: 'cancel_session', affectedCount: 4, targetUser: 42 },
  })],
  ['missing command type', producerProjection({
    displayFields: { description: 'Cancel session 184', affectedCount: 4, targetUser: 42 },
  })],
  ['wrong command type', producerProjection({
    displayFields: { description: 'Cancel session 184', commandType: 184, affectedCount: 4, targetUser: 42 },
  })],
  ['display count mismatch', producerProjection({
    displayFields: { description: 'Cancel session 184', commandType: 'cancel_session', affectedCount: 1, targetUser: 42 },
  })],
  ['display target mismatch', producerProjection({
    displayFields: { description: 'Cancel session 184', commandType: 'cancel_session', affectedCount: 4, targetUser: 99 },
  })],
];

describe('G02 robustness — confirmation projection decoder', () => {
  it('R01: preserves a genuinely absent own projection property as legacy', () => {
    const legacy: Record<string, unknown> = { ...producerOperation() };
    delete legacy.projection;

    expect(decode(legacy)).toMatchObject({
      source: 'legacy',
      tier: 'read_back',
      affectedCount: 1,
    });
  });

  it.each(absentOrMalformed)(
    'R01: present %s projection is invalid rather than legacy',
    (label, projection) => {
      const decoded = decode({ ...producerOperation(), projection });
      expect(decoded.source, label).toBe('invalid');
    },
  );

  it('R02: accepts real producer shapes and omitted optional duplicates', () => {
    const decoded = decode(producerOperation());

    expect(decoded).toMatchObject({
      source: 'stored',
      tier: 'deliberate',
      isDestructive: true,
      affectedCount: 4,
      physical: true,
      irreversible: true,
    });

    const withoutDuplicates = {
      id: 'op-g02-no-duplicates',
      projection: producerProjection(),
    };
    expect(decode(withoutDuplicates)).toMatchObject({
      source: 'stored',
      tier: 'deliberate',
      affectedCount: 4,
    });
  });

  it('R02: accepts nullable producer fields when the signed projection is internally consistent', () => {
    const decoded = decode({
      id: 'op-g02-nullables',
      params: {},
      clientId: null,
      affectedCount: 4,
      projection: producerProjection({
        targetUserId: null,
        displayFields: {
          description: null,
          commandType: null,
          affectedCount: 4,
          targetUser: null,
        },
      }),
    });

    expect(decoded.source).toBe('stored');
    expect(decoded.affectedCount).toBe(4);
  });

  it.each(duplicateConflicts)(
    'R02: conflicting duplicated %s is invalid',
    (field, duplicate) => {
      const decoded = decode({ ...producerOperation(), ...duplicate });
      expect(decoded.source, field).toBe('invalid');
    },
  );

  it.each(malformedPresent)(
    'R01/R02: malformed present projection %s is invalid without throwing',
    (label, projection) => {
      const operation = { ...producerOperation(), projection };
      expect(() => decode(operation)).not.toThrow();
      expect(decode(operation).source, label).toBe('invalid');
    },
  );
});

