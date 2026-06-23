/** Owner-gated account command service with transactional updates and durable audit writes. */
import User from '../../models/User.mjs';
import AdminAccountAuditLog from '../../models/AdminAccountAuditLog.mjs';
import sequelize from '../../database.mjs';
import { Op } from 'sequelize';
import { requireOwnerAdmin } from './adminOwnerGate.mjs';

const MANAGEABLE_ROLES = ['client', 'trainer', 'user']; const RETENTION_MONTHS = 6;
const COMMAND_TARGET_ATTRIBUTES = ['id', 'firstName', 'lastName', 'username', 'email', 'role', 'isActive', 'isLocked', 'accountStatus', 'subscriptionTier', 'accountDeactivatedAt', 'accountRetentionUntil'];

const parseListLimit = (value) => {
  const parsed = Number.parseInt(String(value ?? '50'), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 50;
  return Math.min(parsed, 75);
};

const normalizeRoleFilter = (role = 'all') => {
  const normalized = String(role || 'all').trim().toLowerCase();
  if (normalized === 'all') return 'all';
  if (!MANAGEABLE_ROLES.includes(normalized)) {
    throw new AdminAccountCommandError('Role filter is not supported for account commands.', 400, 'ACCOUNT_COMMAND_BAD_ROLE');
  }
  return normalized;
};

const normalizeStatusFilter = (status = 'all') => {
  const normalized = String(status || 'all').trim().toLowerCase();
  const allowed = new Set(['all', 'active', 'locked', 'inactive']);
  if (!allowed.has(normalized)) {
    throw new AdminAccountCommandError('Status filter is not supported for account commands.', 400, 'ACCOUNT_COMMAND_BAD_STATUS');
  }
  return normalized;
};

const buildDisplayName = (plain) => {
  const fullName = [plain.firstName, plain.lastName].filter(Boolean).join(' ').trim();
  return fullName || plain.username || plain.email || `Account ${plain.id}`;
};

const sanitizeTargetRow = (user) => {
  const plain = toPlain(user) || {};
  const accountStatus = plain.accountStatus || 'active';
  const isActive = plain.isActive === true;
  const isLocked = plain.isLocked === true;
  return {
    id: plain.id,
    displayName: buildDisplayName(plain),
    username: plain.username || null,
    email: plain.email || null,
    role: plain.role,
    subscriptionTier: plain.subscriptionTier || 'free',
    isActive,
    isLocked,
    accountStatus,
    accountDeactivatedAt: plain.accountDeactivatedAt || null,
    accountRetentionUntil: plain.accountRetentionUntil || null,
    canImpersonate: isActive && !isLocked && accountStatus === 'active',
  };
};
export class AdminAccountCommandError extends Error {
  constructor(message, statusCode = 400, code = 'ACCOUNT_COMMAND_ERROR', cause = null) {
    super(message);
    this.name = 'AdminAccountCommandError';
    this.statusCode = statusCode;
    this.code = code;
    if (cause) this.cause = cause;
  }
}

const parsePositiveId = (value) => {
  const raw = String(value ?? '').trim();
  if (!/^[1-9]\d*$/.test(raw)) {
    throw new AdminAccountCommandError('Target user id must be a positive integer.', 400, 'ACCOUNT_COMMAND_BAD_TARGET');
  }
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed)) {
    throw new AdminAccountCommandError('Target user id is outside the supported range.', 400, 'ACCOUNT_COMMAND_BAD_TARGET');
  }
  return parsed;
};

const normalizeReason = (reason) => {
  const normalized = String(reason || '').replace(/\s+/g, ' ').trim();
  if (normalized.length < 3) {
    throw new AdminAccountCommandError('A reason is required for account commands.', 400, 'ACCOUNT_COMMAND_REASON_REQUIRED');
  }
  return normalized.slice(0, 500);
};

const toPlain = (user) => (typeof user?.toJSON === 'function' ? user.toJSON() : user);

const snapshotState = (user) => {
  const plain = toPlain(user) || {};
  return {
    role: plain.role || null,
    isActive: plain.isActive === true,
    isLocked: plain.isLocked === true,
    accountStatus: plain.accountStatus || null,
    refreshTokenPresent: Boolean(plain.refreshTokenHash),
    accountDeactivatedAt: plain.accountDeactivatedAt || null,
    accountRetentionUntil: plain.accountRetentionUntil || null,
  };
};

const sanitizeAccount = (user) => {
  const plain = toPlain(user) || {};
  return {
    id: plain.id,
    role: plain.role,
    isActive: plain.isActive === true,
    isLocked: plain.isLocked === true,
    accountStatus: plain.accountStatus || null,
    accountDeactivatedAt: plain.accountDeactivatedAt || null,
    accountRetentionUntil: plain.accountRetentionUntil || null,
  };
};

const retentionUntilFrom = (date) => {
  const retentionUntil = new Date(date);
  retentionUntil.setMonth(retentionUntil.getMonth() + RETENTION_MONTHS);
  return retentionUntil;
};

