'use strict';

/**
 * Migration: Add Tamagotchi companion pet fields to Gamifications table
 *
 * Stores pet species, evolution stage, appearance modifiers, and health state.
 * Pet health is derived from Aegis HUD needs — no separate decay cron needed.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = 'Gamifications';

    // Check which columns already exist
    const desc = await queryInterface.describeTable(table).catch(() => null);
    if (!desc) return; // Table doesn't exist yet

    const columns = [
      {
        name: 'petSpecies',
        def: {
          type: Sequelize.STRING(30),
          allowNull: true,
          defaultValue: null,
          comment: 'Pet species: crystal_dragon, iron_wolf, ember_phoenix, frost_swan, shadow_panther'
        }
      },
      {
        name: 'petName',
        def: {
          type: Sequelize.STRING(50),
          allowNull: true,
          defaultValue: null,
          comment: 'User-chosen pet name'
        }
      },
      {
        name: 'petState',
        def: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: null,
          comment: 'Full pet state: evolution stage, health, mood, appearance mods, birth date'
        }
      },
      {
        name: 'petInventory',
        def: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: null,
          comment: 'Cosmetic items earned for pet (armor, wings, weapons, auras)'
        }
      }
    ];

    for (const col of columns) {
      if (!desc[col.name]) {
        await queryInterface.addColumn(table, col.name, col.def);
      }
    }
  },

  async down(queryInterface) {
    const table = 'Gamifications';
    const cols = ['petSpecies', 'petName', 'petState', 'petInventory'];
    for (const col of cols) {
      await queryInterface.removeColumn(table, col).catch(() => {});
    }
  }
};
