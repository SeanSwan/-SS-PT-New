'use strict';

/**
 * Creates trainer_applications — self-serve trainer onboarding submissions + contract e-sign evidence.
 * FK userId/reviewedBy → "Users" (PascalCase table, project gotcha). Fail-closed: status defaults pending_review.
 * Mirrors WaiverRecord e-sign evidence pattern. Stripe/payout columns are placeholders for a future slice.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('trainer_applications', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'Users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        fullName: { type: Sequelize.STRING(200), allowNull: false },
        email: { type: Sequelize.STRING(255), allowNull: false },
        phone: { type: Sequelize.STRING(50), allowNull: true },
        businessName: { type: Sequelize.STRING(200), allowNull: true },
        specialties: { type: Sequelize.TEXT, allowNull: true },
        bio: { type: Sequelize.TEXT, allowNull: true },
        yearsExperience: { type: Sequelize.INTEGER, allowNull: true },
        primaryCertification: { type: Sequelize.STRING(100), allowNull: true },
        certificationNumber: { type: Sequelize.STRING(100), allowNull: true },
        certificationExpiry: { type: Sequelize.DATEONLY, allowNull: true },
        cprAedExpiry: { type: Sequelize.DATEONLY, allowNull: true },
        certificationFileKey: { type: Sequelize.STRING(500), allowNull: true },
        insuranceCarrier: { type: Sequelize.STRING(200), allowNull: true },
        insurancePolicyNumber: { type: Sequelize.STRING(150), allowNull: true },
        insuranceExpiry: { type: Sequelize.DATEONLY, allowNull: true },
        insuranceFileKey: { type: Sequelize.STRING(500), allowNull: true },
        additionalInsuredAttested: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        contractVersion: { type: Sequelize.STRING(50), allowNull: false },
        signatureData: { type: Sequelize.TEXT, allowNull: false },
        signedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        ipAddress: { type: Sequelize.STRING(45), allowNull: true },
        userAgent: { type: Sequelize.TEXT, allowNull: true },
        consentFlags: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
        platformFeePercent: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 15.0 },
        status: {
          type: Sequelize.ENUM('pending_review', 'approved', 'rejected', 'withdrawn', 'suspended'),
          allowNull: false,
          defaultValue: 'pending_review',
        },
        reviewedBy: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'Users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        reviewedAt: { type: Sequelize.DATE, allowNull: true },
        reviewNotes: { type: Sequelize.TEXT, allowNull: true },
        stripeAccountId: { type: Sequelize.STRING(255), allowNull: true },
        metadata: { type: Sequelize.JSONB, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      }, { transaction });

      await queryInterface.addIndex('trainer_applications', ['userId'], {
        name: 'trainer_applications_userId', transaction,
      });
      await queryInterface.addIndex('trainer_applications', ['status'], {
        name: 'trainer_applications_status', transaction,
      });
      await queryInterface.addIndex('trainer_applications', ['email'], {
        name: 'trainer_applications_email', transaction,
      });

    // At most ONE active application per user (partial unique). Makes the "already applied"
    // check race-proof: two concurrent submits can't both create an active row. A rejected/
    // withdrawn user can still reapply (those statuses are excluded from the constraint).
      await queryInterface.addIndex('trainer_applications', ['userId'], {
        name: 'trainer_applications_one_active_per_user',
        unique: true,
        where: { status: { [Sequelize.Op.in]: ['pending_review', 'approved', 'suspended'] } },
        transaction,
      });
    });
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable('trainer_applications', { transaction });
      // Drop the ENUM type created by Postgres for the status column.
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_trainer_applications_status";',
        { transaction },
      );
    });
  },
};
