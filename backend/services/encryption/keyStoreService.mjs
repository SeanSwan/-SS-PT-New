/**
 * ============================================================
 * BLUEPRINT: KeyStoreService — E2EE Public Key Bundle Storage
 * ============================================================
 * Purpose:  Server-side storage for E2EE public key bundles.
 *           Clients upload their public prekeys; other clients
 *           fetch them to establish encrypted sessions.
 * Scope:    Signal Protocol key exchange — identity keys,
 *           signed prekeys, one-time prekeys.
 * Owner:    Phase 11 — E2EE Encryption
 * Note:     Server NEVER stores private keys. All private keys
 *           live in client-side IndexedDB only.
 * ============================================================
 */

import { Sequelize, DataTypes } from 'sequelize';

// ---------------------------------------------------------------------------
// Model References (lazy-loaded to avoid circular deps)
// ---------------------------------------------------------------------------

let E2EEKeyBundle = null;
let E2EEOneTimePreKey = null;

/**
 * Initialize E2EE models on the given sequelize instance.
 * Called once at app startup.
 */
export function initE2EEModels(sequelize) {
  // ------------------------------------
  // E2EE Key Bundle (per user per device)
  // ------------------------------------
  E2EEKeyBundle = sequelize.define('E2EEKeyBundle', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
    },
    deviceId: {
      type: DataTypes.STRING(64),
      allowNull: false,
      field: 'device_id',
      comment: 'Client-generated device identifier',
    },
    // Identity key — long-lived public key for this device
    identityPublicKey: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'identity_public_key',
      comment: 'Base64-encoded identity public key (Curve25519)',
    },
    // Signed prekey — medium-lived, signed by identity key
    signedPreKeyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'signed_prekey_id',
    },
    signedPreKeyPublic: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'signed_prekey_public',
      comment: 'Base64-encoded signed prekey public',
    },
    signedPreKeySignature: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'signed_prekey_signature',
      comment: 'Base64-encoded signature of signed prekey by identity key',
    },
    // Registration ID — random uint32 for session identification
    registrationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'registration_id',
    },
    // E2EE enabled flag — user can opt in/out
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active',
    },
  }, {
    tableName: 'e2ee_key_bundles',
    timestamps: true,
    underscored: true,
    indexes: [
      { unique: true, fields: ['user_id', 'device_id'] },
      { fields: ['user_id', 'is_active'] },
    ],
  });

  // ------------------------------------
  // One-Time PreKeys (consumed on first message)
  // ------------------------------------
  E2EEOneTimePreKey = sequelize.define('E2EEOneTimePreKey', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    bundleId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'bundle_id',
      references: { model: 'e2ee_key_bundles', key: 'id' },
    },
    preKeyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'prekey_id',
    },
    publicKey: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'public_key',
      comment: 'Base64-encoded one-time prekey public',
    },
    isUsed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_used',
    },
  }, {
    tableName: 'e2ee_one_time_prekeys',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['bundle_id', 'is_used'] },
    ],
  });

  // Associations
  E2EEKeyBundle.hasMany(E2EEOneTimePreKey, {
    foreignKey: 'bundle_id',
    as: 'oneTimePreKeys',
    onDelete: 'CASCADE',
  });
  E2EEOneTimePreKey.belongsTo(E2EEKeyBundle, {
    foreignKey: 'bundle_id',
    as: 'bundle',
  });

  return { E2EEKeyBundle, E2EEOneTimePreKey };
}

// ---------------------------------------------------------------------------
// Key Bundle Operations
// ---------------------------------------------------------------------------

/**
 * Upload or update a user's key bundle for a specific device.
 * Also uploads a batch of one-time prekeys.
 */
export async function uploadKeyBundle(userId, {
  deviceId,
  identityPublicKey,
  signedPreKeyId,
  signedPreKeyPublic,
  signedPreKeySignature,
  registrationId,
  oneTimePreKeys = [],
}) {
  if (!E2EEKeyBundle) throw new Error('E2EE models not initialized');

  // Upsert the key bundle
  const [bundle] = await E2EEKeyBundle.upsert({
    userId,
    deviceId,
    identityPublicKey,
    signedPreKeyId,
    signedPreKeyPublic,
    signedPreKeySignature,
    registrationId,
    isActive: true,
  }, {
    conflictFields: ['user_id', 'device_id'],
    returning: true,
  });

  // Upload one-time prekeys if provided
  if (oneTimePreKeys.length > 0) {
    const preKeyRecords = oneTimePreKeys.map(pk => ({
      bundleId: bundle.id,
      preKeyId: pk.preKeyId,
      publicKey: pk.publicKey,
      isUsed: false,
    }));
    await E2EEOneTimePreKey.bulkCreate(preKeyRecords, {
      ignoreDuplicates: true,
    });
  }

  return bundle;
}

