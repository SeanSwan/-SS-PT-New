'use strict';

/**
 * Fix FK constraints on body_measurements table.
 * The original migration referenced 'users' (lowercase) but the
 * actual table is "Users" (capital U, case-sensitive in PostgreSQL).
 */
module.exports = {
  up: async (queryInterface) => {
    // Drop the broken FK constraints if they exist
    const dropConstraint = async (name) => {
      try {
        await queryInterface.removeConstraint('body_measurements', name);
      } catch {
        // Constraint may not exist — that's fine
      }
    };

    await dropConstraint('body_measurements_userId_fkey');
    await dropConstraint('body_measurements_recordedBy_fkey');

    // Re-create with correct table reference
    await queryInterface.addConstraint('body_measurements', {
      fields: ['userId'],
      type: 'foreign key',
      name: 'body_measurements_userId_fkey',
      references: { table: 'Users', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    await queryInterface.addConstraint('body_measurements', {
      fields: ['recordedBy'],
      type: 'foreign key',
      name: 'body_measurements_recordedBy_fkey',
      references: { table: 'Users', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });
  },

  down: async (queryInterface) => {
    const dropConstraint = async (name) => {
      try {
        await queryInterface.removeConstraint('body_measurements', name);
      } catch {
        // ignore
      }
    };

    await dropConstraint('body_measurements_userId_fkey');
    await dropConstraint('body_measurements_recordedBy_fkey');

    // Restore original (broken) constraints
    await queryInterface.addConstraint('body_measurements', {
      fields: ['userId'],
      type: 'foreign key',
      name: 'body_measurements_userId_fkey',
      references: { table: 'users', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    await queryInterface.addConstraint('body_measurements', {
      fields: ['recordedBy'],
      type: 'foreign key',
      name: 'body_measurements_recordedBy_fkey',
      references: { table: 'users', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });
  },
};
