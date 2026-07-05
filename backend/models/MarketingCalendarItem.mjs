/**
 * MODEL: MarketingCalendarItem
 * ============================
 * Persisted campaign/calendar item for the admin Marketing command center.
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

const STATUSES = ['draft', 'scheduled', 'published', 'failed', 'cancelled'];
const CHANNELS = ['social', 'blog', 'email', 'video', 'local'];

class MarketingCalendarItem extends Model {}

MarketingCalendarItem.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING(180), allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: true },
  channel: {
    type: DataTypes.STRING(32),
    allowNull: false,
    defaultValue: 'social',
    validate: { isIn: [CHANNELS] },
  },
  platform: {
    type: DataTypes.STRING(32),
    allowNull: true,
  },
  campaignName: { type: DataTypes.STRING(120), allowNull: true },
  campaignId: { type: DataTypes.UUID, allowNull: true }, // FK → marketing_campaigns (Slice 3b); kept alongside legacy campaignName during transition
  status: {
    type: DataTypes.STRING(32),
    allowNull: false,
    defaultValue: 'draft',
    validate: { isIn: [STATUSES] },
  },
  scheduledAt: { type: DataTypes.DATE, allowNull: false },
  durationMinutes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 30,
  },
  timezone: {
    type: DataTypes.STRING(64),
    allowNull: false,
    defaultValue: 'America/Los_Angeles',
  },
  postizPostId: { type: DataTypes.STRING(128), allowNull: true },
  platformAccountIds: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
  },
  platformVariants: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
  assets: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
  },
  complianceSnapshot: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
  advisoryContext: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
  createdBy: { type: DataTypes.INTEGER, allowNull: true },
  updatedBy: { type: DataTypes.INTEGER, allowNull: true },
  publishedAt: { type: DataTypes.DATE, allowNull: true },
  failedAt: { type: DataTypes.DATE, allowNull: true },
  failureReason: { type: DataTypes.TEXT, allowNull: true },
}, {
  sequelize,
  modelName: 'MarketingCalendarItem',
  tableName: 'marketing_calendar_items',
  timestamps: true,
  paranoid: true,
});

export { CHANNELS, STATUSES };
export default MarketingCalendarItem;
