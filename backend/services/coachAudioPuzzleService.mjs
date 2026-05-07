/**
 * coachAudioPuzzleService.mjs
 * ===========================
 * Deterministic audio-piece ordering and grouping helpers for Swan Coach.
 * This service emits compact evidence and confidence facts only.
 */

const AUTO_BUNDLE_THRESHOLD = 0.78;
const REVIEW_BUNDLE_THRESHOLD = 0.55;

function cleanId(value, fallback) {
  const text = String(value || fallback || '').replace(/[^\w:.-]/g, '').slice(0, 96);
  return text || fallback;
}

function parseTime(value) {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
}

function cleanList(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .map((entry) => String(entry || '').trim().toLowerCase().replace(/[^\w\s-]/g, ''))
    .filter(Boolean)
    .slice(0, 12))];
}

function normalizeArtifact(raw, index) {
  const recordedAtStartMs = parseTime(raw?.recordedAtStart || raw?.recorded_at_start);
  const uploadedAtMs = parseTime(raw?.uploadedAt || raw?.uploaded_at);
  const manualOrder = Number.parseInt(raw?.manualOrder ?? raw?.manual_order, 10);

  return {
    id: cleanId(raw?.id || raw?.sourceRef || raw?.source_ref, `artifact-${index + 1}`),
    recordedAtStartMs,
    uploadedAtMs,
    sourceBatchId: cleanId(raw?.sourceBatchId || raw?.source_batch_id, ''),
    candidateClientTokens: cleanList(raw?.candidateClientTokens || raw?.candidate_client_tokens),
    exerciseTags: cleanList(raw?.exerciseTags || raw?.exercise_tags),
    manualOrder: Number.isFinite(manualOrder) ? manualOrder : null,
    inputIndex: index,
  };
}

function sortArtifacts(a, b) {
  const aRecorded = a.recordedAtStartMs ?? Number.MAX_SAFE_INTEGER;
  const bRecorded = b.recordedAtStartMs ?? Number.MAX_SAFE_INTEGER;
  if (aRecorded !== bRecorded) return aRecorded - bRecorded;

  const aOrder = a.manualOrder ?? Number.MAX_SAFE_INTEGER;
  const bOrder = b.manualOrder ?? Number.MAX_SAFE_INTEGER;
  if (aOrder !== bOrder) return aOrder - bOrder;

  const aUploaded = a.uploadedAtMs ?? Number.MAX_SAFE_INTEGER;
  const bUploaded = b.uploadedAtMs ?? Number.MAX_SAFE_INTEGER;
  if (aUploaded !== bUploaded) return aUploaded - bUploaded;

  return a.inputIndex - b.inputIndex;
}

function intersects(left = [], right = []) {
  const rightSet = new Set(right);
  return left.some((entry) => rightSet.has(entry));
}

function temporalScore(left, right, evidence) {
  if (left.recordedAtStartMs == null || right.recordedAtStartMs == null) return 0;
  const minutes = Math.round(Math.abs(right.recordedAtStartMs - left.recordedAtStartMs) / 60000);
  evidence.push(`recorded_gap:${minutes}m`);
  if (minutes <= 10) return 0.35;
  if (minutes <= 30) return 0.28;
  if (minutes <= 60) return 0.18;
  if (minutes <= 120) return 0.08;
  return 0;
}

function scorePair(left, right) {
  const evidence = [];
  let score = temporalScore(left, right, evidence);

  if (left.candidateClientTokens.length && right.candidateClientTokens.length
      && intersects(left.candidateClientTokens, right.candidateClientTokens)) {
    score += 0.2;
    evidence.push('client_hint');
  }

  if (left.exerciseTags.length && right.exerciseTags.length
      && intersects(left.exerciseTags, right.exerciseTags)) {
    score += 0.2;
    evidence.push('exercise_overlap');
  }

  if (left.sourceBatchId && left.sourceBatchId === right.sourceBatchId) {
    score += 0.15;
    evidence.push('source_batch');
  }

  if (left.manualOrder != null && right.manualOrder != null
      && Math.abs(right.manualOrder - left.manualOrder) === 1) {
    score += 0.1;
    evidence.push('manual_adjacency');
  }

  const rounded = Number(score.toFixed(3));
  const decision = rounded >= AUTO_BUNDLE_THRESHOLD
    ? 'auto_bundle'
    : rounded >= REVIEW_BUNDLE_THRESHOLD
      ? 'review_bundle'
      : 'separate';

  return {
    leftId: left.id,
    rightId: right.id,
    score: rounded,
    decision,
    evidence,
  };
}

