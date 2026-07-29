/**
 * ============================================================================
 * FILE: dispatchers/trainerCommandDispatchers.mjs
 * PURPOSE: Trainer-management read dispatchers for Swan Coach
 * OWNER: Codex | CREATED: 2026-05-31
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 *   Provides PII-safe trainer/client assignment summaries for command cards.
 */

import { Op } from 'sequelize';
import { getAllModels } from '../../../models/index.mjs';
import { CRITICAL_PERMISSIONS, PERMISSION_TYPES } from '../../../models/TrainerPermissions.mjs';
import {
  isNonDeductingClient,
  normalizeClientSource,
  normalizePaidSessionCount,
} from '../../sessionBillingPolicy.mjs';

const sourceCounts = (clients) => clients.reduce((counts, client) => {
  const source = normalizeClientSource(client?.clientSource, 'external');
  if (source === 'swanstudios') counts.swanstudiosClients += 1;
  else if (source === 'move_fitness') counts.moveFitnessClients += 1;
  else counts.externalClients += 1;
  return counts;
}, {
  swanstudiosClients: 0,
  moveFitnessClients: 0,
  externalClients: 0,
});

const toRecord = (row) => (row?.toJSON ? row.toJSON() : row);

const paidSessionCount = (client) => {
  if (isNonDeductingClient(client)) return 0;
  return normalizePaidSessionCount(client?.availableSessions);
};

const averageRating = (trainers) => {
  const ratings = trainers
    .map((trainer) => Number(trainer.averageRating))
    .filter(Number.isFinite);
  if (!ratings.length) return null;
  const total = ratings.reduce((sum, rating) => sum + rating, 0);
  return Number((total / ratings.length).toFixed(1));
};

const VALID_PERMISSION_TYPES = new Set(Object.values(PERMISSION_TYPES));

const normalizePermissionTypes = (params = {}) => {
  const raw = params.permissions || params.permissionTypes || [params.permissionType];
  const list = Array.isArray(raw) ? raw : [raw];
  return [...new Set(list.map((value) => String(value || '').trim()).filter(Boolean))]
    .filter((value) => VALID_PERMISSION_TYPES.has(value));
};

/**
 * Dispatcher for promote_to_trainer.
 *
 * @param {{ userId: number, newRole: 'trainer' }} params
 * @returns {Promise<Record<string, unknown>>}
 */
export async function dispatchPromoteToTrainer(params = {}) {
  const { User } = getAllModels();
  const userId = Number(params.userId);
  const targetUser = await User.findByPk(userId);

  if (!targetUser) {
    return {
      userId,
      targetFound: false,
      previousRole: null,
      role: null,
      promoted: false,
      alreadyTrainer: false,
      blocked: false,
    };
  }

  const previousRole = targetUser.role ?? null;
  const alreadyTrainer = previousRole === 'trainer';
  const blocked = previousRole === 'admin';

  if (!alreadyTrainer && !blocked) {
    await targetUser.update({ role: 'trainer' });
  }

  return {
    userId,
    targetFound: true,
    previousRole,
    role: alreadyTrainer || blocked ? previousRole : 'trainer',
    promoted: !alreadyTrainer && !blocked,
    alreadyTrainer,
    blocked,
  };
}

/**
 * Dispatcher for list_trainers.
 *
 * @param {{ includeAdmin?: boolean, limit?: number, page?: number }} params
 * @returns {Promise<Record<string, unknown>>}
 */
export async function dispatchListTrainers(params = {}) {
  const { User } = getAllModels();
  const limit = Math.min(25, Math.max(1, Number(params.limit) || 10));
  const page = Math.max(1, Number(params.page) || 1);
  const includeAdmin = params.includeAdmin === true || params.includeAdmin === 'true';
  const roles = includeAdmin ? ['trainer', 'admin'] : ['trainer'];

  const { count, rows } = await User.findAndCountAll({
    where: {
      role: { [Op.in]: roles },
      isActive: true,
    },
    attributes: ['id', 'role', 'averageRating', 'yearsOfExperience', 'totalSessions'],
    order: [['firstName', 'ASC']],
    limit,
    offset: (page - 1) * limit,
  });
  const trainers = rows.map(toRecord);

  return {
    totalTrainers: count,
    returnedTrainers: trainers.length,
    firstTrainerId: trainers[0]?.id ?? null,
    trainerRoleCount: trainers.filter((trainer) => trainer.role === 'trainer').length,
    adminTrainerCount: trainers.filter((trainer) => trainer.role === 'admin').length,
    averageRating: averageRating(trainers),
    page,
    limit,
  };
}

/**
 * Dispatcher for view_trainer_clients.
 *
 * @param {{ trainerId: number }} params
 * @returns {Promise<Record<string, unknown>>}
 */
