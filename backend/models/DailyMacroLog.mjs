/**
 * DailyMacroLog Model
 * ===================
 * Stores daily food/macro intake entries for clients.
 * Supports both manual entry and AI-assisted natural language food logging.
 *
 * Pipeline: User describes food -> CalorieNinjas NLP parse -> USDA validation -> Store entry
 * Integration: Links to User, AI Chat (macro_logging context), nutrition dashboard
 *
 * NOTE: Uses STRING instead of ENUM for source/mealType
 * to avoid PostgreSQL ENUM type issues with sequelize.sync({ alter: true }).
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class DailyMacroLog extends Model {}

DailyMacroLog.init({
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
    comment: 'The client logging their food intake',
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'The date this entry applies to',
  },
  mealType: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'snack',
    validate: {
      isIn: [['breakfast', 'lunch', 'dinner', 'snack', 'pre_workout', 'post_workout']],
    },
    comment: 'Which meal this entry represents',
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Natural language food description (e.g., "2 scrambled eggs and toast with butter")',
  },
  calories: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Total calories for this entry',
  },
  protein: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Protein in grams',
  },
  carbs: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Carbohydrates in grams',
  },
  fat: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Fat in grams',
  },
  fiber: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Fiber in grams',
  },
  sugar: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Sugar in grams',
  },
  sodium: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Sodium in milligrams',
  },
  items: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    comment: 'Parsed food items array: [{name, qty, unit, calories, protein, carbs, fat, source}]',
  },
  source: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: 'manual',
    validate: {
      isIn: [['manual', 'ai_chat', 'voice', 'barcode', 'usda_lookup']],
    },
    comment: 'How this entry was created',
  },
  aiConversationId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'ai_conversations', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
    comment: 'Link to AI conversation that generated this entry (if ai_chat source)',
  },
  verified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether user confirmed the AI-parsed macros are correct',
  },
}, {
  sequelize,
  modelName: 'DailyMacroLog',
  tableName: 'daily_macro_logs',
  timestamps: true,
  indexes: [
    { fields: ['userId', 'date'] },
    { fields: ['userId', 'date', 'mealType'] },
    { fields: ['date'] },
  ],
});

export default DailyMacroLog;