function makeSingleBundle(artifact) {
  return {
    artifactIds: [artifact.id],
    score: 0,
    decision: 'single',
    needsReview: false,
    evidence: [],
  };
}

function confidenceFromPlan({ artifactCount, pairDecisions, needsOrderingReview }) {
  if (artifactCount <= 1) return 'single';
  if (needsOrderingReview || pairDecisions.some((pair) => pair.decision === 'review_bundle')) return 'low';
  if (pairDecisions.length && pairDecisions.every((pair) => pair.decision === 'auto_bundle')) return 'high';
  return 'medium';
}

export function buildAudioPuzzlePlan(artifacts = []) {
  const ordered = artifacts
    .map(normalizeArtifact)
    .sort(sortArtifacts);

  const pairDecisions = [];
  const bundles = [];
  let currentBundle = null;
  let currentPair = null;

  ordered.forEach((artifact, index) => {
    if (index === 0) {
      currentBundle = makeSingleBundle(artifact);
      return;
    }

    const pair = scorePair(ordered[index - 1], artifact);
    pairDecisions.push(pair);

    if (pair.decision === 'separate') {
      bundles.push(currentBundle);
      currentBundle = makeSingleBundle(artifact);
      currentPair = null;
      return;
    }

    currentPair = pair;
    currentBundle.artifactIds.push(artifact.id);
    currentBundle.score = Math.max(currentBundle.score, pair.score);
    currentBundle.decision = pair.decision;
    currentBundle.needsReview = pair.decision === 'review_bundle';
    currentBundle.evidence = [...new Set([...currentBundle.evidence, ...pair.evidence])];
  });

  if (currentBundle) bundles.push(currentBundle);

  const missingRecordedTimes = ordered.filter((artifact) => artifact.recordedAtStartMs == null).length;
  const needsOrderingReview = ordered.length > 1
    && (missingRecordedTimes > 0 || pairDecisions.some((pair) => pair.decision === 'review_bundle'));

  return {
    orderedArtifactIds: ordered.map((artifact) => artifact.id),
    pieceCount: ordered.length,
    bundles,
    pairDecisions,
    needsOrderingReview,
    confidence: confidenceFromPlan({
      artifactCount: ordered.length,
      pairDecisions,
      needsOrderingReview,
    }),
    lastPairDecision: currentPair,
  };
}

export function summarizeAudioPuzzleForContext(plan = {}) {
  const pieceCount = Math.max(0, Math.min(99, Number.parseInt(plan.pieceCount, 10) || 0));
  const bundleCount = Array.isArray(plan.bundles)
    ? Math.max(0, Math.min(99, plan.bundles.length))
    : Math.max(0, Math.min(99, Number.parseInt(plan.bundleCount, 10) || 0));
  const autoBundleCount = Array.isArray(plan.bundles)
    ? plan.bundles.filter((bundle) => bundle?.decision === 'auto_bundle').length
    : Math.max(0, Math.min(99, Number.parseInt(plan.autoBundleCount, 10) || 0));

  return {
    pieceCount,
    bundleCount,
    autoBundleCount,
    needsOrderingReview: plan.needsOrderingReview === true,
    confidence: ['single', 'high', 'medium', 'low'].includes(plan.confidence)
      ? plan.confidence
      : 'low',
  };
}

export function audioPuzzleSummaryForQueue({ sourceType, metadata = {} } = {}) {
  if (metadata.audioPuzzle && typeof metadata.audioPuzzle === 'object' && !Array.isArray(metadata.audioPuzzle)) {
    return summarizeAudioPuzzleForContext(metadata.audioPuzzle);
  }
  if (sourceType !== 'voice_note' && sourceType !== 'audio_upload' && sourceType !== 'plaud_clip') {
    return null;
  }
  return {
    pieceCount: 1,
    bundleCount: 1,
    autoBundleCount: 0,
    needsOrderingReview: false,
    confidence: 'single',
  };
}

export const _internal = {
  normalizeArtifact,
  scorePair,
  sortArtifacts,
};
