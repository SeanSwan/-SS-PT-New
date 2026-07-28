/**
 * Challenge creation policy for SwanStudios.
 *
 * This service keeps POST /api/v1/gamification/challenges model-compatible while
 * adding the governed template flow described in the challenge-system plan. It
 * is deliberately pure so controller tests can verify policy without touching
 * the production database.
 */

import { getChallengeTemplateById } from './challengeTemplateCatalog.mjs';

const ALLOWED_CHALLENGE_TYPES = new Set(['daily', 'weekly', 'monthly', 'community', 'custom']);
const ALLOWED_CATEGORIES = new Set(['fitness', 'nutrition', 'social', 'streak', 'dance', 'music', 'art', 'gaming', 'comedy', 'community_meetup']);
const ALLOWED_PROGRESS_UNITS = new Set(['completion', 'workouts', 'minutes', 'sessions', 'days', 'points', 'custom']);
const ALLOWED_LEADERBOARD_TYPES = new Set(['progress', 'completion_time', 'total_score', 'custom']);
const ALLOWED_PUBLISH_STATES = new Set(['draft', 'scheduled', 'active', 'live']);

const STRING_METADATA_ARTIFACTS = new Set(['[object Object]', '[object Promise]']);
const TITLE_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 1000;

const DEFAULTS = Object.freeze({
  challengeType: 'daily',
  category: 'fitness',
  difficulty: 3,
  xpReward: 100,
  bonusXpReward: 0,
  maxProgress: 1,
  progressUnit: 'completion',
  isPublic: true,
  isFeatured: false,
  isPremium: false,
  hasLeaderboard: false,
  leaderboardType: 'progress',
  allowTeams: false,
});

export class ChallengeCreationValidationError extends Error {
  constructor(publicMessage) {
    super(publicMessage);
    this.name = 'ChallengeCreationValidationError';
    this.publicMessage = publicMessage;
    this.statusCode = 400;
  }
}

const fail = (message) => {
  throw new ChallengeCreationValidationError(message);
};

const cleanString = (value, fallback = '') => {
  if (value === undefined || value === null) return fallback;
  return String(value).trim();
};

const cleanTextField = (value, fallback, field) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'string') fail(`${field} must be text`);
  return value.trim();
};

const cleanStringArray = (value, maxItems = 12) => {
  const source = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
  const seen = new Set();
  const result = [];

  for (const item of source) {
    if (typeof item !== 'string') continue;
    const cleaned = item.trim();
    if (!cleaned || STRING_METADATA_ARTIFACTS.has(cleaned) || seen.has(cleaned.toLowerCase())) continue;
    seen.add(cleaned.toLowerCase());
    result.push(cleaned);
    if (result.length >= maxItems) break;
  }

  return result;
};

const mergeStringArrays = (...sources) => {
  const merged = [];

  for (const source of sources) {
    if (Array.isArray(source)) {
      merged.push(...source);
    } else if (typeof source === 'string') {
      merged.push(source);
    }
  }

  return cleanStringArray(merged, 12);
};

const INTEGER_STRING_PATTERN = /^-?\d+$/;

const assertSafeInteger = (value, field) => {
  if (!Number.isSafeInteger(value)) fail(`${field} must be a whole number`);
  return value;
};

const parseIntegerInput = (value, field) => {
  if (typeof value === 'number') {
    return assertSafeInteger(value, field);
  }

  if (typeof value === 'string') {
    const cleaned = value.trim();
    if (!INTEGER_STRING_PATTERN.test(cleaned)) fail(`${field} must be a whole number`);
    return assertSafeInteger(Number(cleaned), field);
  }

  fail(`${field} must be a whole number`);
};

const toInteger = (value, fallback, { min = null, max = null, field = 'value' } = {}) => {
  if (value === undefined || value === null || value === '') return fallback;
  const numberValue = parseIntegerInput(value, field);
  if (min !== null && numberValue < min) fail(`${field} must be at least ${min}`);
  if (max !== null && numberValue > max) fail(`${field} must be at most ${max}`);
  return numberValue;
};

const toOptionalInteger = (value, { min = null, max = null, field = 'value' } = {}) => {
  if (value === undefined || value === null || value === '') return null;
  return toInteger(value, null, { min, max, field });
};

const toBoolean = (value, fallback, field) => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  fail(`${field} must be true or false`);
};

const choose = (value, fallback, allowed, field) => {
  const cleaned = cleanString(value, fallback);
  if (!allowed.has(cleaned)) fail(`Unsupported challenge ${field}`);
  return cleaned;
};

const ISO_DATE_COMPONENT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/;

const hasValidIsoDateComponent = (value) => {
  const match = value.match(ISO_DATE_COMPONENT_PATTERN);
  if (!match) return false;

  const [, year, month, day] = match;
  const normalized = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
    .toISOString()
    .slice(0, 10);

  return normalized === `${year}-${month}-${day}`;
};

