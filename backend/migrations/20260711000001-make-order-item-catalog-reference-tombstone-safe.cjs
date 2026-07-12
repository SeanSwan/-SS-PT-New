'use strict';

/**
 * Preserve paid-order fulfillment when an issued Stripe session outlives an
 * admin hard-delete. OrderItem keeps the historical catalog ID in metadata;
 * the live FK becomes nullable and SET NULL.
 */
module.exports = {
  async up(queryInterface) {
    const sequelize = queryInterface.sequelize;
    await sequelize.transaction(async (transaction) => {
      // Preserve pre-release order audit links before SET NULL can erase them.
      await sequelize.query(`
        UPDATE order_items
        SET metadata = jsonb_set(
          COALESCE(metadata::jsonb, '{}'::jsonb),
          '{originalStorefrontItemId}',
          to_jsonb("storefrontItemId"),
          true
        )
        WHERE "storefrontItemId" IS NOT NULL
          AND NOT (COALESCE(metadata::jsonb, '{}'::jsonb) ? 'originalStorefrontItemId');

        UPDATE order_items
        SET metadata = jsonb_set(
          COALESCE(metadata::jsonb, '{}'::jsonb),
          '{originalProductVariantId}',
          to_jsonb("productVariantId"),
          true
        )
        WHERE "productVariantId" IS NOT NULL
          AND NOT (COALESCE(metadata::jsonb, '{}'::jsonb) ? 'originalProductVariantId');
      `, { transaction });

      const [constraints] = await sequelize.query(`
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'order_items'::regclass
          AND contype = 'f'
          AND pg_get_constraintdef(oid) LIKE '%("storefrontItemId")%';
      `, { transaction });
      for (const { conname } of constraints) {
        await sequelize.query(
          `ALTER TABLE order_items DROP CONSTRAINT IF EXISTS "${String(conname).replaceAll('"', '""')}";`,
          { transaction },
        );
      }
      await sequelize.query(`
        ALTER TABLE order_items
          ALTER COLUMN "storefrontItemId" DROP NOT NULL;
        ALTER TABLE order_items
          ADD CONSTRAINT order_items_storefront_item_id_fkey_v2
          FOREIGN KEY ("storefrontItemId") REFERENCES storefront_items(id)
          ON UPDATE CASCADE ON DELETE SET NULL;
      `, { transaction });
    });
  },

  async down(queryInterface) {
    const sequelize = queryInterface.sequelize;
    await sequelize.query(`
      ALTER TABLE order_items
        DROP CONSTRAINT IF EXISTS order_items_storefront_item_id_fkey_v2;
      ALTER TABLE order_items
        ADD CONSTRAINT order_items_storefront_item_id_fkey
        FOREIGN KEY ("storefrontItemId") REFERENCES storefront_items(id)
        ON UPDATE CASCADE ON DELETE RESTRICT;
    `);
    // Null historical references cannot be reconstructed, so NOT NULL is not
    // restored automatically during rollback.
  },
};
