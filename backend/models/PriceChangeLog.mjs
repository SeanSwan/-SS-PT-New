/**
 * PriceChangeLog — append-only history of every price-relevant decision at the cart choke point.
 * ============================================================================
 * One row per price resolution / mutation the trainer-economics governance layer observes or
 * performs. In S1 (shadow mode) the resolver runs at `cartRoutes.mjs` and writes a row with
 * `wouldHaveClamped` set — enforcing nothing. S2 flips enforcement and writes rows with
 * `source='floor_clamp'` when a cart is actually clamped to the floor. Every price mutation
 * across every later slice (special, request, manual) appends here through auditWriter.mjs.
 *
 * APPEND-ONLY (mirrors AiCommandAuditLog.mjs): update/destroy — single and bulk — throw at the
 * model layer. No updatedAt column. History accrues; nothing rewrites it. This is the pricing
 * audit trail a future reviewer (or a lawyer) reads to reconstruct why a cart resolved as it did.
 *
 * PRIVACY (rule 8): stores IDs, roles, dollar amounts, and a small JSON context — never client
 * names or free-text PII. Safe to surface to the admin economics console; never sent to an LLM
 * except as de-identified counts/amounts.
 *
 * Kimi K3 blueprint §7 ERD. FK columns reference "Users"/"storefront_items" (project gotcha:
 * PascalCase "Users" table).
 *
 * @module models/PriceChangeLog
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

const APPEND_ONLY_MESSAGE = 'PriceChangeLog is append-only: rows cannot be updated or deleted.';

/** The provenance of a logged price decision. Kept as a validated enum so callers can't invent
 * ad-hoc source strings that would fragment the audit trail. */
export const PRICE_CHANGE_SOURCES = Object.freeze([
  'manual', // a direct price edit on a package (admin or eligible trainer)
  'special', // price came from an active TrainerSpecial/AdminSpecial (S4)
  'floor_clamp', // resolver clamped the price UP to the platform floor (S2 enforcement)
  'special_floor_clamp', // a below-floor special was clamped to the floor (S4)
  'request', // price applied via an approved PricingChangeRequest (S3)
  'shadow', // S1 observation only — resolver ran, nothing was enforced
]);

class PriceChangeLog extends Model {}

PriceChangeLog.init(
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    // The storefront package this price decision concerns. FK → storefront_items.
    storeFrontItemId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'storefront_items', key: 'id' },
      comment: 'FK to storefront_items — the package whose price was resolved/changed',
    },
    // The actor who triggered the decision. Null for a system-run shadow observation (no human actor).
    changedByUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Users', key: 'id' },
      comment: 'FK to "Users" — actor, or null for a system shadow observation',
    },
    changedByRole: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Actor role at the time (admin/trainer/system)',
    },
    // Prices are USD, two-decimal. oldPrice may be null on first observation of a package.
    oldPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Per-session price before this decision (null if unknown/first observation)',
    },
    newPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Per-session price the resolver produced / the mutation set',
    },
    source: {
      type: DataTypes.ENUM(...PRICE_CHANGE_SOURCES),
      allowNull: false,
      comment: 'Provenance of the price decision (see PRICE_CHANGE_SOURCES)',
    },
    // Set when a governance request produced this change (S3). Null otherwise.
    pricingChangeRequestId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'FK to pricing_change_requests (S3) — null unless applied via an approved request',
    },
    // S1 shadow marker: true means "the floor WOULD have clamped this cart, but enforcement is off".
    // The load-bearing S1 observation — S2 uses the rate of true values to decide enforcement is safe.
    wouldHaveClamped: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Shadow-mode marker: floor would have clamped this cart but enforcement was off',
    },
    // Small structured context: floor value used, whether a special applied, resolver source, etc.
    // IDs/amounts/booleans only — never client names or free text PII (rule 8).
    context: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Structured decision context (floor, special flags, resolver source) — no PII',
    },
  },
  {
    sequelize,
    modelName: 'PriceChangeLog',
    tableName: 'price_change_logs',
    timestamps: true,
    updatedAt: false, // append-only — createdAt is the only timestamp; history never mutates
    indexes: [
      { fields: ['storeFrontItemId', 'createdAt'] },
      { fields: ['source'] },
      { fields: ['wouldHaveClamped'] },
      { fields: ['pricingChangeRequestId'] },
    ],
    hooks: {
      beforeUpdate: () => {
        throw new Error(APPEND_ONLY_MESSAGE);
      },
      beforeDestroy: () => {
        throw new Error(APPEND_ONLY_MESSAGE);
      },
      beforeBulkUpdate: () => {
        throw new Error(APPEND_ONLY_MESSAGE);
      },
      beforeBulkDestroy: () => {
        throw new Error(APPEND_ONLY_MESSAGE);
      },
    },
  },
);

PriceChangeLog.associate = (models) => {
  PriceChangeLog.belongsTo(models.StorefrontItem, {
    foreignKey: 'storeFrontItemId',
    as: 'storefrontItem',
  });
  PriceChangeLog.belongsTo(models.User, {
    foreignKey: 'changedByUserId',
    as: 'changedBy',
  });
};

export default PriceChangeLog;
