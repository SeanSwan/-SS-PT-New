/**
 * Onboarding Start Dispatcher
 * ===========================
 *
 * Swan Coach command handler for starting a client's onboarding questionnaire.
 * Preserves existing drafts and keeps the central command dispatcher as wiring.
 */

import { getAllModels } from '../../../models/index.mjs';
import { calculateCompletionPercentage } from '../../../utils/onboardingHelpers.mjs';
import { resolveCommandClientId } from './clientScope.mjs';

const latestQuestionnaireQuery = (clientId) => ({
  where: { userId: clientId },
  order: [['createdAt', 'DESC']],
});

const buildExistingQuestionnaireResult = ({ clientId, questionnaire }) => ({
  clientId,
  questionnaireId: questionnaire.id ?? null,
  status: questionnaire.status ?? null,
  alreadyStarted: true,
  completionPercentage: calculateCompletionPercentage(questionnaire.responsesJson),
});

const buildNewQuestionnairePayload = ({ clientId, ctx }) => ({
  userId: clientId,
  createdBy: ctx.user?.id ?? null,
  questionnaireVersion: '3.0',
  status: 'in_progress',
  responsesJson: {},
});

const buildNewQuestionnaireResult = ({ clientId, questionnaire }) => ({
  clientId,
  questionnaireId: questionnaire.id ?? null,
  status: questionnaire.status ?? 'in_progress',
  alreadyStarted: false,
  completionPercentage: 0,
});

export const dispatchStartOnboarding = async (params = {}, ctx = {}) => {
  const { ClientOnboardingQuestionnaire } = getAllModels();
  const clientId = resolveCommandClientId(params, ctx);
  const existingQuestionnaire = await ClientOnboardingQuestionnaire.findOne(
    latestQuestionnaireQuery(clientId)
  );

  if (existingQuestionnaire) {
    return buildExistingQuestionnaireResult({
      clientId,
      questionnaire: existingQuestionnaire,
    });
  }

  const questionnaire = await ClientOnboardingQuestionnaire.create(
    buildNewQuestionnairePayload({ clientId, ctx })
  );

  return buildNewQuestionnaireResult({ clientId, questionnaire });
};
