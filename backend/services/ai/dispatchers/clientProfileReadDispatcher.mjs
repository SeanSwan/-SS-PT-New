/**
 * Client Profile Read Dispatcher
 * ==============================
 *
 * Swan Coach read command for a privacy-safe client profile summary. Keeps
 * client profile query shaping out of the central command dispatcher.
 */

import { getAllModels } from '../../../models/index.mjs';
import { toDateOnly } from '../../clientTrainingSafeReadValueService.mjs';
import { resolveCommandClientId } from './clientScope.mjs';

const toModelData = (record) => (
  typeof record?.toJSON === 'function' ? record.toJSON() : record
);

const safeArray = (value) => (Array.isArray(value) ? value : []);

const nullable = (value) => value ?? null;

const firstOrNull = (items) => items[0] || null;

const buildBaseIncludes = ({ ClientProgress, Session, Order }) => [
  { model: ClientProgress, as: 'clientProgress', required: false },
  { model: Session, as: 'clientSessions', required: false },
  { model: Order, as: 'orders', required: false, limit: 10, order: [['createdAt', 'DESC']] },
];

const appendWorkoutSessionsInclude = ({ include, User, WorkoutSession }) => {
  if (!User.associations?.workoutSessions) return include;

  return [
    ...include,
    {
      model: WorkoutSession,
      as: 'workoutSessions',
      required: false,
      limit: 10,
      order: [['completedAt', 'DESC']],
    },
  ];
};

const buildClientProfileIncludes = ({ User, ClientProgress, Session, WorkoutSession, Order }) => (
  appendWorkoutSessionsInclude({
    include: buildBaseIncludes({ ClientProgress, Session, Order }),
    User,
    WorkoutSession,
  })
);

const findClientProfile = ({ User, include, clientId }) => (
  User.findOne({
    where: { id: clientId, role: 'client' },
    include,
    attributes: { exclude: ['password', 'refreshTokenHash'] },
  })
);

const buildMissingClientResult = (clientId) => ({
  clientId,
  found: false,
});

const lastWorkoutDate = (lastWorkout) => (
  toDateOnly(lastWorkout?.completedAt ?? lastWorkout?.date)
);

const latestWeight = (data) => nullable(data.clientProgress?.weight ?? data.weight);

const buildFoundClientResult = ({ clientId, data }) => {
  const workoutSessions = safeArray(data.workoutSessions);
  const clientSessions = safeArray(data.clientSessions);
  const orders = safeArray(data.orders);

  return {
    clientId,
    found: true,
    isActive: nullable(data.isActive),
    clientSource: nullable(data.clientSource),
    availableSessions: nullable(data.availableSessions),
    fitnessGoal: nullable(data.fitnessGoal),
    onboardingComplete: Boolean(data.masterPromptJson),
    totalWorkouts: workoutSessions.length,
    totalOrders: orders.length,
    lastWorkoutDate: lastWorkoutDate(firstOrNull(workoutSessions)),
    nextSessionDate: toDateOnly(firstOrNull(clientSessions)?.sessionDate),
    latestWeight: latestWeight(data),
  };
};

export const dispatchViewClientProfile = async (params = {}, ctx = {}) => {
  const models = getAllModels();
  const clientId = resolveCommandClientId(params, ctx);
  const include = buildClientProfileIncludes(models);
  const client = await findClientProfile({ User: models.User, include, clientId });

  if (!client) {
    return buildMissingClientResult(clientId);
  }

  return buildFoundClientResult({
    clientId,
    data: toModelData(client),
  });
};
