/**
 * ============================================================================
 * FILE: dispatchers/onboardingSubmitDispatcher.mjs
 * PURPOSE: Swan Coach onboarding questionnaire submit command handler
 * OWNER: Codex | CREATED: 2026-06-09
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 *   Completes the latest onboarding questionnaire for a resolved client and
 *   writes the derived master-prompt context onto the client user record.
 *   Keeps submit write logic out of the central command dispatcher.
 */

import { getAllModels } from '../../../models/index.mjs';
import {
  calculateCompletionPercentage,
  computeDerivedFields,
} from '../../../utils/onboardingHelpers.mjs';
import { transformQuestionnaireToMasterPrompt } from '../../onboardingMasterPromptBuilder.mjs';
import { resolveCommandClientId } from './clientScope.mjs';

const textOrEmpty = (value) => (typeof value === 'string' ? value.trim() : '');

const optionalText = (value) => (typeof value === 'string' ? value : null);

const valueOrExisting = (value, existing) => (value === null ? existing : value);

const floatOrNull = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const intOrNull = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const heightInInchesOrNull = ({ heightFeet, heightInches }) => {
  const feet = intOrNull(heightFeet);
  if (feet === null) return null;

  const inches = intOrNull(heightInches);
  return feet * 12 + (inches ?? 0);
};

const buildNoQuestionnaireResult = (clientId) => ({
  clientId,
  questionnaireId: null,
  status: 'not_started',
  submitted: false,
  reason: 'no_questionnaire',
  masterPromptCreated: false,
});

const buildMissingRequiredResult = ({ clientId, questionnaire, responsesJson, fullName, email, primaryGoal }) => ({
  clientId,
  questionnaireId: questionnaire.id ?? null,
  status: questionnaire.status ?? null,
  submitted: false,
  reason: 'missing_required_fields',
  completionPercentage: calculateCompletionPercentage(responsesJson),
  hasFullName: Boolean(fullName),
  hasEmail: Boolean(email),
  hasPrimaryGoal: Boolean(primaryGoal),
  masterPromptCreated: false,
});

const buildUserMissingResult = ({ clientId, questionnaire, responsesJson }) => ({
  clientId,
  questionnaireId: questionnaire.id ?? null,
  status: 'completed',
  submitted: true,
  reason: 'client_user_not_found',
  completionPercentage: calculateCompletionPercentage(responsesJson),
  masterPromptCreated: false,
});

const buildUserUpdatePayload = ({ responsesJson, clientId, primaryGoal, user }) => {
  const weight = floatOrNull(responsesJson.currentWeight);
  const height = heightInInchesOrNull({
    heightFeet: responsesJson.heightFeet,
    heightInches: responsesJson.heightInches,
  });
  const phone = optionalText(responsesJson.phone);
  const gender = optionalText(responsesJson.gender);

  return {
    masterPromptJson: transformQuestionnaireToMasterPrompt(responsesJson, clientId),
    spiritName: `Client #${clientId}`,
    isOnboardingComplete: true,
    phone: valueOrExisting(phone, user.phone),
    gender: valueOrExisting(gender, user.gender),
    weight: valueOrExisting(weight, user.weight),
    height: valueOrExisting(height, user.height),
    fitnessGoal: primaryGoal,
  };
};

const buildCompletedResult = ({ clientId, questionnaire, responsesJson }) => ({
  clientId,
  questionnaireId: questionnaire.id ?? null,
  status: 'completed',
  submitted: true,
  completionPercentage: calculateCompletionPercentage(responsesJson),
  masterPromptCreated: true,
});

const buildRequiredFields = ({ responsesJson, derived }) => ({
  fullName: textOrEmpty(responsesJson.fullName),
  email: textOrEmpty(responsesJson.email),
  primaryGoal: textOrEmpty(derived.primaryGoal),
});

const hasRequiredFields = ({ fullName, email, primaryGoal }) => (
  [fullName, email, primaryGoal].every(Boolean)
);

const completeQuestionnaire = (questionnaire, derived) => (
  questionnaire.update({
    ...derived,
    status: 'completed',
    completedAt: new Date(),
  })
);

const submitExistingQuestionnaire = async ({ User, clientId, questionnaire }) => {
  const responsesJson = questionnaire.responsesJson || {};
  const derived = computeDerivedFields(responsesJson);
  const required = buildRequiredFields({ responsesJson, derived });

  if (!hasRequiredFields(required)) {
    return buildMissingRequiredResult({
      clientId,
      questionnaire,
      responsesJson,
      ...required,
    });
  }

  await completeQuestionnaire(questionnaire, derived);

  const user = await User.findByPk(clientId);
  if (!user) {
    return buildUserMissingResult({ clientId, questionnaire, responsesJson });
  }

  await user.update(buildUserUpdatePayload({
    responsesJson,
    clientId,
    primaryGoal: required.primaryGoal,
    user,
  }));

  return buildCompletedResult({ clientId, questionnaire, responsesJson });
};

export const dispatchSubmitOnboarding = async (params = {}, ctx = {}) => {
  const { ClientOnboardingQuestionnaire, User } = getAllModels();
  const clientId = resolveCommandClientId(params, ctx);
  const questionnaire = await ClientOnboardingQuestionnaire.findOne({
    where: { userId: clientId },
    order: [['createdAt', 'DESC']],
  });

  if (!questionnaire) {
    return buildNoQuestionnaireResult(clientId);
  }

  return submitExistingQuestionnaire({ User, clientId, questionnaire });
};
