module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('client_baseline_measurements');
    if (!table.bodyWeight) {
      await queryInterface.addColumn('client_baseline_measurements', 'bodyWeight', {
        type: Sequelize.DECIMAL(6, 2),
        allowNull: true,
      });
    }
  },

  down: async (queryInterface) => {
    const table = await queryInterface.describeTable('client_baseline_measurements');
    if (table.bodyWeight) {
      await queryInterface.removeColumn('client_baseline_measurements', 'bodyWeight');
    }
  },
};
