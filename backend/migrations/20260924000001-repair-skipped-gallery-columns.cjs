'use strict';

// Earlier add-* migrations sort before create-gallery-tables. Their absent-table
// guards let bootstrap continue but SequelizeMeta records them as applied. Repair
// the resulting missing columns with a new migration, also safe for existing data.
module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await queryInterface.tableExists('gallery_visitors'))) {
      throw new Error('Gallery column repair requires gallery_visitors; complete the gallery table creation first.');
    }
    await queryInterface.sequelize.transaction(async transaction => {
      const options = { transaction };
      const columns = await queryInterface.describeTable('gallery_visitors', options);
      const additions = {
        enhancement_credits: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        is_vip: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        free_enhancements_used: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
        user_id: {
          type: Sequelize.INTEGER, allowNull: true,
          references: { model: 'Users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
        },
      };
      for (const [column, definition] of Object.entries(additions)) {
        if (!columns[column]) await queryInterface.addColumn('gallery_visitors', column, definition, options);
      }
      const indexes = await queryInterface.showIndex('gallery_visitors', options);
      if (!indexes.some(index => index.name === 'idx_gallery_visitors_user_id')) {
        await queryInterface.addIndex('gallery_visitors', ['user_id'], { ...options, name: 'idx_gallery_visitors_user_id' });
      }
    });
  },
  async down() {
    // There is no reliable way to know which columns predated this repair.
    // Never delete existing credits/links during an automated downgrade.
    throw new Error('Gallery repair is additive and cannot be automatically reversed; use a reviewed forward migration.');
  },
};
