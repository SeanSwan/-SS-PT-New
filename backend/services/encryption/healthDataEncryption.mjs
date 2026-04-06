/**
 * ============================================================
 * BLUEPRINT: Health Data Encryption Hooks
 * ============================================================
 * Purpose:  Sequelize lifecycle hooks to automatically encrypt
 *           sensitive health data fields on write and decrypt
 *           on read. Transparent to the rest of the application.
 * Scope:    Pain entries, body measurements, nutrition logs,
 *           client notes, progress data.
 * Owner:    Phase 11 — E2EE Encryption
 * ============================================================
 */

import { encryptFields, decryptFields, isEncryptionEnabled } from './encryptionService.mjs';

// ---------------------------------------------------------------------------
// Field Definitions — Which fields get encrypted per model
// ---------------------------------------------------------------------------

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
    fields: ['notes', 'meal_description'],
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
    fields: ['plan_details', 'notes', 'restrictions'],
  },
};

// ---------------------------------------------------------------------------
// Hook Registration
// ---------------------------------------------------------------------------

/**
 * Register encryption hooks on a Sequelize model.
 * Silently skips if encryption is not enabled (no master key).
 *
 * @param {object} Model — Sequelize model class
 * @param {string} modelName — Name key from ENCRYPTED_MODEL_FIELDS
 */
export function registerEncryptionHooks(Model, modelName) {
  const config = ENCRYPTED_MODEL_FIELDS[modelName];
  if (!config) return; // Model not configured for encryption

  // Filter to only fields that actually exist on the model
  const validFields = config.fields.filter(f => {
    const attrs = Model.rawAttributes || Model.tableAttributes || {};
    return !!attrs[f];
  });

  if (validFields.length === 0) return;

  // Encrypt before save
  Model.addHook('beforeCreate', `encrypt_${modelName}`, (instance) => {
    if (!isEncryptionEnabled()) return;
    encryptFields(instance, validFields, config.context);
  });

  Model.addHook('beforeUpdate', `encrypt_${modelName}`, (instance) => {
    if (!isEncryptionEnabled()) return;
    // Only encrypt changed fields to avoid re-encrypting
    const changedFields = validFields.filter(f => instance.changed(f));
    if (changedFields.length > 0) {
      encryptFields(instance, changedFields, config.context);
    }
  });

  // Decrypt after read
  Model.addHook('afterFind', `decrypt_${modelName}`, (results) => {
    if (!isEncryptionEnabled()) return;
    if (!results) return;

    const instances = Array.isArray(results) ? results : [results];
    for (const instance of instances) {
      if (instance && typeof instance.getDataValue === 'function') {
        decryptFields(instance, validFields, config.context);
      }
    }
  });
}

/**
 * Register encryption hooks on all configured health data models.
 * Call this after model associations are set up.
 *
 * @param {object} models — Object of Sequelize model classes
 */
export function registerAllHealthEncryptionHooks(models) {
  if (!isEncryptionEnabled()) {
    console.log('[HealthEncryption] Encryption disabled — hooks not registered');
    return;
  }

  let registered = 0;
  for (const modelName of Object.keys(ENCRYPTED_MODEL_FIELDS)) {
    const Model = models[modelName];
    if (Model) {
      registerEncryptionHooks(Model, modelName);
      registered++;
    }
  }

  console.log(`[HealthEncryption] Registered encryption hooks on ${registered} models`);
}

export default {
  registerEncryptionHooks,
  registerAllHealthEncryptionHooks,
  ENCRYPTED_MODEL_FIELDS,
};
