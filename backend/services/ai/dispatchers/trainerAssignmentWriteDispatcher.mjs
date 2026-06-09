/**
 * Trainer Assignment Write Dispatcher
 * ===================================
 *
 * Swan Coach write command for assigning a client to a trainer without minting
 * session inventory or exposing client/trainer PII in the result.
 */

import { Op } from 'sequelize';
import defaultSequelize from '../../../database.mjs';
import { getAllModels } from '../../../models/index.mjs';
import logger from '../../../utils/logger.mjs';
import { resolveCommandClientId } from './clientScope.mjs';

const DEFAULT_ASSIGNMENT_NOTES = 'Assigned via Swan Coach command center';

const normalizeSequelizeUpdateCount = (result) => {
  if (Array.isArray(result)) return Number(result[0] || 0);
  return Number(result || 0);
};

const assignmentNotes = (params = {}) => (
  String(params.notes || DEFAULT_ASSIGNMENT_NOTES).trim() || DEFAULT_ASSIGNMENT_NOTES
);

const assignedByFrom = (ctx = {}) => Number(ctx.user?.id);

const sequelizeFrom = (ctx = {}) => ctx.options?.sequelize || ctx.sequelize || defaultSequelize;

const buildNotAssignedResult = ({ clientId, trainerId, existingAssignment = null }) => ({
  clientId,
  trainerId,
  assigned: false,
  alreadyAssigned: Boolean(existingAssignment),
  assignmentId: existingAssignment?.id ?? null,
  priorAssignmentsDeactivated: 0,
});

const buildAssignedResult = ({ clientId, trainerId, assignment, assignmentId, deactivatedResult }) => ({
  clientId,
  trainerId,
  assigned: true,
  alreadyAssigned: false,
  assignmentId: assignment?.id ?? assignmentId,
  priorAssignmentsDeactivated: normalizeSequelizeUpdateCount(deactivatedResult),
});

const findClientAndTrainer = ({ User, clientId, trainerId, transaction }) => (
  Promise.all([
    User.findOne({
      where: {
        id: clientId,
        role: { [Op.in]: ['client', 'user'] },
      },
      transaction,
    }),
    User.findOne({
      where: {
        id: trainerId,
        role: { [Op.in]: ['trainer', 'admin'] },
      },
      transaction,
    }),
  ])
);

const hasAssignableTargets = ({ client, trainer, assignedBy }) => (
  Boolean(client && trainer && Number.isSafeInteger(assignedBy))
);

const findActiveAssignment = ({ ClientTrainerAssignment, clientId, trainerId, transaction }) => (
  ClientTrainerAssignment.findOne({
    where: { clientId, trainerId, status: 'active' },
    transaction,
  })
);

const deactivatePriorAssignments = ({ ClientTrainerAssignment, clientId, assignedBy, transaction }) => (
  ClientTrainerAssignment.update(
    {
      status: 'inactive',
      deactivatedAt: new Date(),
      lastModifiedBy: assignedBy,
    },
    {
      where: { clientId, status: 'active' },
      transaction,
    }
  )
);

const insertAssignment = ({ sequelize, clientId, trainerId, assignedBy, notes, transaction }) => (
  sequelize.query(
    `INSERT INTO client_trainer_assignments ("clientId", "trainerId", "assignedBy", notes, status, "createdAt", "updatedAt")
     VALUES (:clientId, :trainerId, :assignedBy, :notes, 'active', NOW(), NOW())
     RETURNING *`,
    {
      replacements: {
        clientId,
        trainerId,
        assignedBy,
        notes,
      },
      transaction,
    }
  )
);

const insertedAssignmentId = (rows) => rows?.[0]?.id ?? null;

const findInsertedAssignment = ({ ClientTrainerAssignment, assignmentId, transaction }) => (
  assignmentId ? ClientTrainerAssignment.findByPk(assignmentId, { transaction }) : null
);

export const dispatchAssignTrainer = async (params = {}, ctx = {}) => {
  const { User, ClientTrainerAssignment } = getAllModels();
  const clientId = resolveCommandClientId(params, ctx);
  const trainerId = Number(params.trainerId);
  const assignedBy = assignedByFrom(ctx);
  const notes = assignmentNotes(params);
  const sequelize = sequelizeFrom(ctx);
  const transaction = await sequelize.transaction();

  try {
    const [client, trainer] = await findClientAndTrainer({
      User,
      clientId,
      trainerId,
      transaction,
    });

    if (!hasAssignableTargets({ client, trainer, assignedBy })) {
      await transaction.rollback();
      return buildNotAssignedResult({ clientId, trainerId });
    }

    const existingAssignment = await findActiveAssignment({
      ClientTrainerAssignment,
      clientId,
      trainerId,
      transaction,
    });

    if (existingAssignment) {
      await transaction.rollback();
      return buildNotAssignedResult({ clientId, trainerId, existingAssignment });
    }

    const deactivatedResult = await deactivatePriorAssignments({
      ClientTrainerAssignment,
      clientId,
      assignedBy,
      transaction,
    });
    const [rows] = await insertAssignment({
      sequelize,
      clientId,
      trainerId,
      assignedBy,
      notes,
      transaction,
    });
    const assignmentId = insertedAssignmentId(rows);
    const assignment = await findInsertedAssignment({
      ClientTrainerAssignment,
      assignmentId,
      transaction,
    });

    await transaction.commit();

    return buildAssignedResult({
      clientId,
      trainerId,
      assignment,
      assignmentId,
      deactivatedResult,
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('[CommandDispatcher] assign_trainer failed', {
      clientId,
      trainerId,
      error: error.message,
    });
    throw error;
  }
};
