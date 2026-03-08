'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ── GalleryEvent ──────────────────────────────────────────────────────
    await queryInterface.createTable('gallery_events', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(255), allowNull: false },
      slug: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      sport: { type: Sequelize.STRING(100), allowNull: true },
      event_date: { type: Sequelize.DATEONLY, allowNull: true },
      location: { type: Sequelize.STRING(255), allowNull: true },
      password_hash: { type: Sequelize.STRING(255), allowNull: false },
      cover_photo_id: { type: Sequelize.INTEGER, allowNull: true },
      photo_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      is_published: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('gallery_events', ['slug'], { unique: true, name: 'idx_gallery_events_slug' });
    await queryInterface.addIndex('gallery_events', ['is_published'], { name: 'idx_gallery_events_published' });
    await queryInterface.addIndex('gallery_events', ['event_date'], { name: 'idx_gallery_events_date' });

    // ── GalleryPhoto ──────────────────────────────────────────────────────
    await queryInterface.createTable('gallery_photos', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      event_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'gallery_events', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      photo_number: { type: Sequelize.INTEGER, allowNull: false },
      display_name: { type: Sequelize.STRING(100), allowNull: false },
      storage_key: { type: Sequelize.STRING(500), allowNull: false },
      thumbnail_key: { type: Sequelize.STRING(500), allowNull: true },
      url: { type: Sequelize.TEXT, allowNull: false },
      thumbnail_url: { type: Sequelize.TEXT, allowNull: true },
      original_filename: { type: Sequelize.STRING(500), allowNull: true },
      file_size: { type: Sequelize.INTEGER, allowNull: true },
      width: { type: Sequelize.INTEGER, allowNull: true },
      height: { type: Sequelize.INTEGER, allowNull: true },
      mime_type: { type: Sequelize.STRING(50), allowNull: false, defaultValue: 'image/jpeg' },
      metadata: { type: Sequelize.JSONB, allowNull: true },
      enhanced_storage_key: { type: Sequelize.STRING(500), allowNull: true },
      enhanced_url: { type: Sequelize.TEXT, allowNull: true },
      enhancement_request_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('gallery_photos', ['event_id', 'photo_number'], { unique: true, name: 'idx_gallery_photos_event_number' });
    await queryInterface.addIndex('gallery_photos', ['event_id'], { name: 'idx_gallery_photos_event' });

    // ── GalleryVisitor ────────────────────────────────────────────────────
    await queryInterface.createTable('gallery_visitors', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      email: { type: Sequelize.STRING(255), allowNull: false },
      first_name: { type: Sequelize.STRING(100), allowNull: true },
      last_name: { type: Sequelize.STRING(100), allowNull: true },
      phone: { type: Sequelize.STRING(50), allowNull: true },
      event_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'gallery_events', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      newsletter_opt_in: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      parental_consent: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      source: { type: Sequelize.STRING(50), allowNull: false, defaultValue: 'gallery' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('gallery_visitors', ['email'], { name: 'idx_gallery_visitors_email' });
    await queryInterface.addIndex('gallery_visitors', ['event_id'], { name: 'idx_gallery_visitors_event' });
    await queryInterface.addIndex('gallery_visitors', ['email', 'event_id'], { unique: true, name: 'idx_gallery_visitors_email_event' });

    // ── EnhancementRequest ────────────────────────────────────────────────
    await queryInterface.createTable('gallery_enhancement_requests', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      visitor_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'gallery_visitors', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      photo_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'gallery_photos', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      status: {
        type: Sequelize.ENUM('requested', 'in_progress', 'completed', 'delivered'),
        allowNull: false, defaultValue: 'requested',
      },
      completed_at: { type: Sequelize.DATE, allowNull: true },
      delivered_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('gallery_enhancement_requests', ['visitor_id'], { name: 'idx_enhancement_visitor' });
    await queryInterface.addIndex('gallery_enhancement_requests', ['photo_id'], { name: 'idx_enhancement_photo' });
    await queryInterface.addIndex('gallery_enhancement_requests', ['status'], { name: 'idx_enhancement_status' });

    // ── GalleryDonation ───────────────────────────────────────────────────
    await queryInterface.createTable('gallery_donations', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      visitor_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'gallery_visitors', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      event_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'gallery_events', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      method: {
        type: Sequelize.ENUM('stripe', 'venmo', 'zelle'),
        allowNull: false,
      },
      stripe_payment_id: { type: Sequelize.STRING(255), allowNull: true },
      zelle_confirmed: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      note: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('gallery_donations', ['visitor_id'], { name: 'idx_donation_visitor' });
    await queryInterface.addIndex('gallery_donations', ['event_id'], { name: 'idx_donation_event' });

    // ── GalleryReferral ───────────────────────────────────────────────────
    await queryInterface.createTable('gallery_referrals', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      visitor_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'gallery_visitors', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      event_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'gallery_events', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      referral_name: { type: Sequelize.STRING(200), allowNull: false },
      referral_phone: { type: Sequelize.STRING(50), allowNull: false },
      referral_email: { type: Sequelize.STRING(255), allowNull: true },
      contacted: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      converted: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('gallery_referrals', ['visitor_id'], { name: 'idx_referral_visitor' });
    await queryInterface.addIndex('gallery_referrals', ['event_id'], { name: 'idx_referral_event' });

    // Add FK for cover_photo_id now that gallery_photos exists
    await queryInterface.addConstraint('gallery_events', {
      fields: ['cover_photo_id'],
      type: 'foreign key',
      name: 'fk_gallery_events_cover_photo',
      references: { table: 'gallery_photos', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('gallery_events', 'fk_gallery_events_cover_photo').catch(() => {});
    await queryInterface.dropTable('gallery_referrals');
    await queryInterface.dropTable('gallery_donations');
    await queryInterface.dropTable('gallery_enhancement_requests');
    await queryInterface.dropTable('gallery_visitors');
    await queryInterface.dropTable('gallery_photos');
    await queryInterface.dropTable('gallery_events');
  },
};
