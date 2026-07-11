/**
 * Add Special-Offer Fields — Per-Client "SwanStudios Special" (S1)
 * ================================================================
 *
 * Adds the recurrence/validity, redemption-limit, and below-floor override-audit
 * fields to `custom_packages`, and the hidden-marker `isSpecialOffer` to
 * `storefront_items`, for the per-client bonus-session special-pricing feature.
 *
 * Design (2026-07-04, Sean-arbitrated):
 * - The $175/session PAID sticker never drops; discount = bonus sessions only.
 * - Effective-rate floor: >=120 no gate; 100-120 override+audit; 60-100 override
 *   + logged reason; <60 hard-blocked.
 * - A "special" is a CustomPackage (spine) backed by a hidden, client-scoped
 *   StorefrontItem (isSpecialOffer=true) that is EXCLUDED from the public catalog.
 *
 * Forward-only + idempotent (describeTable guard). Never edit an old migration.
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const tables = await queryInterface.showAllTables({ transaction });

      // ── custom_packages: validity / redemption / override-audit ──────────
      if (!tables.includes('custom_packages')) {
        throw new Error('Table custom_packages does not exist - run base migration first');
      }
      const cp = await queryInterface.describeTable('custom_packages', { transaction });

      const addCp = async (name, spec) => {
        if (!cp[name]) {
          await queryInterface.addColumn('custom_packages', name, spec, { transaction });
          console.log(`   ✅ custom_packages.${name} added`);
        } else {
          console.log(`   ⏭️  custom_packages.${name} already exists`);
        }
      };

      await addCp('validityType', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'one_time',
        comment: 'one_time | n_times | time_window | ongoing',
      });
      await addCp('maxRedemptions', {
        type: Sequelize.INTEGER,
        allowNull: true, // null = unlimited (ongoing / time_window)
      });
      await addCp('remainingRedemptions', {
        type: Sequelize.INTEGER,
        allowNull: true, // null = unlimited; decremented on each purchase
      });
      await addCp('approvedByAdminId', {
        type: Sequelize.INTEGER,
        allowNull: true, // admin who approved a below-gate effective rate
      });
      await addCp('approvedAt', {
        type: Sequelize.DATE,
        allowNull: true,
      });
      await addCp('overrideReason', {
        type: Sequelize.TEXT,
        allowNull: true, // required when effective rate < $100 floor
      });

      // ── storefront_items: hidden special-offer marker ────────────────────
      if (!tables.includes('storefront_items')) {
        throw new Error('Table storefront_items does not exist - run base migration first');
      }
      const si = await queryInterface.describeTable('storefront_items', { transaction });
      if (!si.isSpecialOffer) {
        await queryInterface.addColumn('storefront_items', 'isSpecialOffer', {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: 'true = hidden client-scoped SwanStudios Special; excluded from public catalog',
        }, { transaction });
        console.log('   ✅ storefront_items.isSpecialOffer added');
      } else {
        console.log('   ⏭️  storefront_items.isSpecialOffer already exists');
      }

      // ── indexes (idempotent) ─────────────────────────────────────────────
      const addIndexSafe = async (table, cols, name, opts = {}) => {
        try {
          await queryInterface.addIndex(table, cols, { name, transaction, ...opts });
          console.log(`   ✅ index ${name} created`);
        } catch (err) {
          if (String(err.message).includes('already exists')) {
            console.log(`   ⏭️  index ${name} already exists`);
          } else {
            throw err;
          }
        }
      };
      await addIndexSafe('storefront_items', ['isSpecialOffer'], 'storefront_items_is_special_offer_idx');
      // Unique: each special links to exactly one hidden StorefrontItem (1:1). Postgres
      // treats NULLs as distinct, so legacy packages with no linked item are unaffected.
      await addIndexSafe('custom_packages', ['storefrontItemId'], 'custom_packages_storefront_item_idx', { unique: true });

      await transaction.commit();
      console.log('✅ add-special-offer-fields migration complete');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ add-special-offer-fields migration failed:', error.message);
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const removeIndexSafe = async (table, name) => {
        try {
          await queryInterface.removeIndex(table, name, { transaction });
        } catch {
          console.log(`   ⚠️  index ${name} may not exist, continuing`);
        }
      };
      await removeIndexSafe('storefront_items', 'storefront_items_is_special_offer_idx');
      await removeIndexSafe('custom_packages', 'custom_packages_storefront_item_idx');

      const removeColSafe = async (table, name) => {
        try {
          await queryInterface.removeColumn(table, name, { transaction });
        } catch {
          console.log(`   ⚠️  ${table}.${name} may not exist, continuing`);
        }
      };
      await removeColSafe('storefront_items', 'isSpecialOffer');
      for (const c of ['overrideReason', 'approvedAt', 'approvedByAdminId', 'remainingRedemptions', 'maxRedemptions', 'validityType']) {
        await removeColSafe('custom_packages', c);
      }

      await transaction.commit();
      console.log('✅ add-special-offer-fields rollback complete');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ add-special-offer-fields rollback failed:', error.message);
      throw error;
    }
  },
};