export async function dispatchViewTrainerClients(params) {
  const { User, ClientTrainerAssignment } = getAllModels();
  const trainerId = Number(params.trainerId);

  const assignments = await ClientTrainerAssignment.findAll({
    where: { trainerId, status: 'active' },
    include: [{
      model: User,
      as: 'client',
      attributes: ['id', 'availableSessions', 'clientSource', 'sessionBillingMode', 'accountStatus'],
      required: false,
    }],
    order: [['createdAt', 'DESC']],
  });

  const clients = assignments
    .map((assignment) => assignment.client || null)
    .filter(Boolean);
  const counts = sourceCounts(clients);

  return {
    trainerId,
    totalClients: clients.length,
    firstClientId: clients[0]?.id ?? assignments[0]?.clientId ?? null,
    ...counts,
    activeAccountCount: clients.filter((client) => client.accountStatus === 'active').length,
    stubAccountCount: clients.filter((client) => client.accountStatus === 'stub').length,
    availableSessionTotal: clients.reduce(
      (sum, client) => sum + paidSessionCount(client),
      0,
    ),
  };
}

/**
 * Dispatcher for set_trainer_permissions.
 *
 * @param {{ trainerId: number, permissions: string[], expiresAt?: string, reason?: string }} params
 * @returns {Promise<Record<string, unknown>>}
 */
export async function dispatchSetTrainerPermissions(params = {}, ctx = {}) {
  const { User, TrainerPermissions } = getAllModels();
  const trainerId = Number(params.trainerId);
  const permissionTypes = normalizePermissionTypes(params);
  const trainer = await User.findOne({
    where: { id: trainerId, role: 'trainer' },
    attributes: ['id', 'role'],
  });

  if (!trainer) {
    return {
      trainerId,
      trainerFound: false,
      requestedPermissionCount: permissionTypes.length,
      grantedPermissionCount: 0,
      skippedExistingCount: 0,
      criticalPermissionCount: 0,
      firstGrantedPermissionId: null,
    };
  }

  const expiresAt = params.expiresAt ? new Date(params.expiresAt) : null;
  // The table's audit column is `notes` (no `reason` column exists); the command keeps
  // accepting `reason` and maps it there.
  const notes = params.reason || params.notes || null;
  const granted = [];
  let skippedExistingCount = 0;

  for (const permissionType of permissionTypes) {
    const existingPermission = await TrainerPermissions.findOne({
      where: {
        trainerId,
        permissionType,
        isActive: true,
        [Op.or]: [
          { expiresAt: null },
          { expiresAt: { [Op.gt]: new Date() } },
        ],
      },
    });

    if (existingPermission) {
      skippedExistingCount += 1;
      continue;
    }

    granted.push(await TrainerPermissions.create({
      trainerId,
      permissionType,
      grantedBy: Number(ctx.user?.id),
      expiresAt,
      isActive: true,
      notes,
    }));
  }

  return {
    trainerId,
    trainerFound: true,
    requestedPermissionCount: permissionTypes.length,
    grantedPermissionCount: granted.length,
    skippedExistingCount,
    criticalPermissionCount: permissionTypes.filter((type) => CRITICAL_PERMISSIONS.includes(type)).length,
    firstGrantedPermissionId: granted[0]?.id ?? null,
  };
}

/**
 * Dispatcher for revoke_trainer_permission.
 *
 * @param {{ permissionId: number, reason?: string }} params
 * @returns {Promise<Record<string, unknown>>}
 */
export async function dispatchRevokeTrainerPermission(params = {}, ctx = {}) {
  const { TrainerPermissions } = getAllModels();
  const permissionId = Number(params.permissionId);
  const permission = await TrainerPermissions.findByPk(permissionId);

  if (!permission) {
    return {
      permissionId,
      permissionFound: false,
      revoked: false,
      trainerId: null,
      permissionType: null,
      deactivatedBy: Number(ctx.user?.id) || null,
    };
  }

  const deactivatedBy = Number(ctx.user?.id) || null;
  const wasActive = permission.isActive !== false;
  // Real audit columns are revokedAt + notes (no revoked-by column exists — the revoking admin
  // is preserved inside the notes text). deactivatedBy stays in the RESPONSE contract below.
  const revokeNote = params.reason || params.notes || permission.notes || null;
  await permission.update({
    isActive: false,
    revokedAt: new Date(),
    notes: revokeNote
      ? `${revokeNote} (revoked by admin ${deactivatedBy})`
      : `Revoked by admin ${deactivatedBy}`,
  });

  return {
    permissionId,
    permissionFound: true,
    revoked: wasActive,
    trainerId: permission.trainerId ?? null,
    permissionType: permission.permissionType ?? null,
    deactivatedBy,
  };
}
