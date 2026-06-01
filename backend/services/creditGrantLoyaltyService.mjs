/**
 * Credit Grant Loyalty Service
 * ============================
 * Keeps direct credit grants from treating unused session inventory as proof of
 * completed personal-training history.
 */

export async function countCompletedPaidTrainingSessions(
  clientId,
  { Session, DailyWorkoutForm } = {},
  { transaction } = {}
) {
  if (!clientId) return 0;

  const [deductedScheduledSessions, deductedWorkoutForms] = await Promise.all([
    Session?.count
      ? Session.count({
          where: { userId: clientId, status: 'completed', sessionDeducted: true },
          transaction,
        })
      : 0,
    DailyWorkoutForm?.count
      ? DailyWorkoutForm.count({
          where: { clientId, sessionDeducted: true },
          transaction,
        })
      : 0,
  ]);

  return Math.max(
    Number(deductedScheduledSessions) || 0,
    Number(deductedWorkoutForms) || 0
  );
}

export default {
  countCompletedPaidTrainingSessions,
};
