/**
 * Challenge draft form helpers.
 * Keeps template-backed challenge payload construction pure and testable.
 */

import type { ChallengeTemplate } from './useChallengeTemplates';

export type ChallengePublishMode = 'draft' | 'public';
export type ChallengePublishState = 'draft' | 'active';
export type ChallengeDraftValidationSection = 'audience' | 'goal' | 'schedule';

export interface ChallengeDraftFormInput {
  template: ChallengeTemplate;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  maxParticipants: string;
  publishMode?: ChallengePublishMode;
}

export interface ChallengeDraftPayload {
  templateId: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  maxParticipants?: number;
  publishState: ChallengePublishState;
  isPublic: boolean;
}

const dateInput = (date: Date) => date.toISOString().slice(0, 10);

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const normalizePublishMode = (value?: ChallengePublishMode): ChallengePublishMode => {
  if (!value || value === 'draft') return 'draft';
  if (value === 'public') return 'public';
  throw new Error('Publish mode must be Draft or Public campaign');
};

const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DRAFT_TITLE_MAX_LENGTH = 100;
const DRAFT_DESCRIPTION_MAX_LENGTH = 1000;

const parseDateInput = (value: string, field: string) => {
  if (!value) throw new Error(`${field} is required`);
  if (!DATE_INPUT_PATTERN.test(value)) throw new Error(`${field} must be valid`);

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || dateInput(parsed) !== value) {
    throw new Error(`${field} must be valid`);
  }
  return parsed;
};

export const getDefaultDraftDates = (now = new Date()) => ({
  startDate: dateInput(addDays(now, 7)),
  endDate: dateInput(addDays(now, 14)),
});

const validateDraftCopy = (title: string, description: string) => {
  const cleanTitle = title.trim();
  const cleanDescription = description.trim();
  if (cleanTitle.length < 3) throw new Error('Draft title is required');
  if (cleanDescription.length < 10) throw new Error('Draft description is required');
  if (cleanTitle.length > DRAFT_TITLE_MAX_LENGTH) {
    throw new Error(`Draft title must be ${DRAFT_TITLE_MAX_LENGTH} characters or less`);
  }
  if (cleanDescription.length > DRAFT_DESCRIPTION_MAX_LENGTH) {
    throw new Error(`Draft description must be ${DRAFT_DESCRIPTION_MAX_LENGTH} characters or less`);
  }

  return { cleanTitle, cleanDescription };
};

const validateDraftWindow = (startDate: string, endDate: string) => {
  const parsedStart = parseDateInput(startDate, 'Start date');
  const parsedEnd = parseDateInput(endDate, 'End date');
  if (parsedEnd <= parsedStart) throw new Error('End date must be after start date');
};

const parseParticipantCap = (maxParticipants: string) => {
  const cleanCap = maxParticipants.trim();
  if (cleanCap && !/^\d+$/.test(cleanCap)) {
    throw new Error('Participant cap must be a whole number');
  }
  const parsedCap = cleanCap ? Number(cleanCap) : undefined;
  if (parsedCap !== undefined && parsedCap < 1) {
    throw new Error('Participant cap must be a whole number');
  }
  return parsedCap;
};

export const validateChallengeDraftSection = (section: ChallengeDraftValidationSection, input: ChallengeDraftFormInput) => {
  if (section === 'audience') {
    parseParticipantCap(input.maxParticipants);
    return;
  }
  if (section === 'goal') {
    validateDraftCopy(input.title, input.description);
    return;
  }
  validateDraftWindow(input.startDate, input.endDate);
};
export const buildChallengeDraftPayload = ({
  template,
  title,
  description,
  startDate,
  endDate,
  maxParticipants,
  publishMode,
}: ChallengeDraftFormInput): ChallengeDraftPayload => {
  const { cleanTitle, cleanDescription } = validateDraftCopy(title, description);
  validateDraftWindow(startDate, endDate);
  const normalizedPublishMode = normalizePublishMode(publishMode);
  const parsedCap = parseParticipantCap(maxParticipants);

  return {
    templateId: template.id,
    title: cleanTitle,
    description: cleanDescription,
    startDate,
    endDate,
    ...(parsedCap !== undefined ? { maxParticipants: parsedCap } : {}),
    publishState: normalizedPublishMode === 'draft' ? 'draft' : 'active',
    isPublic: normalizedPublishMode === 'public',
  };
};