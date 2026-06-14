import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

/**
 * Subscriber — the marketing email list (Tier 1.1).
 * Distinct from Lead (sales CRM) and Contact (inquiry log): this is the
 * consented newsletter audience, with double-opt-in + one-click unsubscribe
 * tokens and a consent record (CAN-SPAM / CASL / PIPEDA).
 */
class Subscriber extends Model {}

Subscriber.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    firstName: { type: DataTypes.STRING(100), allowNull: true, field: 'first_name' },
    lastName: { type: DataTypes.STRING(100), allowNull: true, field: 'last_name' },

    // Lifecycle: pending (awaiting confirm) -> confirmed (on list) -> unsubscribed
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'unsubscribed'),
      allowNull: false,
      defaultValue: 'pending',
    },
    source: { type: DataTypes.STRING(100), allowNull: false, defaultValue: 'website' },

    // Consent record (legal proof of opt-in)
    consentAt: { type: DataTypes.DATE, allowNull: true, field: 'consent_at' },
    consentSource: { type: DataTypes.STRING(255), allowNull: true, field: 'consent_source' },
    consentIp: { type: DataTypes.STRING(64), allowNull: true, field: 'consent_ip' },

    // Double-opt-in + one-click unsubscribe tokens
    confirmToken: { type: DataTypes.STRING(128), allowNull: true, field: 'confirm_token' },
    unsubscribeToken: { type: DataTypes.STRING(128), allowNull: true, field: 'unsubscribe_token' },

    confirmedAt: { type: DataTypes.DATE, allowNull: true, field: 'confirmed_at' },
    unsubscribedAt: { type: DataTypes.DATE, allowNull: true, field: 'unsubscribed_at' },

    tags: { type: DataTypes.JSONB, allowNull: true, defaultValue: [] },
  },
  {
    sequelize,
    modelName: 'Subscriber',
    tableName: 'subscribers',
    timestamps: true,
    underscored: true,
    indexes: [
      { unique: true, fields: ['email'] },
      { fields: ['status'] },
      { fields: ['confirm_token'] },
      { fields: ['unsubscribe_token'] },
    ],
  }
);

export default Subscriber;
