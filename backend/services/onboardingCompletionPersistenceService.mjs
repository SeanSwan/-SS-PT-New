/**
 * onboardingCompletionPersistenceService.mjs
 * =========================================
 * Shared persistence helpers for staff-created onboarding completions.
 * Keeps legacy /api/onboarding writes aligned with Client Hub and self-service
 * onboarding truth without exposing generated passwords or contact details.
 */
import ClientOnboardingQuestionnaire from '../models/ClientOnboardingQuestionnaire.mjs';
import { computeDerivedFields } from '../utils/onboardingHelpers.mjs';

export const parseOptionalFloat = (value, fallback = null) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseOptionalInt = (value) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

export const parseHeightInches = (formData = {}, fallback = null) => {
  const feet = parseOptionalInt(formData.heightFeet);
  const inches = parseOptionalInt(formData.heightInches);
  if (feet === null && inches === null) return fallback;
  return (feet ?? 0) * 12 + (inches ?? 0);
};

const buildCompletedQuestionnaireRecord = ({ userId, createdBy, formData }) => ({
  userId,
  createdBy,
  questionnaireVersion: '3.0',
  status: 'completed',
  responsesJson: formData,
  ...computeDerivedFields(formData),
  completedAt: new Date(),
});

export async function persistCompletedOnboardingQuestionnaire({ userId, createdBy, formData }) {
  const questionnaireRecord = buildCompletedQuestionnaireRecord({ userId, createdBy, formData });
  const existingQuestionnaire = await ClientOnboardingQuestionnaire.findOne({
    where: { userId },
    order: [['createdAt', 'DESC']],
  });

  if (existingQuestionnaire) {
    await existingQuestionnaire.update(questionnaireRecord);
  } else {
    await ClientOnboardingQuestionnaire.create(questionnaireRecord);
  }
}

export default {
  parseHeightInches,
  parseOptionalFloat,
  persistCompletedOnboardingQuestionnaire,
};