// backend/migrations/20250509-add-mcp-fields-to-progress.mjs
import { DataTypes } from 'sequelize';

/**
 * Migration to add MCP data fields to client_progress table
 */
export default {
  up: async (queryInterface, Sequelize) => {
    // Add the new columns
    return Promise.all([
      queryInterface.addColumn('client_progress', 'workoutData', {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Raw JSON data from workout MCP server',
      }),
      
      queryInterface.addColumn('client_progress', 'gamificationData', {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Raw JSON data from gamification MCP server',
      }),
      
      queryInterface.addColumn('client_progress', 'lastSynced', {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp of last synchronization with MCP servers',
      }),
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the columns if needed
    return Promise.all([
      queryInterface.removeColumn('client_progress', 'workoutData'),
      queryInterface.removeColumn('client_progress', 'gamificationData'),
      queryInterface.removeColumn('client_progress', 'lastSynced'),
    ]);
  }
};