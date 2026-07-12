/**
 * Atomic, idempotent persistence for reviewed NutritionEntryDraft v1 payloads.
 * Client confidence labels are advisory; server policy owns trust and review state.
 */
import sequelize from '../../database.mjs';
import DailyMacroLog from '../../models/DailyMacroLog.mjs';
import NutritionSourceRecord from '../../models/NutritionSourceRecord.mjs';
import { buildMacroRow } from './macroLogService.mjs';
import {
  hasDurableProviderReference,
  nutritionDraftDigest,
  nutritionEntryReceipt,
  resolveNutritionSourceConfidence,
} from './nutritionDraftIntegrity.mjs';
import { reconcileNutritionCalories } from './nutritionReconciliation.mjs';

const MAX_FOODS = 20;
const DRAFT_ID_PATTERN = /^[A-Za-z0-9._:-]{1,100}$/;
const ALLOWED_SOURCES = new Set(['manual', 'voice', 'photo', 'search', 'restaurant', 'barcode', 'meal-plan']);
const ALLOWED_PROXIMITY = new Set(['none', 'pre_workout', 'intra_workout', 'post_workout']);
const ALLOWED_SERVING_BASIS = new Set(['label', 'per_100g', 'weighed', 'household', 'estimated']);
const NEEDS_REVIEW_REASONS = new Set([
  'barcode_unmatched',
  'client_requested',
  'metabolic_deviation',
  'unverified_estimate',
]);

const ROUTE_SOURCE = {
  manual: 'manual',
  voice: 'voice',
  photo: 'food-scanner',
  search: 'usda_lookup',
  restaurant: 'usda_lookup',
  barcode: 'barcode',
  'meal-plan': 'ai-chat',
};

const DEFAULT_CONFIDENCE = {
  provider: 0.85,
  community: 0.6,
  ai_estimate: 0.45,
};

export class NutritionDraftValidationError extends Error {}
export class NutritionDraftConflictError extends Error {}

const safeText = (value, maxLength) =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, maxLength) : '';

const strictNonNegativeNumber = (value) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.round(value * 10) / 10
    : null;

const strictPositiveNumber = (value) => {
  const number = strictNonNegativeNumber(value);
  return number !== null && number > 0 ? number : null;
};

const strictConfidence = (value, fallback) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) return fallback;
  return Math.min(Math.round(value * 100) / 100, fallback);
};

const sanitizeRawPayloadRef = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const provider = safeText(value.provider, 100);
  const externalId = safeText(value.externalId, 120);
  const barcode = typeof value.barcode === 'string' && /^\d{8,14}$/.test(value.barcode)
    ? value.barcode
    : '';
  const schemaVersion = safeText(value.schemaVersion, 30);
  const capturedAt = typeof value.capturedAt === 'string'
    && !Number.isNaN(Date.parse(value.capturedAt))
    ? value.capturedAt
    : '';

  const ref = {};
  if (provider) ref.provider = provider;
  if (externalId) ref.externalId = externalId;
  if (barcode) ref.barcode = barcode;
  if (schemaVersion) ref.schemaVersion = schemaVersion;
  if (capturedAt) ref.capturedAt = capturedAt;
  return Object.keys(ref).length > 0 ? ref : null;
};

const validateDraft = (draft, userId) => {
  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) {
    throw new NutritionDraftValidationError('Draft body is required');
  }
  if (draft.contractVersion !== '1.0') {
    throw new NutritionDraftValidationError('Unsupported draft contract');
  }
  if (typeof draft.draftId !== 'string' || !DRAFT_ID_PATTERN.test(draft.draftId)) {
    throw new NutritionDraftValidationError('Invalid draft id');
  }
  if (draft.userId !== null && draft.userId !== undefined
      && (!Number.isSafeInteger(draft.userId) || draft.userId !== userId)) {
    throw new NutritionDraftValidationError('Cross-user draft denied');
  }
  if (!ALLOWED_SOURCES.has(draft.source)) {
    throw new NutritionDraftValidationError('Invalid draft source');
  }
  if (!Array.isArray(draft.foods) || draft.foods.length < 1 || draft.foods.length > MAX_FOODS) {
    throw new NutritionDraftValidationError('Draft must contain 1-20 foods');
  }
};

const normalizeServing = (serving) => ({
  basis: ALLOWED_SERVING_BASIS.has(serving?.basis) ? serving.basis : 'estimated',
  quantity: strictPositiveNumber(serving?.quantity),
  unit: safeText(serving?.unit, 30) || 'serving',
  label: safeText(serving?.label, 100),
});

const resolveReviewReason = (draft, reconciliation, sourceConfidence) => {
  if (draft.reviewRequested === true) return 'client_requested';
  if (draft.source === 'barcode' && draft.reviewReason === 'barcode_unmatched') {
    return 'barcode_unmatched';
  }
  if (reconciliation.status === 'metabolic_deviation') return 'metabolic_deviation';
  if (draft.source === 'manual' && sourceConfidence === 'community') return null;
  if (sourceConfidence === 'ai_estimate' || sourceConfidence === 'community') {
    return 'unverified_estimate';
  }
  if (sourceConfidence === 'provider') return 'provider_estimate';
  return null;
};

