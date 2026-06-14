'use strict';

const CLASS_FORMAT_VALUES = [
  '2x5_r4', '2x5_r3', '2x6_r3', '2x6_r2', '2x7_r3', '2x7_r2',
  '2x8_r3', '2x8_r2', '2x10_r2', '3x4_r3', '3x4_r2', '3x5_r2',
  '3x5_r3', '3x6_r2', '3x6_r1', '3x8_r1', '4x4_r2', '4x4_r1',
  '4x5_r2', '4x5_r1', '4x6_r1', '5x3_r2', '5x3_r1', '5x4_r1',
  'stations_3x4', 'stations_5x3', 'circuit', 'emom', 'tabata', 'amrap',
  'partner', 'hybrid',
];

const CLASS_STYLE_VALUES = [
  'ladder', 'descending', 'chipper', 'countdown', 'death_by', 'ygig',
  'contrast', 'density',
];

module.exports = {
  async up(queryInterface) {
    for (const value of CLASS_FORMAT_VALUES) {
      await queryInterface.sequelize.query(`
        ALTER TYPE "enum_bootcamp_templates_classFormat" ADD VALUE IF NOT EXISTS '${value}';
      `);
    }

    for (const value of CLASS_STYLE_VALUES) {
      await queryInterface.sequelize.query(`
        ALTER TYPE "enum_bootcamp_templates_classStyle" ADD VALUE IF NOT EXISTS '${value}';
      `);
    }
  },

  async down() {
    // Postgres enum values cannot be removed safely without type recreation.
  },
};
