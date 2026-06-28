/**
 * coachClientOnboardingDraftNormalizer.mjs
 * ========================================
 * Normalizes human-reviewed Coach onboarding proposal payloads before the
 * deterministic approval service creates users, assignments, and ledger data.
 */
import {
  CLIENT_SOURCES,
  parseClientSource,
} from './sessionBillingPolicy.mjs';
import {
  buildClientOnboardStubEmail,
  normalizeClientOnboardEmailInput,
} from './clientOnboardIdentityService.mjs';

const TEXT_FIELDS = [
  'phone',
  'dateOfBirth',
  'gender',
  'fitnessGoal',
  'healthConcerns',
  'trainingExperience',
  'communicationStyle',
  'motivationStyle',
  'preferredContactMethod',
  'trainerNotes',
];
const ONBOARDING_CONTEXT_FIELDS = [
  ['limitations', 'Limitations'],
  ['painNotes', 'Pain notes'],
  ['equipmentAccess', 'Equipment access'],
  ['availability', 'Availability'],
  ['firstSessionPriorities', 'First session priorities'],
];
const COVERAGE_STATUS_ALIASES = Object.freeze({
  ask_client_later: 'client_requested',
  ask_later: 'client_requested',
});
const COVERAGE_STATUSES = new Set([
  'known',
  'unknown',
  'trainer_pending',
  'client_requested',
  'not_applicable',
  'blocked',
]);

export function cleanText(value, maxLength = 2000) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

export function parseWholeSessionCount(value) {
  const sessions = Number(value ?? 0);
  return Number.isInteger(sessions) && sessions > 0 ? sessions : 0;
}

function normalizeEmail(value, firstName, lastName) {
  const email = normalizeClientOnboardEmailInput(value);
  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return email.toLowerCase();
  return buildClientOnboardStubEmail({ firstName, lastName });
}

function collectOnboardingContext(raw) {
  return ONBOARDING_CONTEXT_FIELDS.reduce((context, [field]) => {
    const value = cleanText(raw[field], 1000);
    if (value) context[field] = value;
    return context;
  }, {});
}

function formatOnboardingContext(context) {
  return ONBOARDING_CONTEXT_FIELDS
    .map(([field, label]) => context[field] ? `${label}: ${context[field]}` : null)
    .filter(Boolean);
}

function mergeTrainerNotes(notes, context) {
  const contextLines = formatOnboardingContext(context);
  const lines = [];
  if (notes) lines.push(notes);
  if (contextLines.length > 0) {
    lines.push(`Onboarding context:\n${contextLines.join('\n')}`);
  }
  return cleanText(lines.join('\n\n'), 2000);
}

function plainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? { ...value } : {};
}

function cleanStringArray(value, maxItems = 40, maxLength = 160) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanText(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function normalizeCoverageStatus(status) {
  const normalized = COVERAGE_STATUS_ALIASES[status] || status || 'unknown';
  return COVERAGE_STATUSES.has(normalized) ? normalized : 'unknown';
}

function normalizeCoverageItems(rawItems) {
  if (!Array.isArray(rawItems)) return [];
  return rawItems
    .map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
      const coverageKey = cleanText(item.fieldKey || item.coverageKey || item.key, 120);
      if (!coverageKey) return null;
      return {
        coverageKey,
        fieldKey: coverageKey,
        category: cleanText(item.category, 80) || 'general',
        label: cleanText(item.label, 160) || coverageKey,
        status: normalizeCoverageStatus(item.status),
        value: item.value ?? null,
        source: cleanText(item.source, 80) || 'trainer_dictation',
        confidence: typeof item.confidence === 'number' ? item.confidence : null,
        requiredFor: Array.isArray(item.requiredFor) ? item.requiredFor : [],
        chartDataPriority: Number.isInteger(item.chartDataPriority) ? item.chartDataPriority : 0,
        evidenceRefs: Array.isArray(item.evidenceRefs)
          ? item.evidenceRefs.filter((value) => typeof value === 'string')
          : [],
      };
    })
    .filter(Boolean);
}

export function normalizeCoachOnboardingDraft(proposal) {
  const raw = proposal?.payload?.data || proposal?.payload || proposal?.data || proposal || {};
  const firstName = cleanText(raw.firstName, 80);
  const lastName = cleanText(raw.lastName, 80);
  if (!firstName || !lastName) {
    const err = new Error('Client first and last name are required before approval.');
    err.code = 'ONBOARDING_REQUIRED_FIELDS_MISSING';
    throw err;
  }

  const clientSource = parseClientSource(cleanText(raw.clientSource, 40));
  if (!CLIENT_SOURCES.has(clientSource)) {
    const err = new Error('Client source is required before approval.');
    err.code = 'ONBOARDING_REQUIRED_FIELDS_MISSING';
    throw err;
  }

  const draft = {
    firstName,
    lastName,
    email: normalizeEmail(raw.email, firstName, lastName),
    clientSource,
    availableSessions: parseWholeSessionCount(raw.availableSessions),
  };

  for (const field of TEXT_FIELDS) {
    draft[field] = cleanText(raw[field], field === 'phone' ? 64 : 2000);
  }
  if (!draft.fitnessGoal) {
    draft.fitnessGoal = cleanText(raw.trainingGoal, 2000);
  }
  draft.nutritionPrefs = plainObject(raw.nutritionPrefs);
  draft.questionnaireResponses = plainObject(
    raw.questionnaireResponses || raw.responsesJson || raw.responses,
  );
  draft.preferredTrainingDays = cleanStringArray(raw.preferredTrainingDays);
  draft.coverageItems = normalizeCoverageItems(raw.coverageUpdates || raw.coverageItems);
  draft.onboardingContext = collectOnboardingContext(raw);
  draft.trainerNotes = mergeTrainerNotes(draft.trainerNotes, draft.onboardingContext);
  return draft;
}