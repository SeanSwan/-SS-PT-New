import { getAllModels } from '../models/index.mjs';

const parseId = (value) => {
  const id = Number(value);
  return Number.isFinite(id) ? id : null;
};

const isTrainerAssigned = async (models, clientId, trainerId) => {
  const { ClientTrainerAssignment } = models;
  if (!ClientTrainerAssignment) {
    return false;
  }

  const assignment = await ClientTrainerAssignment.findOne({
    where: {
      clientId,
      trainerId,
      status: 'active'
    }
  });

  return Boolean(assignment);
};

export const ensureClientAccess = async (req, clientIdInput) => {
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

  const client = await User.findByPk(clientId, { attributes: ['id', 'role'] });
  if (!client || client.role !== 'client') {
    return { allowed: false, status: 404, message: 'Client not found' };
  }

  if (req.user?.role === 'admin') {
    return { allowed: true, clientId, models };
  }

  if (req.user?.role === 'client') {
    if (requesterId === clientId) {
      return { allowed: true, clientId, models };
    }
    return { allowed: false, status: 403, message: 'Access denied' };
  }

  if (req.user?.role === 'trainer') {
    const assigned = await isTrainerAssigned(models, clientId, requesterId);
    if (!assigned) {
      return { allowed: false, status: 403, message: 'Not assigned to this client' };
    }
    return { allowed: true, clientId, models };
  }

  return { allowed: false, status: 403, message: 'Access denied' };
};
