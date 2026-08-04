/**
 * Sequelize health-data encryption hooks.
 * Sensitive scalar fields and duplicate nutrition text in JSONB are encrypted
 * at rest, then restored on read and write responses.
 */
import {
  decrypt,
  decryptFields,
  encrypt,
  encryptFields,
  isEncryptionEnabled,
} from './encryptionService.mjs';

const ENCRYPTED_MODEL_FIELDS = {
  ClientPainEntry: {
    context: 'health:pain_entry',
    fields: ['description', 'notes', 'severity_notes'],
  },
  ClientBaselineMeasurements: {
    context: 'health:baseline',
    fields: ['notes', 'injuries', 'medical_notes'],
  },
  DailyMacroLog: {
    context: 'health:nutrition',
    fields: ['description'],
  },
  ClientNote: {
    context: 'health:client_note',
    fields: ['content', 'note_text'],
  },
  ClientProgress: {
    context: 'health:progress',
    fields: ['notes', 'trainer_notes'],
  },
  ClientNutritionPlan: {
    context: 'health:nutrition_plan',
    // S0.3 (2026-08-04): this entry previously named plan_details/restrictions —
    // columns that do not exist — so only `notes` was ever encrypted and the
    // PHI-adjacent allergy/restriction lists sat in plaintext JSONB, silently.
    // JSONB arrays must NOT go through encryptFields (String([...]) flattens
    // the array to "a,b" and destroys it); they are encrypted element-wise via
    // stringArrayFields below, preserving the array shape. Legacy plaintext
    // rows keep reading fine: decrypt() passes through non-prefixed values.
    fields: ['notes'],
    stringArrayFields: ['dietaryRestrictions', 'allergies'],
  },
};

const mapStringArray = (value, transform, context) => {
  if (!Array.isArray(value)) return value;
  return value.map((item) =>
    typeof item === 'string' && item ? transform(item, context) : item
  );
};

const mapNutritionItems = (items, transform) => {
  if (!Array.isArray(items)) return items;
  return items.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
    const next = { ...item };
    for (const field of ['name', 'description']) {
      if (typeof next[field] === 'string' && next[field]) {
        next[field] = transform(next[field], `health:nutrition:items:${field}`);
      }
    }
    return next;
  });
};

export const encryptNutritionItems = (items) => mapNutritionItems(items, encrypt);
export const decryptNutritionItems = (items) => mapNutritionItems(items, decrypt);

const transformNutritionItems = (instance, transform) => {
  if (!instance || typeof instance.getDataValue !== 'function') return;
  const items = instance.getDataValue('items');
  if (items !== undefined) instance.setDataValue('items', transform(items));
};

const transformStringArrayFields = (instance, fields, context, transform, onlyChanged = false) => {
  for (const field of fields) {
    if (onlyChanged && !instance.changed(field)) continue;
    const value = instance.getDataValue(field);
    if (value === undefined || value === null) continue;
    instance.setDataValue(field, mapStringArray(value, transform, `${context}:${field}`));
  }
};

const decryptInstance = (instance, validFields, validArrayFields, config, isNutrition) => {
  if (!instance || typeof instance.getDataValue !== 'function') return;
  decryptFields(instance, validFields, config.context);
  transformStringArrayFields(instance, validArrayFields, config.context, decrypt);
  if (isNutrition) transformNutritionItems(instance, decryptNutritionItems);
};

export function registerEncryptionHooks(Model, modelName) {
  const config = ENCRYPTED_MODEL_FIELDS[modelName];
  if (!config) return;

  const attrs = Model.rawAttributes || Model.tableAttributes || {};
  const validFields = config.fields.filter((field) => Boolean(attrs[field]));
  const validArrayFields = (config.stringArrayFields || []).filter((field) => Boolean(attrs[field]));
  const isNutrition = modelName === 'DailyMacroLog' && Boolean(attrs.items);
  if (validFields.length === 0 && validArrayFields.length === 0 && !isNutrition) return;

  Model.addHook('beforeCreate', `encrypt_${modelName}`, (instance) => {
    if (!isEncryptionEnabled()) return;
    encryptFields(instance, validFields, config.context);
    transformStringArrayFields(instance, validArrayFields, config.context, encrypt);
    if (isNutrition) transformNutritionItems(instance, encryptNutritionItems);
  });

  Model.addHook('beforeUpdate', `encrypt_${modelName}`, (instance) => {
    if (!isEncryptionEnabled()) return;
    const changedFields = validFields.filter((field) => instance.changed(field));
    if (changedFields.length > 0) encryptFields(instance, changedFields, config.context);
    transformStringArrayFields(instance, validArrayFields, config.context, encrypt, true);
    if (isNutrition && instance.changed('items')) {
      transformNutritionItems(instance, encryptNutritionItems);
    }
  });

  Model.addHook('afterFind', `decrypt_${modelName}`, (results) => {
    if (!isEncryptionEnabled() || !results) return;
    const instances = Array.isArray(results) ? results : [results];
    instances.forEach((instance) => decryptInstance(instance, validFields, validArrayFields, config, isNutrition));
  });

  for (const event of ['afterCreate', 'afterUpdate']) {
    Model.addHook(event, `decrypt_${modelName}_${event}`, (instance) => {
      if (isEncryptionEnabled()) decryptInstance(instance, validFields, validArrayFields, config, isNutrition);
    });
  }
}

export function registerAllHealthEncryptionHooks(models) {
  if (!isEncryptionEnabled()) {
    console.log('[HealthEncryption] Encryption disabled - hooks not registered');
    return;
  }

  let registered = 0;
  for (const modelName of Object.keys(ENCRYPTED_MODEL_FIELDS)) {
    const Model = models[modelName];
    if (Model) {
      registerEncryptionHooks(Model, modelName);
      registered += 1;
    }
  }
  console.log(`[HealthEncryption] Registered encryption hooks on ${registered} models`);
}

export default {
  registerEncryptionHooks,
  registerAllHealthEncryptionHooks,
  encryptNutritionItems,
  decryptNutritionItems,
  ENCRYPTED_MODEL_FIELDS,
};