const loadTarget = async ({ actor, targetUserId, UserModel, transaction }) => {
  const parsedTargetId = parsePositiveId(targetUserId);
  if (String(actor?.id ?? '') === String(parsedTargetId)) {
    throw new AdminAccountCommandError('Admins cannot target their own account.', 400, 'ACCOUNT_COMMAND_SELF_TARGET');
  }

  const target = await UserModel.findByPk(parsedTargetId, { transaction });
  if (!target) {
    throw new AdminAccountCommandError('Target account not found.', 404, 'ACCOUNT_COMMAND_TARGET_NOT_FOUND');
  }
  if (target.role === 'admin') {
    throw new AdminAccountCommandError('Admin accounts require a separate break-glass protocol.', 403, 'ACCOUNT_COMMAND_ADMIN_TARGET');
  }
  if (!MANAGEABLE_ROLES.includes(target.role)) {
    throw new AdminAccountCommandError('Target account role cannot be managed here.', 400, 'ACCOUNT_COMMAND_TARGET_ROLE');
  }
  return target;
};

const writeAudit = async ({ AuditModel, actor, target, action, reason, previousState, nextState, metadata, transaction }) => {
  try {
    await AuditModel.create({
      actorUserId: Number(actor.id),
      targetUserId: Number(target.id),
      action,
      reason,
      previousState,
      nextState,
      metadata: metadata || {},
    }, { transaction });
  } catch (error) {
    throw new AdminAccountCommandError(
      'Account command audit could not be written.',
      500,
      'ACCOUNT_COMMAND_AUDIT_FAILED',
      error
    );
  }
};

const executeCommand = async ({
  actor,
  targetUserId,
  reason,
  action,
  updateFor,
  env = process.env,
  UserModel = User,
  AuditModel = AdminAccountAuditLog,
  sequelize: sequelizeClient = sequelize,
  metadata = {},
}) => {
  requireOwnerAdmin(actor, env);


  const normalizedReason = normalizeReason(reason);
  return sequelizeClient.transaction(async (transaction) => {
    const target = await loadTarget({ actor, targetUserId, UserModel, transaction });
    const previousState = snapshotState(target);
    const updatePayload = updateFor({ target, transaction });
    await target.update(updatePayload, { transaction });
    const nextState = snapshotState(target);

    await writeAudit({
      AuditModel,
      actor,
      target,
      action,
      reason: normalizedReason,
      previousState,
      nextState,
      metadata,
      transaction,
    });

    return {
      success: true,
      action,
      account: sanitizeAccount(target),
    };
  });
};

export const listAccountCommandTargets = async ({
  actor,
  query = {},
  env = process.env,
  UserModel = User,
} = {}) => {
  requireOwnerAdmin(actor, env);

  const roleFilter = normalizeRoleFilter(query.role);
  const statusFilter = normalizeStatusFilter(query.status);
  const where = {
    role: roleFilter === 'all' ? { [Op.in]: MANAGEABLE_ROLES } : roleFilter,
  };

  if (statusFilter === 'active') {
    where.isActive = true;
    where.isLocked = false;
  } else if (statusFilter === 'locked') {
    where.isLocked = true;
  } else if (statusFilter === 'inactive') {
    where.isActive = false;
  }

  const search = String(query.search || '').trim();
  if (search) {
    const pattern = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
    where[Op.or] = [
      { firstName: { [Op.iLike]: pattern } },
      { lastName: { [Op.iLike]: pattern } },
      { username: { [Op.iLike]: pattern } },
      { email: { [Op.iLike]: pattern } },
    ];
  }

  const rows = await UserModel.findAll({
    where,
    attributes: COMMAND_TARGET_ATTRIBUTES,
    order: [['lastName', 'ASC'], ['firstName', 'ASC'], ['id', 'ASC']],
    limit: parseListLimit(query.limit),
  });

  return {
    success: true,
    targets: rows.map(sanitizeTargetRow),
  };
};
export const blockAccount = (options = {}) => executeCommand({
  ...options,
  action: 'account_block',
  updateFor: () => ({
    isLocked: true,
    refreshTokenHash: null,
  }),
});

export const deactivateAccount = (options = {}) => executeCommand({
  ...options,
  action: 'account_deactivate',
  updateFor: () => {
    const deactivatedAt = typeof options.now === 'function' ? options.now() : new Date();
    return {
      isActive: false,
      isLocked: true,
      refreshTokenHash: null,
      accountDeactivatedAt: deactivatedAt,
      accountRetentionUntil: retentionUntilFrom(deactivatedAt),
    };
  },
});

export const reactivateAccount = (options = {}) => executeCommand({
  ...options,
  action: 'account_reactivate',
  updateFor: () => ({
    isActive: true,
    isLocked: false,
    accountDeactivatedAt: null,
    accountRetentionUntil: null,
  }),
});

export const forceLogoutAccount = (options = {}) => executeCommand({
  ...options,
  action: 'force_logout',
  updateFor: () => ({
    refreshTokenHash: null,
  }),
});

export default { listAccountCommandTargets, blockAccount, deactivateAccount, reactivateAccount, forceLogoutAccount };
