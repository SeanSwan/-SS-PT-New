/**
 * Fail-closed contracts for the Classroom Hermes Mac preparation package.
 *
 * This is not the privacy broker. It constrains public/synthetic planning
 * artifacts while the broker remains P0 BLOCKED/UNPROVEN.
 */

const CONTROLLED_TERMS = new Set([
  '24-36-months',
  'anaheim-hills-15mi',
  'borrow-or-free',
  'care-routine',
  'gross-motor',
  'indoor',
  'language',
  'materials',
  'on-hand',
  'outdoor',
  'process-art',
  'reusable',
  'sensory-reduced',
  'teacher-supply',
]);

const RADAR_CATEGORIES = new Set([
  'care-routine',
  'gross-motor',
  'language',
  'materials',
  'process-art',
]);
const MATERIAL_LANES = new Set(['on-hand', 'borrow-or-free', 'teacher-supply']);
const PROVENANCE = new Set(['verified', 'generated']);
const SAFETY_FLAGS = new Set([
  'allergy-check-required',
  'close-supervision',
  'cleanability-review',
  'recall-check-required',
  'small-parts-review',
]);
const TASK_CODES = new Set([
  'critique-generic-plan',
  'generate-public-activity-variants',
  'rank-public-opportunities',
]);

function result(errors, extra = {}) {
  return { ok: errors.length === 0, errors, ...extra };
}

function plainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function exactKeys(value, allowed, label, errors) {
  if (!plainObject(value)) {
    errors.push(`${label}:object-required`);
    return false;
  }
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) errors.push(`${label}:unexpected:${key}`);
  }
  for (const key of allowed) {
    if (!(key in value)) errors.push(`${label}:missing:${key}`);
  }
  return true;
}

function shortString(value, max = 240) {
  return typeof value === 'string' && value.length > 0 && value.length <= max
    && !/[<>\u0000-\u001f]/u.test(value);
}

function stringList(value, { maxItems = 12, maxLength = 80 } = {}) {
  return Array.isArray(value) && value.length <= maxItems
    && value.every((item) => shortString(item, maxLength));
}

function semverMajor(value) {
  const match = String(value).match(/^(\d+)/u);
  return match ? Number(match[1]) : 0;
}

export function validateMacFacts(facts) {
  const errors = [];
  const allowed = [
    'platform', 'architecture', 'chip', 'memoryBytes', 'freeDiskBytes',
    'macOSVersion', 'fileVaultEnabled', 'isStandardAccount', 'mdmEnrollment',
    'ownership', 'hermesInstalled', 'h0Installed', 'h0Adoption', 'directorPolicy',
  ];
  if (!exactKeys(facts, allowed, 'mac-facts', errors)) return result(errors, { blockers: [] });
  if (facts.platform !== 'darwin') errors.push('mac-facts:platform');
  if (!['arm64', 'x64'].includes(facts.architecture)) errors.push('mac-facts:architecture');
  if (!shortString(facts.chip, 120)) errors.push('mac-facts:chip');
  if (!Number.isSafeInteger(facts.memoryBytes) || facts.memoryBytes <= 0) errors.push('mac-facts:memory');
  if (!Number.isSafeInteger(facts.freeDiskBytes) || facts.freeDiskBytes <= 0) errors.push('mac-facts:disk');
  if (semverMajor(facts.macOSVersion) < 14) errors.push('mac-facts:macos-unsupported');
  if (!['not-enrolled', 'enrolled', 'unknown'].includes(facts.mdmEnrollment)) errors.push('mac-facts:mdm');
  if (!['personal', 'school', 'unresolved'].includes(facts.ownership)) errors.push('mac-facts:ownership');
  if (!['accepted', 'not-accepted', 'unknown', 'not-applicable'].includes(facts.h0Adoption)) errors.push('mac-facts:h0-adoption');
  if (!['approved', 'denied', 'unresolved'].includes(facts.directorPolicy)) errors.push('mac-facts:director-policy');

  const blockers = [];
  if (!facts.fileVaultEnabled) blockers.push('filevault');
  if (!facts.isStandardAccount) blockers.push('dedicated-standard-account');
  if (facts.mdmEnrollment === 'enrolled') blockers.push('mdm-owner-approval');
  if (facts.ownership === 'unresolved') blockers.push('ownership');
  if (facts.h0Installed && facts.h0Adoption === 'unknown') blockers.push('h0-adoption');
  if (facts.directorPolicy !== 'approved') blockers.push('director-policy');
  return result(errors, { blockers });
}

