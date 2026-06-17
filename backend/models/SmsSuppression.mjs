import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

/**
 * SmsSuppression
 * ==============
 * Phone-keyed SMS opt-out list populated by inbound Twilio STOP webhooks.
 */
class SmsSuppression extends Model {}

SmsSuppression.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    phone: { type: DataTypes.STRING(32), allowNull: false, unique: true },
    source: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'twilio_inbound' },
    reason: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'stop_keyword' },
    messageSid: { type: DataTypes.STRING(80), allowNull: true, field: 'message_sid' },
    optedOutAt: { type: DataTypes.DATE, allowNull: false, field: 'opted_out_at' },
    metadata: { type: DataTypes.JSONB, allowNull: true, defaultValue: {} },
  },
  {
    sequelize,
    modelName: 'SmsSuppression',
    tableName: 'sms_suppressions',
    timestamps: true,
    underscored: true,
    indexes: [
      { unique: true, fields: ['phone'] },
      { fields: ['source'] },
      { fields: ['opted_out_at'] },
    ],
  }
);

export default SmsSuppression;
