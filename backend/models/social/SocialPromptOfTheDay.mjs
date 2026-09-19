import { DataTypes } from 'sequelize';
import db from '../../database.mjs';

/**
 * SocialPromptOfTheDay — the admin-editable composer prompt.
 *
 * Blueprint: docs/ai-workflow/AI-HANDOFF/social-feed-upgrade-2026-09-16/MEGA-BLUEPRINT.md §6 S4
 *
 * A prompt is a gentle nudge that pre-fills the composer. It is NOT a notification, NOT a
 * streak pressure device, and NOT tracked per member — the whole point is that the composer
 * gets easier to start, not that the member owes the app something.
 *
 * `activeOn` is a DATE (day granularity). The read path picks the newest prompt whose
 * activeOn is <= today, falling back to any active prompt, so the surface never goes empty
 * just because nobody scheduled today.
 */
const SocialPromptOfTheDay = db.define('SocialPromptOfTheDay', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  promptText: {
    type: DataTypes.STRING(140),
    allowNull: false
  },
  // Optional chip label; falls back to the prompt text when absent.
  chipLabel: {
    type: DataTypes.STRING(32),
    allowNull: true
  },
  activeOn: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'Users', key: 'id' }
  }
}, {
  tableName: 'SocialPromptsOfTheDay',
  timestamps: true,
  indexes: [
    // The read path: active prompts, newest scheduled day first.
    { fields: ['isActive', 'activeOn'] }
  ]
});

export default SocialPromptOfTheDay;