export function resolveAssistantMode(facts) {
  const memoryGb = Math.floor((facts.memoryBytes || 0) / 1024 ** 3);
  const localFloor = facts.h0Installed
    ? 'existing-h0-pending-64k-benchmark'
    : facts.architecture !== 'arm64' || memoryGb < 16
      ? 'template-only'
      : 'benchmark-small-local-or-template-only';
  return {
    mode: facts.h0Installed ? 'wrap-existing-h0' : 'install-hermes-single-front-door',
    visibleAssistantCount: 1,
    localFloor,
    remotePowerModel: 'qwen-3.8-27b-on-5090',
    preserveLegacyLauncherUntilAcceptance: Boolean(facts.h0Installed),
    runEnginesConcurrently: false,
  };
}

export function validateRadarQuery(query) {
  const errors = [];
  const allowed = ['category', 'ageBand', 'materialLane', 'radiusBand'];
  if (!exactKeys(query, allowed, 'radar-query', errors)) return result(errors);
  if (!RADAR_CATEGORIES.has(query.category)) errors.push('radar-query:category');
  if (query.ageBand !== '24-36-months') errors.push('radar-query:age-band');
  if (!MATERIAL_LANES.has(query.materialLane)) errors.push('radar-query:material-lane');
  if (query.radiusBand !== 'anaheim-hills-15mi') errors.push('radar-query:radius-band');
  return result(errors);
}

export function validateRadarCard(card) {
  const errors = [];
  const allowed = ['schemaVersion', 'title', 'ageBand', 'materials', 'safetyFlags', 'sourceUrl', 'provenance'];
  if (!exactKeys(card, allowed, 'radar-card', errors)) return result(errors);
  if (card.schemaVersion !== '1.0') errors.push('radar-card:schema');
  if (!shortString(card.title, 120)) errors.push('radar-card:title');
  if (card.ageBand !== '24-36-months') errors.push('radar-card:age-band');
  if (!stringList(card.materials, { maxItems: 8 })) errors.push('radar-card:materials');
  if (!Array.isArray(card.safetyFlags) || card.safetyFlags.some((flag) => !SAFETY_FLAGS.has(flag))) errors.push('radar-card:safety-flags');
  try {
    if (new URL(card.sourceUrl).protocol !== 'https:') errors.push('radar-card:source-url');
  } catch {
    errors.push('radar-card:source-url');
  }
  if (!PROVENANCE.has(card.provenance)) errors.push('radar-card:provenance');
  return result(errors);
}

export function validateSwanGuardOpportunity(card) {
  const errors = [];
  const allowed = ['schemaVersion', 'opportunityId', 'title', 'category', 'sourceUrl', 'provenance', 'safetyStatus'];
  if (!exactKeys(card, allowed, 'swanguard-opportunity', errors)) return result(errors);
  if (card.schemaVersion !== '1.0') errors.push('swanguard-opportunity:schema');
  if (!/^opp-[a-z0-9-]{3,80}$/u.test(card.opportunityId)) errors.push('swanguard-opportunity:id');
  if (!shortString(card.title, 120)) errors.push('swanguard-opportunity:title');
  if (!['activity', 'materials', 'public-event', 'resource'].includes(card.category)) errors.push('swanguard-opportunity:category');
  if (!PROVENANCE.has(card.provenance)) errors.push('swanguard-opportunity:provenance');
  if (!['approved', 'rejected', 'hold-for-human-review'].includes(card.safetyStatus)) errors.push('swanguard-opportunity:safety');
  try {
    if (new URL(card.sourceUrl).protocol !== 'https:') errors.push('swanguard-opportunity:source-url');
  } catch {
    errors.push('swanguard-opportunity:source-url');
  }
  return result(errors);
}

