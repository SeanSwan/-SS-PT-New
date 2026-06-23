/**
 * Admin account impersonation service.
 * Admins can mint a short-lived target access token for QA without learning or resetting a user's password.
 */
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import User from '../../models/User.mjs';
import AdminAccountAuditLog from '../../models/AdminAccountAuditLog.mjs';
import { getJwtSecret } from '../../utils/jwtSecretGuard.mjs';
import { AdminOwnerGateError, requireOwnerAdmin } from '../admin/adminOwnerGate.mjs';

export const ADMIN_IMPERSONATION_ALLOWED_ROLES = ['client', 'trainer', 'user'];
export const ADMIN_IMPERSONATION_EXPIRES_IN = process.env.ADMIN_IMPERSONATION_EXPIRES_IN || '45m';

const SAFE_TARGET_ATTRIBUTES = [
  'id',
  'firstName',
  'lastName',
  'username',
  'email',
  'role',
  'photo',
  'subscriptionTier',
  'isActive',
  'isLocked',
  'accountStatus',
];

export class AdminImpersonationError extends Error {
  constructor(message, statusCode = 400, code = 'IMPERSONATION_ERROR') {
    super(message);
    this.name = 'AdminImpersonationError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

const requireAdminActor = (actor) => {
  if (!actor || actor.role !== 'admin') {
    throw new AdminImpersonationError(
      'Only admin users can start account testing sessions.',
      403,
      'IMPERSONATION_ADMIN_ONLY'
    );
  }
  if (actor.id === undefined || actor.id === null || String(actor.id).trim() === '') {
    throw new AdminImpersonationError(
      'Admin session is missing a valid actor id.',
      401,
      'IMPERSONATION_ACTOR_INVALID'
    );
  }
};

const requireOwnerActor = (actor, env) => {
  requireAdminActor(actor);
  try {
    requireOwnerAdmin(actor, env);
  } catch (error) {
    if (error instanceof AdminOwnerGateError) {
      const code = error.code === 'OWNER_GATE_NOT_CONFIGURED'
        ? 'IMPERSONATION_OWNER_GATE_NOT_CONFIGURED'
        : 'IMPERSONATION_OWNER_REQUIRED';
      throw new AdminImpersonationError(error.message, error.statusCode, code);
    }
    throw error;
  }
};

const parsePositiveInt = (value, code = 'IMPERSONATION_INVALID_TARGET') => {
  const raw = String(value ?? '');
  if (!/^[1-9]\d*$/.test(raw)) {
    throw new AdminImpersonationError('Target user ID must be a positive integer.', 400, code);
  }
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed)) {
    throw new AdminImpersonationError('Target user ID is outside the supported range.', 400, code);
  }
  return parsed;
};

const normalizeLimit = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 25;
  return Math.min(parsed, 50);
};

const normalizeRoleFilter = (role) => {
  if (role === undefined || role === null || role === '' || role === 'all') {
    return ADMIN_IMPERSONATION_ALLOWED_ROLES;
  }
  if (Array.isArray(role)) {
    throw new AdminImpersonationError(
      'Role filter must be one of client, trainer, user, or all.',
      400,
      'IMPERSONATION_INVALID_ROLE'
    );
  }
  const normalized = String(role).trim().toLowerCase();
  if (!ADMIN_IMPERSONATION_ALLOWED_ROLES.includes(normalized)) {
    throw new AdminImpersonationError(
      'Role filter must be one of client, trainer, user, or all.',
      400,
      'IMPERSONATION_INVALID_ROLE'
    );
  }
  return [normalized];
};
const escapeSearchTerm = (term) => term.replace(/[\\%_]/g, (char) => `\\${char}`);


const displayNameFor = (user) => {
  const first = typeof user.firstName === 'string' ? user.firstName.trim() : '';
  const last = typeof user.lastName === 'string' ? user.lastName.trim() : '';
  const full = `${first} ${last}`.trim();
  return full || user.username || user.email || `User #${user.id}`;
};

const toPlainUser = (user) => (typeof user?.toJSON === 'function' ? user.toJSON() : user);

