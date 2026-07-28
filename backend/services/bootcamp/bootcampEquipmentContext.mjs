import { Op } from 'sequelize';

function addEquipmentToken(tokens, value) {
  if (typeof value !== 'string') return;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return;

  tokens.add(normalized);
  if (normalized.includes('_')) tokens.add(normalized.replace(/_/g, ' '));
  if (normalized.includes(' ')) tokens.add(normalized.replace(/\s+/g, '_'));
}

export function buildAvailableEquipmentList(equipmentItems = []) {
  const tokens = new Set(['bodyweight', 'none']);

  for (const item of equipmentItems) {
    if (
      !item
      || item.isActive === false
      || item.approvalStatus === 'rejected'
      || item.approvalStatus === 'pending'
    ) {
      continue;
    }

    addEquipmentToken(tokens, item.trainerLabel);
    addEquipmentToken(tokens, item.name);
    addEquipmentToken(tokens, item.category);
    addEquipmentToken(tokens, item.resistanceType);
    addEquipmentToken(tokens, item.equipmentType);
  }

  return [...tokens];
}

const EQUIPMENT_PROFILE_ACCESS_ERROR = 'Equipment profile not found or unavailable';

const makeEquipmentProfileAccessError = () => {
  const error = new Error(EQUIPMENT_PROFILE_ACCESS_ERROR);
  error.statusCode = 403;
  return error;
};

export async function verifyBootcampEquipmentProfileAccess(equipmentProfileId, user = {}) {
  if (!equipmentProfileId) return null;

  const { getAllModels } = await import('../../models/index.mjs');
  const { EquipmentProfile } = getAllModels();
  if (!EquipmentProfile) throw makeEquipmentProfileAccessError();

  const profile = user.role === 'admin'
    ? await EquipmentProfile.findByPk(equipmentProfileId)
    : await EquipmentProfile.findOne({ where: { id: equipmentProfileId, trainerId: user.id } });

  if (!profile) throw makeEquipmentProfileAccessError();
  return profile;
}
export async function getBootcampEquipmentContext(equipmentProfileId) {
  const emptyContext = {
    availableEquipment: buildAvailableEquipmentList([]),
    equipmentMappings: [],
    strictEquipment: Boolean(equipmentProfileId),
  };

  if (!equipmentProfileId) return { ...emptyContext, strictEquipment: false };

  try {
    const { getAllModels } = await import('../../models/index.mjs');
    const models = getAllModels();
    const profile = models.EquipmentProfile
      ? await models.EquipmentProfile.findByPk(equipmentProfileId)
      : null;

    if (!profile || !models.EquipmentItem) return emptyContext;

    const equipmentItems = await models.EquipmentItem.findAll({
      where: {
        profileId: equipmentProfileId,
        isActive: true,
        approvalStatus: { [Op.in]: ['approved', 'manual'] },
      },
      raw: true,
    });
    const equipmentItemIds = equipmentItems.map(item => item.id).filter(Boolean);
    let equipmentMappings = [];
    const EquipmentExerciseMap = models.EquipmentExerciseMap;

    if (EquipmentExerciseMap && equipmentItemIds.length > 0) {
      equipmentMappings = await EquipmentExerciseMap.findAll({
        where: {
          equipmentItemId: { [Op.in]: equipmentItemIds },
          confirmed: true,
        },
        raw: true,
      });
    }

    return {
      availableEquipment: buildAvailableEquipmentList(equipmentItems),
      equipmentMappings,
      strictEquipment: true,
    };
  } catch (eqErr) {
    const { default: logger } = await import('../../utils/logger.mjs');
    logger.warn('[BootcampGen] Equipment profile query failed, using bodyweight-only strict filter:', eqErr.message);
    return emptyContext;
  }
}
