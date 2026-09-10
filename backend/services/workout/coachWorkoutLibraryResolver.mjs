/** Resolve reviewed Coach exercises against the same table as /exercises/library.
 * No static registry, approximate name matching, load guessing or unit conversion.
 * When a transaction is supplied, share locks keep eligibility stable until commit.
 */
import { createHash } from 'node:crypto';
import { Op } from 'sequelize';
import { getLibraryWhere } from '../exerciseLibraryContract.mjs';
import { normalizeAiExercises, AiWorkoutDailyFormError } from './aiWorkoutDailyFormPayloadService.mjs';

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const text = value => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 128;
const libraryName = value => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 255;
const refuse = code => { throw new AiWorkoutDailyFormError('Resolve exact workout details before review.', code); };

// SCU G03: mint a deterministic instance id (sha256 of the library lookup + slot)
// so the resolver is a pure function of (library, payload). A random UUID made the
// request-identity hash non-reproducible across the create/review/commit paths
// (a 20-way same-key create race produced 20 distinct hashes -> 19 spurious 409s)
// and broke the startWorkoutIntent re-resolve equality check. A client-authored
// exerciseInstanceId is still honored verbatim above.
function deterministicInstanceId(lookup, index) {
  return createHash('sha256').update(JSON.stringify({ lookup, index })).digest('hex').slice(0, 32);
}

export async function resolveCoachWorkoutLibrary({ Exercise, exercises, transaction }) {
  if (!Exercise?.findAll) refuse('WORKOUT_LIBRARY_UNAVAILABLE');
  if (!Array.isArray(exercises) || !exercises.length || exercises.length > 100) refuse('WORKOUT_EXERCISES_INVALID');
  const lookups = exercises.map(exercise => {
    if (!exercise || typeof exercise !== 'object') refuse('WORKOUT_EXERCISE_ID_REQUIRED');
    if (Object.hasOwn(exercise, 'exerciseId') && (typeof exercise.exerciseId !== 'string' || !UUID.test(exercise.exerciseId)))
      refuse('WORKOUT_EXERCISE_ID_REQUIRED');
    if (Object.hasOwn(exercise, 'exerciseKey') && !text(exercise.exerciseKey)) refuse('WORKOUT_EXERCISE_ID_REQUIRED');
    const id = exercise.exerciseId?.toLowerCase(), key = exercise.exerciseKey?.trim();
    const name = exercise.exerciseName ?? exercise.name;
    if (id) return { id };
    if (key) return { exercise_key: key };
    if (!libraryName(name)) refuse('WORKOUT_EXERCISE_ID_REQUIRED');
    return { name: name.trim() };
  });
  const rows = await Exercise.findAll({
    attributes: ['id', 'name', 'exercise_key', 'isActive'],
    where: { ...getLibraryWhere(Exercise), [Op.or]: lookups },
    order: [['id', 'ASC']], limit: 301, raw: true,
    ...(transaction ? { transaction, lock: transaction.LOCK.SHARE } : {}),
  });
  if (!Array.isArray(rows) || rows.length > 300) refuse('WORKOUT_LIBRARY_UNAVAILABLE');
  const resolved = exercises.map((exercise, index) => {
    const lookup = lookups[index];
    const matches = rows.map(row => row?.toJSON ? row.toJSON() : row).filter(row => row?.isActive === true
      && Object.entries(lookup).every(([key, value]) => row[key] === value));
    if (matches.length !== 1) refuse('WORKOUT_EXERCISE_UNRESOLVED');
    const row = matches[0];
    if (!UUID.test(row.id) || !libraryName(row.name)) refuse('WORKOUT_LIBRARY_UNAVAILABLE');
    if (exercise.exerciseKey !== undefined && exercise.exerciseKey.trim() !== row.exercise_key)
      refuse('WORKOUT_EXERCISE_ID_MISMATCH');
    for (const alias of ['exerciseName', 'name']) {
      if (Object.hasOwn(exercise, alias) && (typeof exercise[alias] !== 'string' || exercise[alias].trim() !== row.name))
        refuse('WORKOUT_EXERCISE_ID_MISMATCH');
    }
    if (typeof exercise.unit === 'string' && exercise.unit.trim().toLowerCase() === 'kg') refuse('UNIT_MAPPING_REQUIRED');
    if (row.exercise_key !== null && row.exercise_key !== undefined && !text(row.exercise_key)) refuse('WORKOUT_LIBRARY_UNAVAILABLE');
    return { ...exercise, exerciseId: row.id,
      ...(row.exercise_key ? { exerciseKey: row.exercise_key } : {}), exerciseName: row.name,
      exerciseInstanceId: Object.hasOwn(exercise, 'exerciseInstanceId') ? exercise.exerciseInstanceId
        : deterministicInstanceId(lookup, index) };
  });
  return normalizeAiExercises(resolved, { policy: 'coach_verified_v1' });
}