/**
 * Fetch a user's key bundle for session establishment.
 * Consumes one one-time prekey (deleted after fetch).
 */
export async function fetchKeyBundle(targetUserId) {
  if (!E2EEKeyBundle) throw new Error('E2EE models not initialized');

  const bundle = await E2EEKeyBundle.findOne({
    where: { userId: targetUserId, isActive: true },
    order: [['createdAt', 'DESC']], // Latest device
  });

  if (!bundle) return null;

  // Fetch and consume one one-time prekey (atomic)
  const oneTimePreKey = await E2EEOneTimePreKey.findOne({
    where: { bundleId: bundle.id, isUsed: false },
    order: [['prekey_id', 'ASC']],
  });

  if (oneTimePreKey) {
    await oneTimePreKey.update({ isUsed: true });
  }

  return {
    identityPublicKey: bundle.identityPublicKey,
    signedPreKeyId: bundle.signedPreKeyId,
    signedPreKeyPublic: bundle.signedPreKeyPublic,
    signedPreKeySignature: bundle.signedPreKeySignature,
    registrationId: bundle.registrationId,
    deviceId: bundle.deviceId,
    oneTimePreKey: oneTimePreKey ? {
      preKeyId: oneTimePreKey.preKeyId,
      publicKey: oneTimePreKey.publicKey,
    } : null,
  };
}

/**
 * Get count of remaining one-time prekeys for a user.
 * Client should replenish when count drops below threshold.
 */
export async function getPreKeyCount(userId) {
  if (!E2EEKeyBundle) throw new Error('E2EE models not initialized');

  const bundle = await E2EEKeyBundle.findOne({
    where: { userId, isActive: true },
    order: [['createdAt', 'DESC']],
  });

  if (!bundle) return 0;

  return E2EEOneTimePreKey.count({
    where: { bundleId: bundle.id, isUsed: false },
  });
}

/**
 * Deactivate E2EE for a user (opt out).
 * Keys are soft-deactivated, not deleted, to allow re-enablement.
 */
export async function deactivateE2EE(userId) {
  if (!E2EEKeyBundle) throw new Error('E2EE models not initialized');

  await E2EEKeyBundle.update(
    { isActive: false },
    { where: { userId } }
  );
}

/**
 * Check if a user has E2EE enabled.
 */
export async function isE2EEEnabled(userId) {
  if (!E2EEKeyBundle) throw new Error('E2EE models not initialized');

  const bundle = await E2EEKeyBundle.findOne({
    where: { userId, isActive: true },
  });

  return !!bundle;
}

/**
 * Generate a safety number for identity verification.
 * Combines both users' identity keys into a displayable fingerprint.
 */
export async function generateSafetyNumber(userId1, userId2) {
  if (!E2EEKeyBundle) throw new Error('E2EE models not initialized');

  const [bundle1, bundle2] = await Promise.all([
    E2EEKeyBundle.findOne({ where: { userId: userId1, isActive: true } }),
    E2EEKeyBundle.findOne({ where: { userId: userId2, isActive: true } }),
  ]);

  if (!bundle1 || !bundle2) return null;

  // Sort by userId to ensure both parties generate the same number
  const sorted = [userId1, userId2].sort((a, b) => a - b);
  const key1 = sorted[0] === userId1 ? bundle1.identityPublicKey : bundle2.identityPublicKey;
  const key2 = sorted[0] === userId1 ? bundle2.identityPublicKey : bundle1.identityPublicKey;

  const { createHash } = await import('crypto');
  const hash = createHash('sha256')
    .update(`${sorted[0]}:${key1}:${sorted[1]}:${key2}`)
    .digest();

  // Format as 12 groups of 5 digits (60 digits total, like Signal)
  const digits = [];
  for (let i = 0; i < 30; i++) {
    const val = (hash[i % hash.length] * 256 + hash[(i + 1) % hash.length]) % 100000;
    digits.push(val.toString().padStart(5, '0'));
  }

  return digits.join(' ');
}

/**
 * Sync E2EE models to database (create tables if missing).
 */
export async function syncE2EETables(sequelize) {
  if (!E2EEKeyBundle || !E2EEOneTimePreKey) {
    initE2EEModels(sequelize);
  }
  await E2EEKeyBundle.sync({ alter: false });
  await E2EEOneTimePreKey.sync({ alter: false });
}

export default {
  initE2EEModels,
  uploadKeyBundle,
  fetchKeyBundle,
  getPreKeyCount,
  deactivateE2EE,
  isE2EEEnabled,
  generateSafetyNumber,
  syncE2EETables,
};
