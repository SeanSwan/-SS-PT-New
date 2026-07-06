/**
 * Create marketing_campaigns — the central campaign spine (Marketing OS, Slice 2)
 * ==============================================================================
 *
 * Introduces the normalized MarketingCampaign business object. Before this, "campaign"
 * was only a free-text `campaignName` VARCHAR(120) on marketing_calendar_items. This
 * table is the backbone every later marketing slice (approval queue, email campaigns,
 * attribution) hangs off of.
 *
 * SAFETY: pure additive — creates ONE new table and ALTERs nothing existing (no FK on
 * marketing_calendar_items yet; that link is Slice 3). Forward-only, transaction-wrapped,
 * and idempotent (showAllTables guard) so a re-run is a no-op. camelCase columns match
 * the sibling marketing_calendar_items; createdBy/updatedBy reference the canonical
 * "Users" table (PascalCase — project FK gotcha). Never edit an old migration.
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const tables = await queryInterface.showAllTables({ transaction });
      if (tables.includes('marketing_campaigns')) {
        console.log('   ⏭️  marketing_campaigns already exists — skipping');
        await transaction.commit();
        return;
      }

      await queryInterface.createTable('marketing_campaigns', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
        name: { type: Sequelize.STRING(180), allowNull: false },
        objective: { type: Sequelize.STRING(40), allowNull: false, defaultValue: 'lead_generation' },
        offer: { type: Sequelize.TEXT, allowNull: true },
        audience: { type: Sequelize.TEXT, allowNull: true },
        status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'draft' },
        startAt: { type: Sequelize.DATE, allowNull: true },
        endAt: { type: Sequelize.DATE, allowNull: true },
        budget: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
        primaryChannel: { type: Sequelize.STRING(32), allowNull: true },
        utmCampaign: { type: Sequelize.STRING(120), allowNull: true },
        createdBy: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'Users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        updatedBy: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'Users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false },
        deletedAt: { type: Sequelize.DATE, allowNull: true },
      }, { transaction });

      const addIndexSafe = async (cols, name) => {
        try {
          await queryInterface.addIndex('marketing_campaigns', cols, { name, transaction });
          console.log(`   ✅ index ${name} created`);
        } catch (err) {
          if (String(err.message).includes('already exists')) {
            console.log(`   ⏭️  index ${name} already exists`);
          } else {
            throw err;
          }
        }
      };
      await addIndexSafe(['status'], 'marketing_campaigns_status_idx');
      await addIndexSafe(['objective'], 'marketing_campaigns_objective_idx');
      await addIndexSafe(['utmCampaign'], 'marketing_campaigns_utm_campaign_idx');

      await transaction.commit();
      console.log('✅ create-marketing-campaigns migration complete');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ create-marketing-campaigns migration failed:', error.message);
      throw error;
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('marketing_campaigns');
    console.log('✅ create-marketing-campaigns rollback complete');
  },
};
