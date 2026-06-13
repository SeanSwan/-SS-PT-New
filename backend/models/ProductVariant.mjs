// backend/models/ProductVariant.mjs
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

/**
 * ProductVariant — a sellable variant of a physical StorefrontItem product
 * (commerce expansion Phase 1, 2026-06-13). Examples: the "Buddy Fat Skin"
 * recovery drink in 1.5L / 16oz; merch in size × color. Belongs to a
 * StorefrontItem with itemKind='physical_product'. Each variant can override
 * the parent price and carry its own SKU + inventory. Training packages have no
 * variants. See docs/ai-workflow/brainstorms/storefront-commerce-expansion-2026-06-13.md
 */
class ProductVariant extends Model {}

ProductVariant.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  storefrontItemId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'FK to storefront_items.id — the physical product this variant belongs to',
  },
  label: {
    type: DataTypes.STRING(96),
    allowNull: false,
    comment: 'Display label, e.g. "1.5L Day Bottle", "16oz Trial", "Large / Black"',
  },
  sku: {
    type: DataTypes.STRING(64),
    allowNull: true,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Variant price override; null = inherit the parent product price',
  },
  stockQuantity: {
    type: DataTypes.INTEGER,
    allowNull: true, // null = not inventory-tracked (dropship / made-to-order drink)
    validate: { min: 0 },
  },
  attributes: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Structured variant attributes, e.g. { size: "L", color: "Black" }',
  },
  displayOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
}, {
  sequelize,
  modelName: 'ProductVariant',
  tableName: 'product_variants',
  timestamps: true,
});

export default ProductVariant;
