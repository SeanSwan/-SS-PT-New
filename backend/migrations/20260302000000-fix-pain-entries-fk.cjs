'use strict';

/**
 * Migration: Fix client_pain_entries foreign key constraints
 * ==========================================================
 * The original migration referenced 'users' (lowercase) but the actual
 * table is "Users" (case-sensitive). This migration drops and recreates
 * the FK constraints to point to the correct table.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Drop existing broken FK constraints (they reference non-existent 'users' table)
    try {
      await queryInterface.removeConstraint('client_pain_entries', 'client_pain_entries_userId_fkey');
    } catch (e) {
      console.log('FK client_pain_entries_userId_fkey not found, skipping:', e.message);
    }
    try {
      await queryInterface.removeConstraint('client_pain_entries', 'client_pain_entries_createdById_fkey');
    } catch (e) {
      console.log('FK client_pain_entries_createdById_fkey not found, skipping:', e.message);
    }

    // Also try Sequelize-generated constraint names
    try {
      await queryInterface.removeConstraint('client_pain_entries', 'client_pain_entries_userId_fkey1');
    } catch (e) { /* ignore */ }
    try {
      await queryInterface.removeConstraint('client_pain_entries', 'client_pain_entries_createdById_fkey1');
    } catch (e) { /* ignore */ }

    // Recreate FK constraints pointing to "Users" (correct case-sensitive table name)
    await queryInterface.addConstraint('client_pain_entries', {
      fields: ['userId'],
      type: 'foreign key',
      name: 'client_pain_entries_userId_fkey',
      references: {
        table: 'Users',
        field: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    await queryInterface.addConstraint('client_pain_entries', {
      fields: ['createdById'],
      type: 'foreign key',
      name: 'client_pain_entries_createdById_fkey',
      references: {
        table: 'Users',
        field: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeConstraint('client_pain_entries', 'client_pain_entries_userId_fkey');
    await queryInterface.removeConstraint('client_pain_entries', 'client_pain_entries_createdById_fkey');
  },
};
