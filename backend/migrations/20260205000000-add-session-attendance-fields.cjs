'use strict';

/**
 * Migration: Add Session Attendance Fields
 * =========================================
 * Phase D: Check-In Flow
 *
 * Adds fields for tracking client attendance:
 * - attendanceStatus: ENUM (present, no_show, late, null)
 * - checkInTime: TIMESTAMP when client arrived
 * - checkOutTime: TIMESTAMP when client left
 * - noShowReason: TEXT reason for no-show
 * - markedPresentBy: FK to user who recorded attendance
 * - attendanceRecordedAt: TIMESTAMP when attendance was recorded
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Check if columns already exist
      const tableInfo = await queryInterface.describeTable('sessions');

      // Add attendanceStatus column
      if (!tableInfo.attendanceStatus) {
        await queryInterface.addColumn('sessions', 'attendanceStatus', {
          type: Sequelize.STRING(20),
          allowNull: true,
          defaultValue: null,
          comment: 'Attendance status: present, no_show, late, or null'
        }, { transaction });
        console.log('✅ Added attendanceStatus column');
      } else {
        console.log('⏭️ attendanceStatus column already exists');
      }

      // Add checkInTime column
      if (!tableInfo.checkInTime) {
        await queryInterface.addColumn('sessions', 'checkInTime', {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Timestamp when client checked in'
        }, { transaction });
        console.log('✅ Added checkInTime column');
      } else {
        console.log('⏭️ checkInTime column already exists');
      }

      // Add checkOutTime column
      if (!tableInfo.checkOutTime) {
        await queryInterface.addColumn('sessions', 'checkOutTime', {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Timestamp when client checked out'
        }, { transaction });
        console.log('✅ Added checkOutTime column');
      } else {
        console.log('⏭️ checkOutTime column already exists');
      }

      // Add noShowReason column
      if (!tableInfo.noShowReason) {
        await queryInterface.addColumn('sessions', 'noShowReason', {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Reason for no-show (if applicable)'
        }, { transaction });
        console.log('✅ Added noShowReason column');
      } else {
        console.log('⏭️ noShowReason column already exists');
      }

      // Add markedPresentBy column (FK to users)
      if (!tableInfo.markedPresentBy) {
        await queryInterface.addColumn('sessions', 'markedPresentBy', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
          comment: 'User ID of admin/trainer who recorded attendance'
        }, { transaction });
        console.log('✅ Added markedPresentBy column');
      } else {
        console.log('⏭️ markedPresentBy column already exists');
      }

      // Add attendanceRecordedAt column
      if (!tableInfo.attendanceRecordedAt) {
        await queryInterface.addColumn('sessions', 'attendanceRecordedAt', {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Timestamp when attendance was recorded'
        }, { transaction });
        console.log('✅ Added attendanceRecordedAt column');
      } else {
        console.log('⏭️ attendanceRecordedAt column already exists');
      }

      // Add index for attendance queries
      try {
        await queryInterface.addIndex('sessions', ['attendanceStatus'], {
          name: 'sessions_attendance_status_idx',
          transaction
        });
        console.log('✅ Added attendance status index');
      } catch (indexError) {
        if (indexError.message.includes('already exists')) {
          console.log('⏭️ Attendance status index already exists');
        } else {
          throw indexError;
        }
      }

      await transaction.commit();
      console.log('✅ Migration completed successfully');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Remove index
      try {
        await queryInterface.removeIndex('sessions', 'sessions_attendance_status_idx', { transaction });
      } catch (e) {
        // Index might not exist
      }

      // Remove columns in reverse order
      const columnsToRemove = [
        'attendanceRecordedAt',
        'markedPresentBy',
        'noShowReason',
        'checkOutTime',
        'checkInTime',
        'attendanceStatus'
      ];

      for (const column of columnsToRemove) {
        try {
          await queryInterface.removeColumn('sessions', column, { transaction });
          console.log(`✅ Removed ${column} column`);
        } catch (e) {
          console.log(`⏭️ ${column} column doesn't exist or couldn't be removed`);
        }
      }

      await transaction.commit();
      console.log('✅ Rollback completed successfully');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error.message);
      throw error;
    }
  }
};
