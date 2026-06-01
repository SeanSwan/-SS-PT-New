/**
 * Client profile write dispatchers
 * ================================
 * Small command-lane executors for confirmed admin client profile updates.
 * Results stay PII-safe; caller UI already knows the client identity.
 */
import { getAllModels } from '../../../models/index.mjs';

const CLIENT_UPDATE_FIELDS = [
  'firstName',
  'lastName',
  'phone',
  'dateOfBirth',
  'gender',
  'weight',
  'height',
  'fitnessGoal',
  'trainingExperience',
  'healthConcerns',
  'emergencyContact',
  'clientSource',
  'accountStatus',
  'canGenerateWorkoutPlans',
];

const emptyUpdateReceipt = (clientId, found = false) => ({
  clientId,
  found,
  updated: false,
  updatedFields: [],
  clientSourceChanged: false,
  accountStatusChanged: false,
  isLockedChanged: false,
  canGenerateWorkoutPlansChanged: false,
});

function normalizeClientUpdates(params) {
  return CLIENT_UPDATE_FIELDS.reduce((updates, field) => {
    if (params[field] === undefined) return updates;
    if (field === 'canGenerateWorkoutPlans') {
      updates[field] = params[field] === true || params[field] === 'true';
    } else {
      updates[field] = params[field];
    }
    return updates;
  }, {});
}

export async function dispatchUpdateClient(params, ctx = {}) {
  const { User } = getAllModels();
  const clientId = params.clientId ?? ctx.resolvedClient?.id;
  const sequelize = ctx.options?.sequelize || ctx.sequelize || null;
  const transaction = sequelize ? await sequelize.transaction() : null;
  const options = transaction ? { transaction } : {};
  const safeUpdates = normalizeClientUpdates(params);
  const updatedFields = Object.keys(safeUpdates).sort();

  if (updatedFields.length === 0) {
    if (transaction) await transaction.rollback();
    return emptyUpdateReceipt(clientId, true);
  }

  try {
    const client = await User.findOne({
      where: { id: clientId, role: 'client' },
      ...options,
    });

    if (!client) {
      if (transaction) await transaction.rollback();
      return emptyUpdateReceipt(clientId, false);
    }

    await client.update(safeUpdates, options);
    if (transaction) await transaction.commit();

    return {
      clientId,
      found: true,
      updated: true,
      updatedFields,
      clientSourceChanged: updatedFields.includes('clientSource'),
      accountStatusChanged: updatedFields.includes('accountStatus'),
      isLockedChanged: false,
      canGenerateWorkoutPlansChanged: updatedFields.includes('canGenerateWorkoutPlans'),
    };
  } catch (error) {
    if (transaction) await transaction.rollback();
    throw error;
  }
}
