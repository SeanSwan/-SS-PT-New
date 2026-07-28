/**
 * Location Model — Gym Operations Spine (S0)
 * ==========================================
 *
 * Purpose:
 * First-class physical facility. Everything gym-operational scopes to a location: classes,
 * memberships, check-ins, door access, and reporting.
 *
 * Blueprint Reference:
 * docs/ai-workflow/AI-HANDOFF/GYM-OPS-SPINE-BUILD-BLUEPRINT-V2-2026-07-28.md §S0
 * Linear: SWA-74
 *
 * Database ERD (relationships introduced by this slice):
 * +-----------------+     +--------------------+
 * | locations       | 1:N | sessions           |
 * | id (PK)         |-----| locationId FK NULL |
 * | name / slug     |     | location (STRING)  |  <- legacy free text, intentionally retained
 * | timezone        |     +--------------------+
 * | opensAt/closesAt|
 * +-----------------+
 *
 * WHY a table instead of the existing free-text `sessions.location`?
 * A string cannot be joined, filtered, scoped, or reported on, and makes multi-site impossible.
 * The string column is deliberately left in place so this slice is additive and reversible; a
 * later slice backfills it.
 *
 * WHY `timezone` per location?
 * Class start times are stored as local wall-clock plus this zone and converted per occurrence
 * (see utils/zonedTime.mjs). Storing UTC-only would silently shift every recurring class by an
 * hour at each daylight-saving transition.
 *
 * WHY paranoid (soft delete)?
 * Historical sessions, and later bookings and check-ins, reference a location. Hard-deleting a
 * site would orphan or rewrite operational history.
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class Location extends Model {
  /** URL/DB-safe slug from a display name. Exposed so callers and seeders derive it identically. */
  static slugify(name) {
    return String(name || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 150);
  }
}

Location.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    slug: {
      type: DataTypes.STRING(150),
      allowNull: false,
      comment: 'Unique among non-deleted rows; a soft-deleted site does not reserve its slug'
    },
    addressLine1: { type: DataTypes.STRING(255), allowNull: true },
    addressLine2: { type: DataTypes.STRING(255), allowNull: true },
    city: { type: DataTypes.STRING(100), allowNull: true },
    region: { type: DataTypes.STRING(100), allowNull: true },
    postalCode: { type: DataTypes.STRING(20), allowNull: true },
    country: {
      type: DataTypes.STRING(2),
      allowNull: false,
      defaultValue: 'US'
    },
    phone: { type: DataTypes.STRING(50), allowNull: true },
    timezone: {
      type: DataTypes.STRING(64),
      allowNull: false,
      defaultValue: 'America/Los_Angeles',
      comment: 'IANA zone. Class start times are local wall-clock + this zone.'
    },
    opensAt: {
      type: DataTypes.STRING(5),
      allowNull: true,
      comment: "Wall-clock 'HH:mm' in this location's timezone. NULL = no hours restriction."
    },
    closesAt: {
      type: DataTypes.STRING(5),
      allowNull: true,
      comment: "Wall-clock 'HH:mm' in this location's timezone. NULL = no hours restriction."
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    metadata: { type: DataTypes.JSONB, allowNull: true }
  },
  {
    sequelize,
    modelName: 'Location',
    tableName: 'locations',
    timestamps: true,
    paranoid: true
  }
);

export default Location;
