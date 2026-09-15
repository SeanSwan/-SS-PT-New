/**
 * ============================================================================
 * BLUEPRINT: TrainerCredentialUpload
 * ============================================================================
 * PURPOSE: Durable ownership and lifecycle receipt for each encrypted trainer
 *          credential object before it is attached to an application.
 * INVARIANTS:
 *   - storageKey is globally unique and remains owner/kind bound.
 *   - uploading/pending rows expire and are physically deleted by the worker.
 *   - attached rows point to the exact application that consumed the object.
 *   - user/application deletion is restricted until explicit data cleanup runs.
 * ============================================================================
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class TrainerCredentialUpload extends Model {}

TrainerCredentialUpload.init({
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  },
  kind: {
    type: DataTypes.ENUM('insurance', 'certification'),
    allowNull: false,
  },
  storageKey: {
    type: DataTypes.STRING(500),
    allowNull: false,
    unique: true,
  },
  byteSize: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 10 * 1024 * 1024 },
  },
  status: {
    type: DataTypes.ENUM('uploading', 'pending', 'deleting', 'attached'),
    allowNull: false,
    defaultValue: 'uploading',
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  cleanupClaimedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  attachedApplicationId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'trainer_applications', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  },
}, {
  sequelize,
  modelName: 'TrainerCredentialUpload',
  tableName: 'trainer_credential_uploads',
  timestamps: true,
  indexes: [
    { fields: ['userId', 'status'], name: 'trainer_credential_uploads_owner_status' },
    { fields: ['status', 'expiresAt'], name: 'trainer_credential_uploads_expiry' },
    { fields: ['attachedApplicationId'], name: 'trainer_credential_uploads_application' },
  ],
});

TrainerCredentialUpload.associate = (models) => {
  TrainerCredentialUpload.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'owner',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });
  TrainerCredentialUpload.belongsTo(models.TrainerApplication, {
    foreignKey: 'attachedApplicationId',
    as: 'application',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });
};

export default TrainerCredentialUpload;
