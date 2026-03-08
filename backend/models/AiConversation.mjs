/**
 * AiConversation Model
 * ====================
 * Stores AI chat conversations for clients and trainers.
 * Each record represents one conversation thread with message history.
 *
 * Pipeline: User sends message -> AI Chat Controller -> Provider Router -> Store response
 * Integration: Links to User, role-based system prompts, multi-provider failover
 *
 * NOTE: Uses STRING instead of ENUM for status/role
 * to avoid PostgreSQL ENUM type issues with sequelize.sync({ alter: true }).
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class AiConversation extends Model {}

AiConversation.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
    comment: 'The user who owns this conversation',
  },
  role: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      isIn: [['client', 'trainer', 'admin']],
    },
    comment: 'Role of the user at conversation creation time (determines AI permissions)',
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'Auto-generated or user-set conversation title',
  },
  context: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'general',
    validate: {
      isIn: [['general', 'macro_logging', 'form_tips', 'workout_suggestions', 'workout_generation', 'client_review']],
    },
    comment: 'Conversation context determines AI system prompt and permissions',
  },
  messages: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    comment: 'Array of {role, content, timestamp, metadata} message objects',
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'active',
    validate: {
      isIn: [['active', 'archived', 'deleted']],
    },
    comment: 'Conversation lifecycle status',
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Extensible metadata: provider used, token counts, linked entities',
  },
  messageCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Denormalized message count for listing queries',
  },
  lastMessageAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp of the last message for sorting',
  },
}, {
  sequelize,
  modelName: 'AiConversation',
  tableName: 'ai_conversations',
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['userId', 'status'] },
    { fields: ['lastMessageAt'] },
  ],
});

export default AiConversation;
