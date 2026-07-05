/**
 * MODEL: MarketingCampaign
 * ========================
 * The central campaign spine for the admin Marketing command center (GPT Pro plan,
 * Slice 2). Every downstream marketing asset — calendar items, social jobs, emails,
 * leads, attribution — is meant to hang off a campaign. Before this model, "campaign"
 * existed only as a free-text `campaignName` string on MarketingCalendarItem; this is
 * the normalized business object that turns loose marketing panels into an operating
 * system ("What campaign are we running? What belongs to it? What did it drive?").
 *
 * Conventions (verified against the sibling MarketingCalendarItem, Rule 18/58):
 *  - camelCase columns (NOT `underscored`) — same as marketing_calendar_items.
 *  - Enums are STRING + isIn validation (NOT Postgres ENUM) to keep migrations painless.
 *  - Soft-delete (paranoid) so archiving/removing a campaign never orphans its history.
 *
 * NOTE (Slice 2 scope): this ships the campaign object + CRUD only. The campaignId FK on
 * marketing_calendar_items and the Sequelize associations are DEFERRED to Slice 3 (the
 * linking slice) so this migration stays a pure additive CREATE TABLE.
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

export const OBJECTIVES = [
  'lead_generation',
  'booking_assessments',
  'newsletter_growth',
  'local_seo',
  'product_sale',
  'retention',
];
export const STATUSES = ['draft', 'active', 'paused', 'completed', 'archived'];

class MarketingCampaign extends Model {}

MarketingCampaign.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(180), allowNull: false },
  objective: {
    type: DataTypes.STRING(40),
    allowNull: false,
    defaultValue: 'lead_generation',
    validate: { isIn: [OBJECTIVES] },
  },
  offer: { type: DataTypes.TEXT, allowNull: true },
  audience: { type: DataTypes.TEXT, allowNull: true },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'draft',
    validate: { isIn: [STATUSES] },
  },
  startAt: { type: DataTypes.DATE, allowNull: true },
  endAt: { type: DataTypes.DATE, allowNull: true },
  budget: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  primaryChannel: { type: DataTypes.STRING(32), allowNull: true },
  utmCampaign: { type: DataTypes.STRING(120), allowNull: true },
  createdBy: { type: DataTypes.INTEGER, allowNull: true },
  updatedBy: { type: DataTypes.INTEGER, allowNull: true },
}, {
  sequelize,
  modelName: 'MarketingCampaign',
  tableName: 'marketing_campaigns',
  timestamps: true,
  paranoid: true,
});

export default MarketingCampaign;
