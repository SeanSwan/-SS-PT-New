/**
 * Add campaignId FK to marketing_calendar_items — link calendar items to the campaign spine (Slice 3b)
 * ===================================================================================================
 *
 * Connects the MarketingCampaign spine (created in 20260704120000) to calendar items so a
 * post/email/blog item can belong to a campaign. The legacy free-text `campaignName` column is
 * intentionally kept during the transition.
 *
 * SAFETY: additive + nullable → existing rows are untouched (campaignId defaults NULL). Forward-only,
 * transaction-wrapped, idempotent (describeTable guard). References marketing_campaigns(id) with
 * ON DELETE SET NULL, so archiving/deleting a campaign never deletes its calendar items. Never edit
 * an old migration. Runs after the create-marketing-campaigns migration (lexical order guarantees it).
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const tables = await queryInterface.showAllTables({ transaction });
      if (!tables.includes('marketing_calendar_items')) {
        console.log('   ⚠️  marketing_calendar_items missing — skipping campaignId add');
        await transaction.commit();
        return;
      }
      if (!tables.includes('marketing_campaigns')) {
        throw new Error('marketing_campaigns must exist first — run 20260704120000-create-marketing-campaigns');
      }

      const cols = await queryInterface.describeTable('marketing_calendar_items', { transaction });
      if (!cols.campaignId) {
        await queryInterface.addColumn('marketing_calendar_items', 'campaignId', {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'marketing_campaigns', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        }, { transaction });
        console.log('   ✅ marketing_calendar_items.campaignId added');
      } else {
        console.log('   ⏭️  marketing_calendar_items.campaignId already exists');
      }

      try {
        await queryInterface.addIndex('marketing_calendar_items', ['campaignId'], {
          name: 'marketing_calendar_items_campaign_id_idx',
          transaction,
        });
        console.log('   ✅ index marketing_calendar_items_campaign_id_idx created');
      } catch (err) {
        if (String(err.message).includes('already exists')) {
          console.log('   ⏭️  index marketing_calendar_items_campaign_id_idx already exists');
        } else {
          throw err;
        }
      }

      await transaction.commit();
      console.log('✅ add-campaign-id-to-marketing-calendar-items migration complete');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ add-campaign-id migration failed:', error.message);
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      try {
        await queryInterface.removeIndex('marketing_calendar_items', 'marketing_calendar_items_campaign_id_idx', { transaction });
      } catch {
        console.log('   ⚠️  campaignId index may not exist, continuing');
      }
      try {
        await queryInterface.removeColumn('marketing_calendar_items', 'campaignId', { transaction });
      } catch {
        console.log('   ⚠️  campaignId column may not exist, continuing');
      }
      await transaction.commit();
      console.log('✅ add-campaign-id rollback complete');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
