'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Table 1: waiver_versions
    await queryInterface.createTable('waiver_versions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      waiverType: {
        type: Sequelize.ENUM('core', 'activity_addendum', 'ai_notice'),
        allowNull: false,
      },
      activityType: {
        type: Sequelize.ENUM('home_gym', 'park', 'swimming'),
        allowNull: true,
      },
      version: {
        type: Sequelize.STRING(30),
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      body: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      textHash: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      effectiveAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      createdByUserId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('waiver_versions', ['waiverType', 'activityType', 'version'], {
      unique: true,
      name: 'waiver_versions_type_activity_version_unique',
    });

    // Table 2: waiver_records
    await queryInterface.createTable('waiver_records', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      fullName: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      dateOfBirth: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      phone: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('pending_match', 'linked', 'superseded'),
        allowNull: false,
        defaultValue: 'pending_match',
      },
      source: {
        type: Sequelize.ENUM('public_qr', 'authenticated'),
        allowNull: false,
        defaultValue: 'public_qr',
      },
      activityTypes: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      signatureData: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      signedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      ipAddress: {
        type: Sequelize.STRING(45),
        allowNull: true,
      },
      userAgent: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('waiver_records', ['userId'], { name: 'waiver_records_userId' });
    await queryInterface.addIndex('waiver_records', ['email'], { name: 'waiver_records_email' });
    await queryInterface.addIndex('waiver_records', ['phone'], { name: 'waiver_records_phone' });
    await queryInterface.addIndex('waiver_records', ['status'], { name: 'waiver_records_status' });
    await queryInterface.addIndex('waiver_records', ['dateOfBirth', 'email'], {
      name: 'waiver_records_dob_email',
    });
    await queryInterface.addIndex('waiver_records', ['dateOfBirth', 'phone'], {
      name: 'waiver_records_dob_phone',
    });

    // Table 3: waiver_record_versions
    await queryInterface.createTable('waiver_record_versions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      waiverRecordId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'waiver_records',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      waiverVersionId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'waiver_versions',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('waiver_record_versions', ['waiverRecordId', 'waiverVersionId'], {
      unique: true,
      name: 'waiver_record_versions_record_version_unique',
    });

    // Table 4: waiver_consent_flags
    await queryInterface.createTable('waiver_consent_flags', {
      waiverRecordId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        allowNull: false,
        references: {
          model: 'waiver_records',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      aiConsentAccepted: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      liabilityAccepted: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      mediaReleaseAccepted: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      guardianAccepted: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      guardianName: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      guardianRelationship: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Table 5: pending_waiver_matches
    await queryInterface.createTable('pending_waiver_matches', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      waiverRecordId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'waiver_records',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      candidateUserId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      confidenceScore: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      matchMethod: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('pending', 'auto_linked', 'manual_linked', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
      },
      reviewedByUserId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      reviewedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('pending_waiver_matches', ['waiverRecordId'], {
      name: 'pending_waiver_matches_waiverRecordId',
    });
    await queryInterface.addIndex('pending_waiver_matches', ['candidateUserId'], {
      name: 'pending_waiver_matches_candidateUserId',
    });
    await queryInterface.addIndex('pending_waiver_matches', ['status'], {
      name: 'pending_waiver_matches_status',
    });

    // Table 6: ai_consent_logs
    await queryInterface.createTable('ai_consent_logs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      action: {
        type: Sequelize.ENUM('granted', 'withdrawn', 'override_used'),
        allowNull: false,
      },
      sourceType: {
        type: Sequelize.ENUM('ai_privacy_profile', 'waiver_record', 'admin_override'),
        allowNull: false,
      },
      sourceId: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      actorUserId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('ai_consent_logs', ['userId'], {
      name: 'ai_consent_logs_userId',
    });
    await queryInterface.addIndex('ai_consent_logs', ['sourceType', 'sourceId'], {
      name: 'ai_consent_logs_sourceType_sourceId',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('ai_consent_logs');
    await queryInterface.dropTable('pending_waiver_matches');
    await queryInterface.dropTable('waiver_consent_flags');
    await queryInterface.dropTable('waiver_record_versions');
    await queryInterface.dropTable('waiver_records');
    await queryInterface.dropTable('waiver_versions');

    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_waiver_versions_waiverType";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_waiver_versions_activityType";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_waiver_records_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_waiver_records_source";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_pending_waiver_matches_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_ai_consent_logs_action";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_ai_consent_logs_sourceType";');
  },
};
