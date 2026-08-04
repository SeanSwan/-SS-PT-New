/**
 * Workout achievement award boundary.
 *
 * Achievement writes are optional relative to the canonical workout/XP transaction. PostgreSQL
 * marks a transaction failed after any statement error, even when JavaScript catches it. This
 * boundary uses a savepoint so a catalog or award failure cannot silently poison and roll back
 * the already-computed workout XP. Achievement XP still uses the central ledger authority.
 */
import sequelize from "../../database.mjs";
import { getAllModels } from "../../models/index.mjs";
import logger from "../../utils/logger.mjs";
import GamificationPointsService from "./GamificationPointsService.mjs";
import { evaluateWorkoutAchievements } from "./workoutAchievementEvaluator.mjs";

const SAVEPOINT = "sp_workout_achievement_awards";
const EMPTY_RESULT = Object.freeze({ awarded: [], pointsAwarded: 0 });

const productionDeps = {
  sequelize,
  getAllModels,
  logger,
  evaluateWorkoutAchievements,
  recordLedgerEntry: (...args) =>
    GamificationPointsService.recordLedgerEntry(...args),
};

/**
 * Evaluate and persist workout-count achievements inside a recoverable savepoint.
 */
export async function awardWorkoutAchievementsBestEffort(
  { userId, workoutId, awardedBy, transaction },
  dependencies = productionDeps,
) {
  const deps = { ...productionDeps, ...dependencies };
  const queryOptions = { transaction };

  await deps.sequelize.query(`SAVEPOINT ${SAVEPOINT}`, queryOptions);

  try {
    const result = await deps.evaluateWorkoutAchievements({
      userId,
      models: deps.getAllModels(),
      transaction,
      awardPoints: ({ achievementId, name, xpReward }) =>
        deps.recordLedgerEntry(
          {
            userId,
            points: xpReward,
            transactionType: "bonus",
            source: "achievement_earned",
            sourceId: null,
            description: `Achievement earned: ${name}`,
            metadata: { achievementId, workoutId },
            awardedBy,
            idempotencyKey: `workout-achievement:${userId}:${achievementId}`,
            maxPoints: Number.MAX_SAFE_INTEGER,
          },
          transaction,
        ),
    });

    await deps.sequelize.query(`RELEASE SAVEPOINT ${SAVEPOINT}`, queryOptions);
    return result;
  } catch (error) {
    await deps.sequelize.query(
      `ROLLBACK TO SAVEPOINT ${SAVEPOINT}`,
      queryOptions,
    );
    deps.logger.error("Achievement evaluation failed; savepoint rolled back", {
      userId,
      workoutId,
      error: error?.message,
    });
    return { ...EMPTY_RESULT };
  }
}

export default { awardWorkoutAchievementsBestEffort };
