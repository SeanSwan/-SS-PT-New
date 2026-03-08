import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class LeadActivity extends Model {}

LeadActivity.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    leadId: { type: DataTypes.INTEGER, allowNull: false, field: 'lead_id' },

    type: {
      type: DataTypes.ENUM(
        'status_change', 'note_added', 'email_sent', 'email_opened',
        'call_made', 'sms_sent', 'meeting_scheduled', 'ai_draft',
        'follow_up_set', 'score_changed', 'assigned'
      ),
      allowNull: false,
    },

    // Who performed the action
    performedByUserId: { type: DataTypes.INTEGER, allowNull: true, field: 'performed_by_user_id' },
    performedByAI: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'performed_by_ai' },

    // Activity details
    title: { type: DataTypes.STRING(255), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    metadata: { type: DataTypes.JSONB, allowNull: true, defaultValue: {} },
    // metadata examples:
    // status_change: { from: 'new', to: 'contacted' }
    // email_sent: { subject: '...', templateId: '...' }
    // score_changed: { from: 10, to: 45, reason: 'Opened follow-up email' }
  },
  {
    sequelize,
    modelName: 'LeadActivity',
    tableName: 'lead_activities',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['lead_id'] },
      { fields: ['type'] },
      { fields: ['created_at'] },
    ],
  }
);

export default LeadActivity;