export function validateDailyCard(card) {
  const errors = [];
  const keys = ['schemaVersion', 'readTimeSeconds', 'coreInvitation', 'movement', 'transition', 'careRoutineFocus', 'safetyFlags', 'feedbackOptions'];
  if (!exactKeys(card, keys, 'daily-card', errors)) return result(errors);
  if (card.schemaVersion !== '1.0') errors.push('daily-card:schema');
  if (!Number.isInteger(card.readTimeSeconds) || card.readTimeSeconds < 1 || card.readTimeSeconds > 90) errors.push('daily-card:read-time');
  const coreKeys = ['title', 'goal', 'materials', 'launch', 'childActions', 'adultResponse', 'exit', 'adaptations'];
  if (exactKeys(card.coreInvitation, coreKeys, 'daily-card:core', errors)) {
    for (const key of ['title', 'goal', 'launch', 'adultResponse', 'exit']) {
      if (!shortString(card.coreInvitation[key], 240)) errors.push(`daily-card:core:${key}`);
    }
    for (const key of ['materials', 'childActions', 'adaptations']) {
      if (!stringList(card.coreInvitation[key], { maxItems: 8 })) errors.push(`daily-card:core:${key}`);
    }
  }
  for (const key of ['movement', 'transition', 'careRoutineFocus']) {
    if (!shortString(card[key], 240)) errors.push(`daily-card:${key}`);
  }
  if (!Array.isArray(card.safetyFlags) || card.safetyFlags.some((flag) => !SAFETY_FLAGS.has(flag))) errors.push('daily-card:safety-flags');
  if (!Array.isArray(card.feedbackOptions) || card.feedbackOptions.join('|') !== 'used|adapted|skipped') errors.push('daily-card:feedback');
  return result(errors);
}

export function checkLocalAllergySafety({ localRoster, materialAllergenCodes }) {
  const rosterCodes = new Set((localRoster || []).flatMap((entry) => entry.allergyCodes || []));
  const matches = [...new Set(materialAllergenCodes || [])].filter((code) => rosterCodes.has(code)).sort();
  return {
    status: matches.length ? 'hold' : 'pass',
    flags: matches.map((code) => `allergen-match:${code}`),
  };
}

export function buildGenericGpuRequest({ activityPatternId, controlledTerms, publicSourceIds }) {
  return {
    schemaVersion: '1.0',
    classification: 'public-or-synthetic',
    activityPatternId,
    controlledTerms: [...controlledTerms],
    publicSourceIds: [...publicSourceIds],
  };
}

export function validateExternalEnvelope(envelope) {
  const errors = [];
  const allowed = ['schemaVersion', 'classification', 'controlledTerms', 'publicSourceIds', 'taskCode'];
  if (!exactKeys(envelope, allowed, 'external-envelope', errors)) return result(errors);
  if (envelope.schemaVersion !== '1.0') errors.push('external-envelope:schema');
  if (envelope.classification !== 'public-or-synthetic') errors.push('external-envelope:classification');
  if (!stringList(envelope.controlledTerms, { maxItems: 12 }) || envelope.controlledTerms.some((term) => !CONTROLLED_TERMS.has(term))) errors.push('external-envelope:controlled-terms');
  if (!Array.isArray(envelope.publicSourceIds) || envelope.publicSourceIds.length > 12
    || envelope.publicSourceIds.some((id) => !/^public-source-[a-z0-9-]{3,80}$/u.test(id))) errors.push('external-envelope:source-ids');
  if (!TASK_CODES.has(envelope.taskCode)) errors.push('external-envelope:task-code');
  return result(errors);
}

