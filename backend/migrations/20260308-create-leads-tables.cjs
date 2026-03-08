'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create lead_status enum
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_leads_status" AS ENUM ('new', 'contacted', 'qualified', 'scheduled', 'converted', 'lost');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create lead_source enum
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_leads_source" AS ENUM ('gallery', 'walk_in', 'website', 'referral', 'social_media', 'other');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create lead_activity_type enum
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_lead_activities_type" AS ENUM (
          'status_change', 'note_added', 'email_sent', 'email_opened',
          'call_made', 'sms_sent', 'meeting_scheduled', 'ai_draft',
          'follow_up_set', 'score_changed', 'assigned'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create leads table
    await queryInterface.createTable('leads', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      first_name: { type: Sequelize.STRING(100), allowNull: false },
      last_name: { type: Sequelize.STRING(100), allowNull: true },
      email: { type: Sequelize.STRING(255), allowNull: true },
      phone: { type: Sequelize.STRING(30), allowNull: true },
      source: { type: 'enum_leads_source', allowNull: false, defaultValue: 'other' },
      source_detail: { type: Sequelize.STRING(255), allowNull: true },
      status: { type: 'enum_leads_status', allowNull: false, defaultValue: 'new' },
      score: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      scheduled_session_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Sessions', key: 'id' } },
      converted_user_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Users', key: 'id' } },
      gallery_visitor_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'gallery_visitors', key: 'id' } },
      referred_by_user_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Users', key: 'id' } },
      spirit_name: { type: Sequelize.STRING(100), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      goals: { type: Sequelize.TEXT, allowNull: true },
      tags: { type: Sequelize.JSONB, allowNull: true, defaultValue: [] },
      last_contacted_at: { type: Sequelize.DATE, allowNull: true },
      next_follow_up_at: { type: Sequelize.DATE, allowNull: true },
      contact_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      contacted_at: { type: Sequelize.DATE, allowNull: true },
      qualified_at: { type: Sequelize.DATE, allowNull: true },
      scheduled_at: { type: Sequelize.DATE, allowNull: true },
      converted_at: { type: Sequelize.DATE, allowNull: true },
      lost_at: { type: Sequelize.DATE, allowNull: true },
      lost_reason: { type: Sequelize.STRING(255), allowNull: true },
      assigned_trainer_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Users', key: 'id' } },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    });

    // Create lead_activities table
    await queryInterface.createTable('lead_activities', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      lead_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'leads', key: 'id' }, onDelete: 'CASCADE' },
      type: { type: 'enum_lead_activities_type', allowNull: false },
      performed_by_user_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Users', key: 'id' } },
      performed_by_ai: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      title: { type: Sequelize.STRING(255), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      metadata: { type: Sequelize.JSONB, allowNull: true, defaultValue: {} },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    // Add indexes
    await queryInterface.addIndex('leads', ['status']);
    await queryInterface.addIndex('leads', ['source']);
    await queryInterface.addIndex('leads', ['email']);
    await queryInterface.addIndex('leads', ['score']);
    await queryInterface.addIndex('leads', ['assigned_trainer_id']);
    await queryInterface.addIndex('leads', ['next_follow_up_at']);
    await queryInterface.addIndex('lead_activities', ['lead_id']);
    await queryInterface.addIndex('lead_activities', ['type']);
    await queryInterface.addIndex('lead_activities', ['created_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('lead_activities');
    await queryInterface.dropTable('leads');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_lead_activities_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_leads_source";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_leads_status";');
  },
};
