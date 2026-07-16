/**
 * Client plan-library catalog normalization.
 * ==========================================
 *
 * BLUEPRINT
 * Parent: ClientWorkoutPlansPanel.logic.
 * Responsibility: validate the server's seven-horizon catalog without leaking
 * transport-shaped objects into the mounted Client Hub surface.
 * Boundary: plan-specific field mapping is injected so this module owns catalog
 * reconciliation only and cannot become a second saved-plan mapper.
 */

import {
  PLAN_HORIZON_SLOTS,
  type ClientPlanHorizonSlot,
  type ClientPlanSummary,
  type ClientPlanVaultSummary,
  type HorizonKey,
} from './ClientWorkoutPlansPanel.types';

type ClientPlanNormalizer = (
  plan: Record<string, unknown>,
) => ClientPlanSummary | null;

const PLAN_HORIZON_KEYS = new Set<HorizonKey>(
  PLAN_HORIZON_SLOTS.map((slot) => slot.key),
);

export const normalizeCatalogHorizonKey = (value: unknown): HorizonKey | null => {
  const raw = typeof value === 'string'
    ? value.trim().toLowerCase().replace(/[\s-]+/g, '_')
    : '';
  return PLAN_HORIZON_KEYS.has(raw as HorizonKey) ? raw as HorizonKey : null;
};

const numberOrFallback = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const normalizeServerCatalogSlot = (
  value: unknown,
  normalizePlan: ClientPlanNormalizer,
): ClientPlanHorizonSlot | null => {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const horizonKey = normalizeCatalogHorizonKey(raw.horizonKey);
  if (!horizonKey) return null;

  const fallback = PLAN_HORIZON_SLOTS.find((slot) => slot.key === horizonKey);
  if (!fallback) return null;

  const rawPlan = raw.plan && typeof raw.plan === 'object'
    ? raw.plan as Record<string, unknown>
    : null;
  const plan = rawPlan
    ? normalizePlan({
        ...rawPlan,
        horizonKey,
        isPrimary: raw.isPrimary === true || rawPlan.isPrimary === true,
      })
    : null;
  const isPrimary = raw.isPrimary === true || plan?.isPrimary === true;

  return {
    horizonKey,
    label: typeof raw.label === 'string' && raw.label.trim() ? raw.label : fallback.label,
    durationWeeks: numberOrFallback(raw.durationWeeks, fallback.durationWeeks),
    durationDays: numberOrFallback(raw.durationDays, fallback.durationDays),
    isDefaultHorizon: raw.isDefaultHorizon === true || fallback.isDefault,
    isFilled: raw.isFilled === true || Boolean(plan),
    isPrimary,
    plan: plan ? { ...plan, isPrimary } : null,
  };
};

const emptyCatalogSlot = (
  horizon: typeof PLAN_HORIZON_SLOTS[number],
): ClientPlanHorizonSlot => ({
  horizonKey: horizon.key,
  label: horizon.label,
  durationWeeks: horizon.durationWeeks,
  durationDays: horizon.durationDays,
  isDefaultHorizon: horizon.isDefault,
  isFilled: false,
  isPrimary: false,
  plan: null,
});

const buildCatalogSlots = (serverSlots: ClientPlanHorizonSlot[]) => (
  PLAN_HORIZON_SLOTS.map((horizon) => (
    serverSlots.find((slot) => slot.horizonKey === horizon.key)
    || emptyCatalogSlot(horizon)
  ))
);

const slotPlan = (slot: ClientPlanHorizonSlot | undefined) => slot?.plan || null;
const findSlotPlanById = (slots: ClientPlanHorizonSlot[], planId: string | null) => (
  slotPlan(slots.find((slot) => slot.plan?.id === planId))
);
const findSlotPlanByHorizon = (
  slots: ClientPlanHorizonSlot[],
  horizonKey: HorizonKey | null,
) => slotPlan(slots.find((slot) => slot.horizonKey === horizonKey && slot.plan));
const findActivePrimarySlotPlan = (slots: ClientPlanHorizonSlot[]) => (
  slotPlan(slots.find((slot) => (
    slot.plan
    && slot.plan.status.trim().toLowerCase() === 'active'
    && (slot.isPrimary || slot.plan.isPrimary === true)
  )))
);
const findActiveSlotPlan = (slots: ClientPlanHorizonSlot[]) => (
  slotPlan(slots.find((slot) => slot.plan?.status.trim().toLowerCase() === 'active'))
);
const findPrimarySlotPlan = (slots: ClientPlanHorizonSlot[]) => (
  slotPlan(slots.find((slot) => slot.isPrimary && slot.plan))
);
const firstPlan = (plans: Array<ClientPlanSummary | null | undefined>) => (
  plans.find((plan): plan is ClientPlanSummary => Boolean(plan)) || null
);

const resolveCatalogPrimaryPlanId = (
  slots: ClientPlanHorizonSlot[],
  rawPrimaryPlanId: string | null,
  declaredPrimaryHorizon: HorizonKey | null,
) => firstPlan([
  findActivePrimarySlotPlan(slots),
  findActiveSlotPlan(slots),
  findSlotPlanById(slots, rawPrimaryPlanId),
  findPrimarySlotPlan(slots),
  findSlotPlanByHorizon(slots, declaredPrimaryHorizon),
])?.id || null;

const reconcileCatalogSlots = (
  slots: ClientPlanHorizonSlot[],
  primaryPlanId: string | null,
) => (
  primaryPlanId
    ? slots.map((slot) => {
        const isPrimary = slot.plan?.id === primaryPlanId;
        return {
          ...slot,
          isPrimary,
          plan: slot.plan ? { ...slot.plan, isPrimary } : null,
        };
      })
    : slots
);

const toRecord = (value: unknown): Record<string, unknown> | null => (
  value && typeof value === 'object' ? value as Record<string, unknown> : null
);

const rawPrimaryPlanId = (value: unknown) => (
  typeof value === 'number' || typeof value === 'string' ? String(value) : null
);

export const normalizeTrainingPlanCatalog = (
  value: unknown,
  normalizePlan: ClientPlanNormalizer,
): ClientPlanVaultSummary | null => {
  const raw = toRecord(value);
  if (!raw) return null;

  const serverSlots = (Array.isArray(raw.slots) ? raw.slots : [])
    .map((slot) => normalizeServerCatalogSlot(slot, normalizePlan))
    .filter((slot): slot is ClientPlanHorizonSlot => Boolean(slot));
  if (serverSlots.length === 0) return null;

  const slots = buildCatalogSlots(serverSlots);
  const declaredPrimaryHorizon = normalizeCatalogHorizonKey(raw.primaryHorizonKey);
  const primaryPlanId = resolveCatalogPrimaryPlanId(
    slots,
    rawPrimaryPlanId(raw.primaryPlanId),
    declaredPrimaryHorizon,
  );
  const reconciledSlots = reconcileCatalogSlots(slots, primaryPlanId);

  return {
    filledCount: reconciledSlots.filter((slot) => slot.isFilled).length,
    primaryPlanId,
    primaryHorizonKey: reconciledSlots.find((slot) => slot.isPrimary)?.horizonKey
      || declaredPrimaryHorizon
      || null,
    slots: reconciledSlots,
  };
};
