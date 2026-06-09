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

export const fetchClientDataOverviewRecords = async ({ models, targetUserId, requesterRole }) => {
  const {
    ClientOnboardingQuestionnaire,
    ClientBaselineMeasurements,
    ClientNutritionPlan,
    ClientPhoto,
    ClientNote,
  } = models;

  const includeTrainerNoteSummary = requesterRole !== 'client';

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
