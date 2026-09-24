/**
 * Decode the stored confirmation policy before any ceremony or display.
 * G02: only an absent projection is legacy. Present-invalid policy fails closed.
 * The server remains the signing/authorization authority.
 */
import type { Tier } from './confirmationSheetState';

export interface ConfirmationProjection {
  policyVersion: number;
  tier: string;
  isDestructive: boolean;
  requiresPhysicalConfirm: boolean;
  affectedCount: number;
  targetUserId: number | null;
  /** Opaque identity snapshot; this is not a database row revision. */
  entityRevision: string;
  reversibility: string;
  expiresAt: string;
  displayFields: {
    description: string | null;
    commandType: string | null;
    affectedCount: number;
    targetUser: number | null;
  };
}

export interface DecodedSheetInput {
  source: 'stored' | 'legacy' | 'invalid';
  tier: Tier;
  isDestructive: boolean;
  affectedCount: number;
  physical: boolean;
  irreversible: boolean;
  targetUserId: number | null;
  displayFields?: ConfirmationProjection['displayFields'];
}

const TIERS: ReadonlySet<string> = new Set([
  'fire_and_forget', 'read_back', 'deliberate', 'refusal',
]);
const REVERSIBILITY = new Set(['none', 'inverse', 'compensation']);

export const LEGACY_IRREVERSIBLE: ReadonlySet<string> = new Set([
  'notify_client', 'delete_post', 'export_client_list', 'delete_workout_plan',
]);

const INVALID: DecodedSheetInput = {
  source: 'invalid', tier: 'read_back', isDestructive: false,
  affectedCount: 0, physical: false, irreversible: false, targetUserId: null,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function nullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function validTarget(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isSafeInteger(value) && value > 0);
}

function timestamp(value: unknown): number | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function validProjection(value: unknown, stored: Record<string, unknown>): value is ConfirmationProjection {
  if (!isRecord(value) || value.policyVersion !== 2
    || typeof value.tier !== 'string' || !TIERS.has(value.tier)
    || typeof value.isDestructive !== 'boolean'
    || typeof value.requiresPhysicalConfirm !== 'boolean'
    || typeof value.affectedCount !== 'number'
    || !Number.isInteger(value.affectedCount) || value.affectedCount < 0
    || !validTarget(value.targetUserId)
    || typeof value.entityRevision !== 'string' || !value.entityRevision.trim()
    || typeof value.reversibility !== 'string' || !REVERSIBILITY.has(value.reversibility)
    || timestamp(value.expiresAt) === null
    || !isRecord(value.displayFields)) return false;

  const display = value.displayFields;
  if (!nullableString(display.description) || !nullableString(display.commandType)
    || display.affectedCount !== value.affectedCount
    || display.targetUser !== value.targetUserId) return false;

  // Pending mints omit top-level count. Validate duplicates only when supplied;
  // never invent required top-level fields absent from the actual producer.
  const duplicates: Array<[string, unknown]> = [
    ['affectedCount', value.affectedCount],
    ['requiresPhysicalConfirm', value.requiresPhysicalConfirm],
    ['destructive', value.isDestructive],
    ['description', display.description],
    ['commandType', display.commandType],
    ['clientId', value.targetUserId],
  ];
  if (duplicates.some(([key, expected]) => stored[key] !== undefined && stored[key] !== expected)) return false;
  if (stored.expiresAt !== undefined
    && timestamp(stored.expiresAt) !== timestamp(value.expiresAt)) return false;
  return true;
}

function asNumber(value: unknown): number | null {
  const number = typeof value === 'string' || typeof value === 'number' ? Number(value) : NaN;
  return Number.isFinite(number) && number > 0 ? number : null;
}

export function decodeConfirmationProjection(
  operation: Record<string, unknown> | null | undefined,
  fallbacks: { tier: Tier; isDestructive: boolean; affectedCount: number; physical: boolean; irreversible: boolean },
  armDelayFn: (input: { tier: Tier; isDestructive: boolean; affectedCount: number }) => number,
): DecodedSheetInput {
  if (!isRecord(operation)) return { ...INVALID };
  if (Object.prototype.hasOwnProperty.call(operation, 'projection')) {
    const projection = operation.projection;
    if (!validProjection(projection, operation)) return { ...INVALID };
    return {
      source: 'stored',
      tier: projection.tier as Tier,
      isDestructive: projection.isDestructive,
      affectedCount: projection.affectedCount,
      physical: projection.requiresPhysicalConfirm,
      irreversible: projection.reversibility === 'none' && projection.isDestructive,
      targetUserId: projection.targetUserId,
      displayFields: projection.displayFields,
    };
  }

  // Preserve the pre-G02 compatibility rules only for genuinely absent policy.
  const commandType = typeof operation.commandType === 'string' ? operation.commandType : '';
  const isDestructive = operation.destructive === true ? true : fallbacks.isDestructive;
  const params = (operation.params ?? {}) as Record<string, unknown>;
  const legacy: DecodedSheetInput = {
    source: 'legacy',
    tier: fallbacks.tier,
    isDestructive,
    affectedCount: fallbacks.affectedCount,
    physical: Boolean(operation.requiresPhysicalConfirm ?? fallbacks.physical),
    irreversible: fallbacks.irreversible || isDestructive || LEGACY_IRREVERSIBLE.has(commandType),
    targetUserId: asNumber(params.clientId ?? operation.clientId),
  };
  void armDelayFn(legacy);
  return legacy;
}

export default { decodeConfirmationProjection, LEGACY_IRREVERSIBLE };