const buildEntryAttributes = (food, draft, context) => {
  const description = safeText(food?.description, 500);
  if (!description) throw new NutritionDraftValidationError('Food description is required');

  const nutrients = food?.nutrients && typeof food.nutrients === 'object' ? food.nutrients : {};
  const serving = normalizeServing(food?.serving);
  const reconciliation = reconcileNutritionCalories(nutrients);
  const reviewReason = resolveReviewReason(draft, reconciliation, context.sourceConfidence);
  const reviewStatus = NEEDS_REVIEW_REASONS.has(reviewReason) ? 'needs_review' : 'client_confirmed';
  const confidenceScore = strictConfidence(food?.confidence, context.defaultConfidence);

  let base;
  try {
    base = buildMacroRow({
      date: draft.date,
      mealType: food?.mealType,
      description,
      calories: nutrients.calories,
      protein: nutrients.protein,
      carbs: nutrients.carbs,
      fat: nutrients.fat,
      fiber: nutrients.fiber,
      sugar: nutrients.sugar,
      sodium: nutrients.sodium,
      items: [{
        id: safeText(food?.id, 100) || undefined,
        name: description.slice(0, 150),
        serving: serving.label || [serving.quantity, serving.unit].filter(Boolean).join(' '),
        provider: safeText(food?.provider, 100) || draft.sourceLabel,
        source: draft.source,
        confidence: confidenceScore,
      }],
    }, { userId: context.userId, source: ROUTE_SOURCE[draft.source] });
  } catch (error) {
    throw new NutritionDraftValidationError(error.message);
  }

  return {
    ...base,
    sourceRecordId: null,
    loggedByUserId: context.loggedByUserId,
    contractVersion: draft.contractVersion,
    draftId: draft.draftId,
    workoutProximity: context.workoutProximity,
    servingBasis: serving.basis,
    servingQuantity: serving.quantity,
    servingUnit: serving.unit,
    caloriesReported: reconciliation.reportedCalories,
    caloriesCalculated: reconciliation.calculatedCalories,
    reconciliationStatus: reconciliation.status,
    confidenceScore,
    reviewStatus,
    reviewReason,
    brandName: safeText(food?.brandName, 200) || null,
    mealSource: draft.source === 'barcode' ? 'packaged' : null,
  };
};

export async function saveReviewedNutritionDraft(draft, { userId, loggedByUserId }) {
  const safeUserId = Number(userId);
  const safeLoggedByUserId = Number(loggedByUserId);
  if (!Number.isSafeInteger(safeUserId) || safeUserId < 1
      || !Number.isSafeInteger(safeLoggedByUserId) || safeLoggedByUserId < 1) {
    throw new NutritionDraftValidationError('Valid user context is required');
  }
  validateDraft(draft, safeUserId);

  const rawPayloadRef = sanitizeRawPayloadRef(draft.rawPayloadRef);
  if (!hasDurableProviderReference(draft.source, rawPayloadRef)) {
    throw new NutritionDraftValidationError('Durable provider reference is required');
  }
  const sourceConfidence = resolveNutritionSourceConfidence(
    draft.source,
    rawPayloadRef,
    draft.reviewReason,
  );
  const workoutProximity = ALLOWED_PROXIMITY.has(draft.workoutProximity)
    ? draft.workoutProximity
    : 'none';
  const defaultConfidence = DEFAULT_CONFIDENCE[sourceConfidence];
  const entryPlans = draft.foods.map((food) => buildEntryAttributes(food, draft, {
    userId: safeUserId,
    loggedByUserId: safeLoggedByUserId,
    workoutProximity,
    sourceConfidence,
    defaultConfidence,
  }));
  const payloadDigest = nutritionDraftDigest({
    userId: safeUserId,
    loggedByUserId: safeLoggedByUserId,
    source: draft.source,
    sourceLabel: safeText(draft.sourceLabel, 120) || null,
    rawPayloadRef,
    workoutProximity,
    entries: entryPlans,
  });

  return sequelize.transaction(async (transaction) => {
    const [sourceRecord, created] = await NutritionSourceRecord.findOrCreate({
      where: { userId: safeUserId, draftId: draft.draftId },
      defaults: {
        userId: safeUserId,
        loggedByUserId: safeLoggedByUserId,
        draftId: draft.draftId,
        contractVersion: draft.contractVersion,
        source: draft.source,
        sourceLabel: safeText(draft.sourceLabel, 120) || null,
        sourceConfidence,
        confidenceScore: defaultConfidence,
        workoutProximity,
        rawPayloadRef,
        payloadDigest,
        status: 'processing',
        entryCount: 0,
      },
      transaction,
    });

    if (!created) {
      if (sourceRecord.status !== 'committed' || sourceRecord.payloadDigest !== payloadDigest) {
        throw new NutritionDraftConflictError('Draft id conflicts with another payload');
      }
      const entries = await DailyMacroLog.findAll({
        where: { sourceRecordId: sourceRecord.id },
        order: [['id', 'ASC']],
        transaction,
      });
      if (entries.length < 1 || entries.length !== sourceRecord.entryCount) {
        throw new NutritionDraftConflictError('Committed draft receipt does not match stored rows');
      }
      return {
        replayed: true,
        entries: entries.map(nutritionEntryReceipt),
        sourceRecordId: sourceRecord.id,
      };
    }

    const entries = [];
    for (const plan of entryPlans) {
      entries.push(await DailyMacroLog.create({
        ...plan,
        sourceRecordId: sourceRecord.id,
      }, { transaction }));
    }

    await sourceRecord.update({
      status: 'committed',
      entryCount: entries.length,
    }, { transaction });

    return {
      replayed: false,
      entries: entries.map(nutritionEntryReceipt),
      sourceRecordId: sourceRecord.id,
    };
  });
}