const parseChallengeDate = (value, field) => {
  if (value instanceof Date) {
    const parsedDate = new Date(value.getTime());
    if (Number.isNaN(parsedDate.getTime())) fail(`${field} must be a valid date`);
    return parsedDate;
  }

  const cleaned = cleanString(value);
  if (!cleaned) fail(`${field} is required`);
  const parsed = new Date(cleaned);
  if (Number.isNaN(parsed.getTime()) || !hasValidIsoDateComponent(cleaned)) {
    fail(`${field} must be a valid date`);
  }
  return parsed;
};

const statusFromPublishState = (value) => {
  const publishState = cleanString(value, 'scheduled');
  if (!ALLOWED_PUBLISH_STATES.has(publishState)) fail('Unsupported challenge publish state');
  return publishState === 'draft' ? 'draft' : 'active';
};

const withTemplateMarker = (template, bodyTags) => {
  const templateTags = template ? template.tags : [];
  const marker = template ? [`template:${template.archetype}`] : [];
  return mergeStringArrays(templateTags, bodyTags, marker);
};

const templateRuleFields = ['challengeType', 'category', 'progressUnit', 'maxProgress', 'allowTeams', 'maxTeamSize'];

const isProvided = (value) => value !== undefined && value !== null && value !== '';

const enforceTemplateRuleLock = (template, body) => {
  if (!template) return;

  for (const field of templateRuleFields) {
    if (!isProvided(body[field])) continue;
    if (!isProvided(template[field]) || String(body[field]) !== String(template[field])) {
      fail('Template rule fields cannot be overridden');
    }
  }
};
export function buildChallengeCreatePayload({ body = {}, userId, now = new Date() }) {
  if (!userId) fail('Authenticated creator is required');

  const templateId = cleanString(body.templateId);
  const template = templateId ? getChallengeTemplateById(templateId) : null;
  if (templateId && !template) fail('Unknown challenge template');
  enforceTemplateRuleLock(template, body);

  const base = template || DEFAULTS;
  const title = cleanTextField(body.title, base.title, 'Title');
  const description = cleanTextField(body.description, base.description, 'Description');
  if (!title || title.length < 3) fail('Title is required');
  if (title.length > TITLE_MAX_LENGTH) fail(`Title must be ${TITLE_MAX_LENGTH} characters or less`);
  if (!description || description.length < 10) fail('Description is required');
  if (description.length > DESCRIPTION_MAX_LENGTH) fail(`Description must be ${DESCRIPTION_MAX_LENGTH} characters or less`);

  const startDate = parseChallengeDate(body.startDate, 'Start date');
  const endDate = parseChallengeDate(body.endDate, 'End date');
  if (startDate <= now) fail('Start date must be in the future');
  if (endDate <= startDate) fail('End date must be after start date');

  const challengeType = choose(body.challengeType, base.challengeType || DEFAULTS.challengeType, ALLOWED_CHALLENGE_TYPES, 'type');
  const category = choose(body.category, base.category || DEFAULTS.category, ALLOWED_CATEGORIES, 'category');
  const progressUnit = choose(body.progressUnit, base.progressUnit || DEFAULTS.progressUnit, ALLOWED_PROGRESS_UNITS, 'progress unit');
  const leaderboardType = choose(body.leaderboardType, base.leaderboardType || DEFAULTS.leaderboardType, ALLOWED_LEADERBOARD_TYPES, 'leaderboard type');
  const allowTeams = toBoolean(body.allowTeams, Boolean(base.allowTeams), 'allowTeams');

  return {
    title,
    description,
    challengeType,
    difficulty: toInteger(body.difficulty, base.difficulty || DEFAULTS.difficulty, { min: 1, max: 5, field: 'Difficulty' }),
    category,
    xpReward: toInteger(body.xpReward, base.xpReward || DEFAULTS.xpReward, { min: 0, field: 'XP reward' }),
    bonusXpReward: toInteger(body.bonusXpReward, base.bonusXpReward || DEFAULTS.bonusXpReward, { min: 0, field: 'Bonus XP reward' }),
    maxParticipants: toOptionalInteger(body.maxParticipants ?? base.maxParticipants, { min: 1, field: 'Max participants' }),
    maxProgress: toInteger(body.maxProgress, base.maxProgress || DEFAULTS.maxProgress, { min: 1, field: 'Max progress' }),
    progressUnit,
    startDate,
    endDate,
    createdBy: userId,
    requirements: mergeStringArrays(base.requirements || [], body.requirements || []),
    tags: withTemplateMarker(template, body.tags || []),
    status: statusFromPublishState(body.publishState ?? body.status),
    isPublic: toBoolean(body.isPublic, base.isPublic ?? DEFAULTS.isPublic, 'isPublic'),
    isFeatured: toBoolean(body.isFeatured, base.isFeatured ?? DEFAULTS.isFeatured, 'isFeatured'),
    isPremium: toBoolean(body.isPremium, base.isPremium ?? DEFAULTS.isPremium, 'isPremium'),
    hasLeaderboard: toBoolean(body.hasLeaderboard, base.hasLeaderboard ?? DEFAULTS.hasLeaderboard, 'hasLeaderboard'),
    leaderboardType,
    allowTeams,
    maxTeamSize: allowTeams ? toOptionalInteger(body.maxTeamSize ?? base.maxTeamSize, { min: 2, field: 'Max team size' }) : null,
  };
}




