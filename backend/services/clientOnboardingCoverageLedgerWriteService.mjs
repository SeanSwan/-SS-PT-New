/**
 * clientOnboardingCoverageLedgerWriteService.mjs
 * ==============================================
 * Deterministic write helpers for the non-gating onboarding coverage ledger.
 * These helpers store operational follow-up state, not onboarding completion.
 */
import { getClientOnboardingCoverageItem } from '../models/index.mjs';

export const COVERAGE_STATUSES = new Set([
  'known',
  'unknown',
  'trainer_pending',
  'client_requested',
  'not_applicable',
  'blocked',
]);

const STATUS_ALIASES = Object.freeze({
  ask_client_later: 'client_requested',
  ask_later: 'client_requested',
});
const RESOLVED_STATUSES = new Set(['known', 'not_applicable']);
const SAFE_REF_PATTERN = /^[A-Za-z0-9:_./-]{1,80}$/;

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function cleanText(value, maxLength = 500) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function safeEvidenceRefs(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanText(item, 80))
    .filter((item) => item && SAFE_REF_PATTERN.test(item))
    .slice(0, 20);
}

function getExistingValue(existing, key) {
  return existing?.[key] ?? existing?.get?.(key) ?? null;
}

export function normalizeCoverageStatus(value) {
  const normalized = STATUS_ALIASES[value] || value || 'unknown';
  return COVERAGE_STATUSES.has(normalized) ? normalized : 'unknown';
}

export function normalizeCoverageItem(item, { clientId, actorId, proposalId = null } = {}) {
  if (!isPlainObject(item)) return null;
  const coverageKey = cleanText(item.fieldKey || item.coverageKey || item.key, 120);
  if (!coverageKey) return null;
  const status = normalizeCoverageStatus(item.status);
  const metadata = {
    source: cleanText(item.source, 80) || 'trainer_dictation',
    confidence: typeof item.confidence === 'number' ? item.confidence : null,
    requiredFor: Array.isArray(item.requiredFor) ? item.requiredFor.slice(0, 10) : [],
    chartDataPriority: Number.isInteger(item.chartDataPriority) ? item.chartDataPriority : 0,
    evidenceRefs: safeEvidenceRefs(item.evidenceRefs),
    isSensitive: item.isSensitive === true,
    proposalId: cleanText(proposalId, 80),
  };

  return {
    clientId,
    coverageKey,
    label: cleanText(item.label, 160) || coverageKey,
    category: cleanText(item.category, 80) || 'general',
    status,
    value: item.value ?? item.valueJson ?? null,
    notes: cleanText(item.notes, 2000),
    requestedFromClient: item.requestedFromClient === true || status === 'client_requested',
    blockerReason: cleanText(item.blockerReason, 500),
    lastMarkedBy: actorId || null,
    lastMarkedAt: new Date(),
    metadata,
  };
}

function applyFollowUpTimestamps(item, existing, now) {
  const next = { ...item };
  if (next.status === 'client_requested') {
    next.requestedFromClient = true;
    next.requestedFromClientAt = getExistingValue(existing, 'requestedFromClientAt') || next.requestedFromClientAt || now;
    next.resolvedAt = null;
    return next;
  }
  if (RESOLVED_STATUSES.has(next.status)) {
    next.requestedFromClient = false;
    next.resolvedAt = getExistingValue(existing, 'resolvedAt') || next.resolvedAt || now;
    return next;
  }
  next.resolvedAt = null;
  return next;
}

function toWrittenItem(item, action) {
  return {
    coverageKey: item.coverageKey,
    action,
    status: item.status,
    label: item.label,
    category: item.category,
    requestedFromClientAt: item.requestedFromClientAt || null,
    resolvedAt: item.resolvedAt || null,
    metadata: item.metadata || {},
  };
}

export async function upsertCoverageItems({
  clientId,
  items,
  actorId,
  proposalId = null,
  CoverageItemModel = null,
  transaction = null,
} = {}) {
  const Model = CoverageItemModel || getClientOnboardingCoverageItem();
  const normalized = Array.isArray(items)
    ? items.map((item) => normalizeCoverageItem(item, { clientId, actorId, proposalId })).filter(Boolean)
    : [];
  const written = [];
  const now = new Date();

  for (const item of normalized) {
    const existing = await Model.findOne({
      where: { clientId, coverageKey: item.coverageKey },
      transaction,
    });
    const persistable = applyFollowUpTimestamps(item, existing, now);
    if (existing?.update) {
      await existing.update(persistable, { transaction });
      written.push(toWrittenItem(persistable, 'updated'));
    } else {
      await Model.create(persistable, { transaction });
      written.push(toWrittenItem(persistable, 'created'));
    }
  }

  return { upserted: written.length, items: written };
}