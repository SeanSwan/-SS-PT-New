'use strict';

/**
 * FILE: 20260613000100-align-storefront-currency-decimal.cjs
 * SYSTEM: Storefront / Catalog pricing
 *
 * PURPOSE:
 * - Align storefront_items currency columns with the StorefrontItem model:
 *   price / pricePerSession / totalCost must be DECIMAL(10,2), not FLOAT.
 * - Ensure the displayOrder column exists (model declares it; the original
 *   create-table migration omitted it).
 *
 * WHY (2026-06-13):
 * - 20250213192601-create-storefront-items.cjs created these as Sequelize.FLOAT
 *   (double precision) while StorefrontItem.mjs declares DECIMAL(10,2). Money
 *   columns should be exact-decimal. Transaction records (Order, OrderItem,
 *   FinancialTransaction, BusinessMetrics) are already DECIMAL; this brings the
 *   catalog layer to the same exact-cents standard.
 *
 * SAFETY:
 * - Idempotent: only ALTERs a column when its current type is float/real/double;
 *   only adds displayOrder when missing. Safe to re-run.
 * - Forward conversion via ROUND(col::numeric, 2) — widening FLOAT -> DECIMAL on
 *   clean values is lossless; ROUND guards any stored float artifact.
 * - storefront_items is a tiny catalog table; ALTER is fast, no row-lock concern.
 *
 * CREATED: 2026-06-13
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const sequelize = queryInterface.sequelize;
    const CURRENCY_COLUMNS = ['price', 'pricePerSession', 'totalCost'];

    try {
      await sequelize.transaction(async (t) => {
        const [tables] = await sequelize.query(
          `SELECT 1 FROM information_schema.tables WHERE table_name = 'storefront_items';`,
          { transaction: t }
        );
        if (!tables || tables.length === 0) {
          console.log('storefront_items not found, skipping currency alignment.');
          return;
        }

        for (const column of CURRENCY_COLUMNS) {
          const [info] = await sequelize.query(
            `SELECT data_type FROM information_schema.columns
             WHERE table_name = 'storefront_items' AND column_name = :column;`,
            { transaction: t, replacements: { column } }
          );
          if (!info || info.length === 0) {
            console.log(`Column ${column} not present; skipping.`);
            continue;
          }
          const dataType = (info[0].data_type || '').toLowerCase();
          const isFloat = dataType.includes('double') || dataType === 'real';
          if (isFloat) {
            await sequelize.query(
              `ALTER TABLE "storefront_items"
               ALTER COLUMN "${column}" TYPE DECIMAL(10,2)
               USING ROUND("${column}"::numeric, 2);`,
              { transaction: t }
            );
            console.log(`Aligned ${column} -> DECIMAL(10,2) (was ${dataType}).`);
          } else {
            console.log(`Column ${column} already ${dataType}; no change.`);
          }
        }

        const [displayOrderCol] = await sequelize.query(
          `SELECT 1 FROM information_schema.columns
           WHERE table_name = 'storefront_items' AND column_name = 'displayOrder';`,
          { transaction: t }
        );
        if (!displayOrderCol || displayOrderCol.length === 0) {
          await sequelize.query(
            `ALTER TABLE "storefront_items"
             ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0;`,
            { transaction: t }
          );
          console.log('Added missing displayOrder column (default 0).');
        } else {
          console.log('displayOrder column already present; no change.');
        }
      });
    } catch (error) {
      console.error('Failed to align storefront currency columns:', error.message);
      throw error;
    }
  },

  async down() {
    // Forward-only: reverting DECIMAL back to FLOAT would re-introduce the
    // precision defect, and dropping displayOrder could lose ordering data.
    console.log('Rollback not supported for storefront currency alignment.');
  }
};