export const sanitizeImpersonationTarget = (user) => {
  const plain = toPlainUser(user) || {};
  return {
    id: plain.id,
    firstName: plain.firstName || '',
    lastName: plain.lastName || '',
    displayName: displayNameFor(plain),
    username: plain.username || '',
    email: plain.email || '',
    role: plain.role,
    photo: plain.photo || null,
    subscriptionTier: plain.subscriptionTier || 'free',
  };
};

const assertUsableTarget = (target) => {
  if (!target || target.isActive !== true || target.isLocked === true || target.accountStatus !== 'active') {
    throw new AdminImpersonationError('Target user not found or inactive.', 404, 'IMPERSONATION_TARGET_NOT_FOUND');
  }
  if (!ADMIN_IMPERSONATION_ALLOWED_ROLES.includes(target.role)) {
    throw new AdminImpersonationError(
      'Only client, trainer, and user accounts can be tested with impersonation.',
      400,
      'IMPERSONATION_TARGET_INVALID_ROLE'
    );
  }
};

const buildTargetWhere = ({ role, search }) => {
  const where = {
    role: { [Op.in]: normalizeRoleFilter(role) },
    isActive: true,
    isLocked: false,
    accountStatus: 'active',
  };

  const term = typeof search === 'string' ? search.trim() : '';
  if (term) {
    const pattern = `%${escapeSearchTerm(term)}%`;
    where[Op.or] = [
      { firstName: { [Op.iLike]: pattern } },
      { lastName: { [Op.iLike]: pattern } },
      { username: { [Op.iLike]: pattern } },
      { email: { [Op.iLike]: pattern } },
    ];
  }

  return where;
};

export async function listAdminImpersonationTargets({ actor, query = {}, UserModel = User, env = process.env } = {}) {
  requireOwnerActor(actor, env);

  const targets = await UserModel.findAll({
    where: buildTargetWhere({ role: query.role, search: query.search }),
    attributes: SAFE_TARGET_ATTRIBUTES.filter((field) => !['isActive', 'accountStatus'].includes(field)),
    order: [['firstName', 'ASC'], ['lastName', 'ASC'], ['id', 'ASC']],
    limit: normalizeLimit(query.limit),
  });

  return { success: true, targets: targets.map(sanitizeImpersonationTarget) };
}

export async function startAdminImpersonationSession({
  actor,
  targetUserId,
  UserModel = User,
  AuditModel = AdminAccountAuditLog,
  env = process.env,
  signJwt = jwt.sign,
  getSecret = getJwtSecret,
  tokenIdFactory = uuidv4,
  expiresIn = ADMIN_IMPERSONATION_EXPIRES_IN,
} = {}) {
  requireOwnerActor(actor, env);
  const parsedTargetId = parsePositiveInt(targetUserId);
  const target = await UserModel.findByPk(parsedTargetId, { attributes: SAFE_TARGET_ATTRIBUTES });
  assertUsableTarget(target);

  const sanitizedTarget = sanitizeImpersonationTarget(target);
  const actorId = String(actor.id);
  const tokenId = tokenIdFactory();
  await AuditModel.create({
    actorUserId: Number(actor.id),
    targetUserId: Number(sanitizedTarget.id),
    action: 'impersonation_start',
    reason: 'Owner started account testing session.',
    previousState: {
      role: sanitizedTarget.role,
      isActive: true,
      accountStatus: 'active',
    },
    nextState: {
      role: sanitizedTarget.role,
      impersonation: true,
      expiresIn,
    },
    metadata: {
      source: 'auth_admin_impersonation',
      targetRole: sanitizedTarget.role,
    },
  });
  const token = signJwt(
    {
      id: sanitizedTarget.id,
      role: sanitizedTarget.role,
      tokenType: 'access',
      tokenId,
      impersonation: true,
      impersonatedBy: actorId,
      impersonationActorRole: 'admin',
    },
    getSecret(),
    { expiresIn }
  );

  return {
    success: true,
    token,
    user: sanitizedTarget,
    impersonation: {
      actorId,
      actorRole: 'admin',
      targetUserId: String(sanitizedTarget.id),
      targetRole: sanitizedTarget.role,
      expiresIn,
    },
  };
}

export default {
  listAdminImpersonationTargets,
  startAdminImpersonationSession,
};