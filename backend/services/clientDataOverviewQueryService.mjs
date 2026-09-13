/**
 * clientDataOverviewQueryService.mjs
 * ==================================
 * Fetches the model records needed by the client data overview endpoint.
 *
 * Purpose:
 * - Keep Sequelize query orchestration separate from payload shaping.
 * - Preserve the trainer-note privacy gate for client-role requests.
 * - Return plain record slots consumed by clientDataOverviewPayloadService.
 */
import { isClientEquivalentRole } from '../utils/clientAccess.mjs';

export const fetchClientDataOverviewRecords = async ({ models, targetUserId, requesterRole }) => {
  const {
    ClientOnboardingQuestionnaire,
    ClientBaselineMeasurements,
    ClientNutritionPlan,
    ClientPhoto,
    ClientNote,
  } = models;

  // The shared predicate, not a hand-rolled `!== 'client'`: `'user'` is the
  // default role minted by public self-registration (models/User.mjs:135) and is
  // client-equivalent (utils/clientAccess.mjs:23), so the literal comparison
  // failed OPEN for the most common account role.
  const includeTrainerNoteSummary = !isClientEquivalentRole(requesterRole);

  const [
    questionnaire,
    baselineMeasurement,
    nutritionPlan,
    photoCount,
    latestPhoto,
    noteCount,
    latestNote,
  ] = await Promise.all([
    ClientOnboardingQuestionnaire.findOne({
      where: { userId: targetUserId },
      order: [['createdAt', 'DESC']],
    }),
    ClientBaselineMeasurements.findOne({
      where: { userId: targetUserId },
      order: [['takenAt', 'DESC']],
    }),
    ClientNutritionPlan.findOne({
      where: { userId: targetUserId, status: 'active' },
      order: [['startDate', 'DESC']],
    }),
    ClientPhoto.count({ where: { userId: targetUserId, isDeleted: false } }),
    ClientPhoto.findOne({
      where: { userId: targetUserId, isDeleted: false },
      order: [['uploadedAt', 'DESC']],
    }),
    includeTrainerNoteSummary
      ? ClientNote.count({ where: { userId: targetUserId } })
      : Promise.resolve(0),
    includeTrainerNoteSummary
      ? ClientNote.findOne({
          where: { userId: targetUserId },
          order: [['createdAt', 'DESC']],
        })
      : Promise.resolve(null),
  ]);

  return {
    questionnaire,
    baselineMeasurement,
    nutritionPlan,
    photoCount,
    latestPhoto,
    noteCount,
    latestNote,
  };
};
