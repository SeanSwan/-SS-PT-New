import { getAllModels } from '../models/index.mjs';

const parseId = (value) => {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }

  if (typeof value === 'string' && /^[1-9]\d*$/.test(value)) {
    const id = Number(value);
    return Number.isSafeInteger(id) ? id : null;
  }

  return null;
};

/**
 * `'user'` is the DEFAULT role minted by public self-registration, so any
 * check that means "is this the client themselves?" must treat it as
 * client-equivalent. Exported (launch audit 2026-08-04) because several call
 * sites had hand-rolled `role === 'client'`, which silently fails OPEN for
 * default-role accounts. Import this instead of re-deriving it.
 */
export const isClientEquivalentRole = (role) => role === 'client' || role === 'user';

const isTrainerAssigned = async (models, clientId, trainerId, transaction) => {
  const { ClientTrainerAssignment } = models;
  if (!ClientTrainerAssignment) {
    return false;
  }

  const assignment = await ClientTrainerAssignment.findOne({
    where: {
      clientId,
      trainerId,
      status: 'active'
    },
    ...(transaction ? { transaction, lock: transaction.LOCK.UPDATE } : {}),
  });

  return Boolean(assignment);
};

// Optional writer transaction stabilizes User then assignment through COMMIT.
// Existing callers retain their read-only/autocommit authorization contract.
export const ensureClientAccess = async (req, clientIdInput, { transaction } = {}) => {
  const clientId = parseId(clientIdInput);
  if (!clientId) {
    return { allowed: false, status: 400, message: 'Invalid user ID' };
  }

  const requesterId = parseId(req.user?.id);
  if (!requesterId) {
    return { allowed: false, status: 401, message: 'Unauthorized' };
  }

  const models = getAllModels();
  const { User } = models;

  const client = await User.findByPk(clientId, {
    attributes: ['id', 'role', 'timeZone', 'timeZoneConfigured'],
    ...(transaction ? { transaction, lock: transaction.LOCK.UPDATE } : {}),
  });
  if (!client || !isClientEquivalentRole(client.role)) {
    return { allowed: false, status: 404, message: 'Client not found' };
  }

  if (req.user?.role === 'admin') {
    return { allowed: true, clientId, client, models };
  }

  if (isClientEquivalentRole(req.user?.role)) {
    if (requesterId === clientId) {
      return { allowed: true, clientId, client, models };
    }
    return { allowed: false, status: 403, message: 'Access denied' };
  }

  if (req.user?.role === 'trainer') {
    const assigned = await isTrainerAssigned(models, clientId, requesterId, transaction);
    if (!assigned) {
      return { allowed: false, status: 403, message: 'Not assigned to this client' };
    }
    return { allowed: true, clientId, client, models };
  }

  return { allowed: false, status: 403, message: 'Access denied' };
};
