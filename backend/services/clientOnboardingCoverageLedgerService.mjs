/**
 * clientOnboardingCoverageLedgerService.mjs
 * =========================================
 * Computes a non-gating onboarding coverage ledger from the shared Swan Coach
 * question bank. Missing rows are operational follow-ups only; workout logging
 * must remain available while fields are unknown, requested, or blocked.
 */
import { getClientOnboardingCoverageFields } from '../../shared/clientOnboardingQuestionBank.mjs';

const FOLLOW_UP_CLEAR_STATUSES = new Set(['known', 'not_applicable']);

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const normalizeSource = (value) => {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return isPlainObject(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return isPlainObject(value) ? value : {};
};

const normalizeStatus = (value) => {
  if (value === 'ask_client_later') return 'client_requested';
  return value || 'unknown';
};

const isPlaceholderValue = (value) =>
  typeof value === 'string' && /@stub\.swanstudios\.com$/i.test(value);

const hasValue = (value) => {
  if (value === null || value === undefined) return false;
  if (isPlaceholderValue(value)) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (isPlainObject(value)) return Object.keys(value).length > 0;
  return true;
};

const readPath = (context, path) => {
  if (!path) return undefined;
  return path.split('.').reduce((cursor, segment) => (
    cursor === null || cursor === undefined ? undefined : cursor[segment]
  ), context);
};

const firstKnownPathValue = (context, paths = []) => {
  for (const path of paths) {
    const value = readPath(context, path);
    if (hasValue(value)) return { path, value };
  }
  return null;
};

const allGroupsCovered = (context, groups = []) => {
  if (!Array.isArray(groups) || groups.length === 0) return null;
  const values = [];
  for (const group of groups) {
    const match = firstKnownPathValue(context, group);
    if (!match) return null;
    values.push(match.value);
  }
  return values;
};

const buildContext = ({ client = {}, draft = {}, questionnaire = {}, responses = null } = {}) => {
  const normalizedClient = normalizeSource(client);
  const normalizedDraft = normalizeSource(draft);
  const normalizedQuestionnaire = normalizeSource(questionnaire);
  const normalizedResponses = normalizeSource(responses ?? normalizedQuestionnaire.responsesJson);
  return {
    client: normalizedClient,
    draft: normalizedDraft,
    questionnaire: normalizedQuestionnaire,
    responses: normalizedResponses,
    coverageItems: Array.isArray(normalizedDraft.coverageItems) ? normalizedDraft.coverageItems : [],
    masterPrompt: normalizeSource(
      normalizedClient.masterPromptJson || normalizedDraft.masterPromptJson || normalizedQuestionnaire.masterPromptJson,
    ),
  };
};

const buildItem = (definition, context) => {
  const groupedValue = allGroupsCovered(context, definition.groups);
  const pathValue = groupedValue ? null : firstKnownPathValue(context, definition.paths);
  const known = Boolean(groupedValue || pathValue);
  const status = known ? 'known' : normalizeStatus(definition.defaultStatus);

  return {
    coverageKey: definition.coverageKey,
    key: definition.key,
    label: definition.label,
    category: definition.category,
    status,
    value: groupedValue || pathValue?.value || null,
    sourcePath: pathValue?.path || null,
    requiredFor: definition.requiredFor,
    chartDataPriority: definition.chartDataPriority,
    masterPromptPath: definition.masterPromptPath,
    questionnairePath: definition.questionnairePath,
    userProfilePath: definition.userProfilePath,
    ledgerOnly: definition.ledgerOnly,
    scanWeight: definition.scanWeight,
    canAskTrainer: definition.canAskTrainer,
    canAskClient: definition.canAskClient,
    isSensitive: definition.isSensitive,
    requiresFollowUp: !FOLLOW_UP_CLEAR_STATUSES.has(status),
  };
};

const applyCoverageOverrides = (items, coverageItems = []) => {
  if (!Array.isArray(coverageItems) || coverageItems.length === 0) return items;
  const overrides = new Map();
  for (const item of coverageItems) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const key = item.coverageKey || item.fieldKey || item.key;
    if (key) overrides.set(key, item);
  }
  if (overrides.size === 0) return items;

  return items.map((item) => {
    const override = overrides.get(item.coverageKey) || overrides.get(item.key);
    if (!override) return item;
    const status = normalizeStatus(override.status);
    return {
      ...item,
      label: override.label || item.label,
      category: override.category || item.category,
      status,
      value: override.value ?? item.value,
      requiresFollowUp: !FOLLOW_UP_CLEAR_STATUSES.has(status),
    };
  });
};

const summarizeItems = (items) => {
  const totalFields = items.length;
  const knownFields = items.filter((item) => item.status === 'known').length;
  const missingFields = items
    .filter((item) => item.requiresFollowUp)
    .map((item) => ({
      key: item.coverageKey,
      label: item.label,
      owner: item.canAskClient ? 'client' : 'trainer',
      status: item.status,
      category: item.category,
    }));

  return {
    totalFields,
    knownFields,
    missingFields,
    completionPercentage: totalFields === 0 ? 0 : Math.round((knownFields / totalFields) * 100),
    canStartTraining: true,
  };
};

export function buildClientOnboardingCoverageLedger(input = {}) {
  const context = buildContext(input);
  const items = applyCoverageOverrides(
    getClientOnboardingCoverageFields().map((definition) => buildItem(definition, context)),
    context.coverageItems,
  );
  const summary = summarizeItems(items);

  return {
    version: 'computed-v1',
    status: summary.completionPercentage === 100 ? 'complete' : 'incomplete',
    workoutLoggingBlocked: false,
    items,
    fields: items,
    missingFields: summary.missingFields,
    summary: {
      totalFields: summary.totalFields,
      knownFields: summary.knownFields,
      missingFieldCount: summary.missingFields.length,
      completionPercentage: summary.completionPercentage,
      canStartTraining: summary.canStartTraining,
    },
  };
}

export function buildClientOnboardingProgressSnapshot(input = {}) {
  const ledger = buildClientOnboardingCoverageLedger(input);
  return {
    completionPercentage: ledger.summary.completionPercentage,
    onboardingComplete: ledger.summary.completionPercentage === 100,
    onboardingFieldLedger: ledger,
    onboardingMissingFields: ledger.missingFields,
  };
}
