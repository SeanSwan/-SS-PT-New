/**
 * ============================================================================
 * FILE: trainingPlanProjectionService.mjs
 * PURPOSE: Batch-authorize and fetch read-only training-plan projections.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Resolves self/admin/trainer client scope with bounded
 * batch queries, reads active plans and immutable completion receipts once,
 * and paginates the deterministic projection contract.
 * HOW IT FITS IN THE APP: Called only by the projection GET route. It never
 * imports or mutates Session, billing, package, credit, or deduction services.
 * KEY DECISIONS: Trainer scope is all-or-nothing and staff browser time zones
 * never override the target client's stored/account-default training zone.
 */

import { Op } from 'sequelize';
import { getAllModels } from '../models/index.mjs';
import { resolveClientTrainingDateContext } from './clientTrainingDateService.mjs';
import {
  TrainingPlanProjectionError,
  buildTrainingPlanProjectionItems,
  parseTrainingPlanProjectionQuery,
} from './trainingPlanProjectionContract.mjs';

export {
  TrainingPlanProjectionError,
  buildTrainingPlanProjectionItems,
  parseTrainingPlanProjectionQuery,
};

const fail = (message, code, statusCode = 400) => {
  throw new TrainingPlanProjectionError(message, code, statusCode);
};
const positiveInteger = (value) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};
const plain = (value) => value?.get ? value.get({ plain: true }) : value;

const resolveProjectionClients = async ({
  actor, requestedClientIds, User, ClientTrainerAssignment,
}) => {
  const actorId = positiveInteger(actor?.id);
  const role = actor?.role === 'user' ? 'client' : actor?.role;
  if (!actorId) fail('Authentication required', 'TRAINING_PLAN_PROJECTION_UNAUTHORIZED', 401);

  let clientIds = requestedClientIds;
  if (role === 'client') {
    if (clientIds.length && (clientIds.length !== 1 || clientIds[0] !== actorId)) {
      fail('Clients may only view their own projections', 'TRAINING_PLAN_PROJECTION_FORBIDDEN', 403);
    }
    clientIds = [actorId];
  } else if (!['trainer', 'admin'].includes(role)) {
    fail('Projection access denied', 'TRAINING_PLAN_PROJECTION_FORBIDDEN', 403);
  } else if (!clientIds.length) {
    fail('Staff requests require clientIds', 'TRAINING_PLAN_PROJECTION_CLIENT_IDS_REQUIRED');
  }

  if (role === 'trainer') {
    const assignments = await ClientTrainerAssignment.findAll({
      where: {
        trainerId: actorId,
        clientId: { [Op.in]: clientIds },
        status: 'active',
      },
      attributes: ['clientId'],
    });
    const assigned = new Set(assignments.map(plain).map((row) => Number(row.clientId)));
    if (clientIds.some((clientId) => !assigned.has(clientId))) {
      fail(
        'One or more clients are outside the trainer assignment scope',
        'TRAINING_PLAN_PROJECTION_FORBIDDEN',
        403,
      );
    }
  }

  const clients = await User.findAll({
    where: { id: { [Op.in]: clientIds } },
    attributes: ['id', 'role', 'timeZone', 'timeZoneConfigured'],
  });
  const byId = new Map(clients.map(plain)
    .filter((client) => ['client', 'user'].includes(client?.role))
    .map((client) => [Number(client.id), client]));
  if (clientIds.some((clientId) => !byId.has(clientId))) {
    fail('One or more clients were not found', 'TRAINING_PLAN_PROJECTION_CLIENT_NOT_FOUND', 404);
  }
  return clientIds.map((clientId) => byId.get(clientId));
};

const requireProjectionModels = (models) => {
  const required = [
    models.User,
    models.ClientTrainerAssignment,
    models.WorkoutPlan,
    models.WorkoutPlanCompletionReceipt,
  ];
  if (!required.every((model) => typeof model?.findAll === 'function')) {
    fail('Projection data is unavailable', 'TRAINING_PLAN_PROJECTION_UNAVAILABLE', 503);
  }
};

export const fetchTrainingPlanProjections = async ({
  actor, query, headerTimeZone, referenceDate,
} = {}) => {
  const parsed = parseTrainingPlanProjectionQuery(query);
  const models = getAllModels();
  requireProjectionModels(models);
  const clients = await resolveProjectionClients({
    actor,
    requestedClientIds: parsed.clientIds,
    User: models.User,
    ClientTrainerAssignment: models.ClientTrainerAssignment,
  });
  const clientIds = clients.map((client) => Number(client.id));
  const contexts = new Map(clients.map((client) => [
    Number(client.id),
    resolveClientTrainingDateContext({
      storedTimeZone: client.timeZone,
      storedTimeZoneConfigured: client.timeZoneConfigured,
      headerTimeZone,
      actorId: actor?.id,
      targetClientId: client.id,
      referenceDate,
    }),
  ]));

  const plans = await models.WorkoutPlan.findAll({
    where: { userId: { [Op.in]: clientIds }, status: 'active' },
    attributes: [
      'id', 'userId', 'trainerId', 'title', 'startDate', 'endDate', 'durationWeeks',
      'status', 'currentWeek', 'currentDay', 'planData', 'contentRevision', 'contentHash',
    ],
  });
  const planIds = plans.map(plain).map((plan) => plan.id).filter(Boolean);
  const receipts = planIds.length ? await models.WorkoutPlanCompletionReceipt.findAll({
    where: {
      workoutPlanId: { [Op.in]: planIds },
      clientId: { [Op.in]: clientIds },
      scheduledDate: { [Op.between]: [parsed.startDate, parsed.endDate] },
    },
    attributes: [
      'assignmentId', 'workoutPlanId', 'clientId', 'scheduledDate',
      'prescribedRevision', 'prescribedHash', 'completedAt',
    ],
  }) : [];

  const items = buildTrainingPlanProjectionItems({
    plans,
    receipts,
    clientDateContexts: contexts,
    startDate: parsed.startDate,
    endDate: parsed.endDate,
  });
  const offset = (parsed.page - 1) * parsed.limit;
  return {
    items: items.slice(offset, offset + parsed.limit),
    page: parsed.page,
    limit: parsed.limit,
    total: items.length,
    hasMore: offset + parsed.limit < items.length,
    range: { startDate: parsed.startDate, endDate: parsed.endDate },
  };
};