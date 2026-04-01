/**
 * ============================================================================
 * MIGRATION: Create Community Event Tables
 * PURPOSE: SocialEvents, EventAttendances, EventDiscussions, EventPhotos
 * AUTHOR: Claude Opus 4.6 | CREATED: 2026-03-31
 * ============================================================================
 *
 * Creates the 4 event management tables with all indexes.
 * Uses constraints: false on optional FKs (Communities, WorkoutPlans, Challenges)
 * to avoid failures if those tables don't exist yet.
 */

'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ─────────────────────────────────────────────────────
    // TABLE 1: SocialEvents
    // ─────────────────────────────────────────────────────
    await queryInterface.createTable('SocialEvents', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      organizerId: { type: Sequelize.INTEGER, allowNull: false },
      coOrganizers: { type: Sequelize.JSON, defaultValue: [] },
      title: { type: Sequelize.STRING(200), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: false },
      shortDescription: { type: Sequelize.STRING(300), allowNull: true },
      category: {
        type: Sequelize.ENUM(
          'workout_class', 'group_training', 'running_club', 'yoga_session',
          'dance_class', 'cycling_group', 'hiking', 'swimming', 'martial_arts',
          'nutrition_workshop', 'wellness_seminar', 'mental_health', 'meditation',
          'competition', 'challenge', 'social_meetup', 'virtual_event',
          'outdoor_activity', 'fitness_bootcamp', 'sports_game', 'other'
        ),
        allowNull: false
      },
      subcategory: { type: Sequelize.STRING(100), allowNull: true },
      tags: { type: Sequelize.JSON, defaultValue: [] },
      fitnessLevel: { type: Sequelize.ENUM('beginner', 'intermediate', 'advanced', 'all_levels'), defaultValue: 'all_levels' },
      eventType: { type: Sequelize.ENUM('one_time', 'recurring', 'series'), defaultValue: 'one_time' },
      startDateTime: { type: Sequelize.DATE, allowNull: false },
      endDateTime: { type: Sequelize.DATE, allowNull: false },
      timezone: { type: Sequelize.STRING(50), defaultValue: 'UTC' },
      duration: { type: Sequelize.INTEGER, allowNull: false },
      isRecurring: { type: Sequelize.BOOLEAN, defaultValue: false },
      recurrencePattern: { type: Sequelize.JSON, defaultValue: null },
      recurrenceEndDate: { type: Sequelize.DATE, allowNull: true },
      maxOccurrences: { type: Sequelize.INTEGER, allowNull: true },
      locationType: { type: Sequelize.ENUM('in_person', 'virtual', 'hybrid'), allowNull: false },
      venue: { type: Sequelize.JSON, defaultValue: {} },
      virtualMeetingInfo: { type: Sequelize.JSON, defaultValue: null },
      address: { type: Sequelize.TEXT, allowNull: true },
      coordinates: { type: Sequelize.JSON, defaultValue: null },
      maxAttendees: { type: Sequelize.INTEGER, allowNull: true },
      currentAttendees: { type: Sequelize.INTEGER, defaultValue: 0 },
      waitlistEnabled: { type: Sequelize.BOOLEAN, defaultValue: true },
      waitlistCount: { type: Sequelize.INTEGER, defaultValue: 0 },
      registrationRequired: { type: Sequelize.BOOLEAN, defaultValue: true },
      registrationDeadline: { type: Sequelize.DATE, allowNull: true },
      approvalRequired: { type: Sequelize.BOOLEAN, defaultValue: false },
      registrationQuestions: { type: Sequelize.JSON, defaultValue: [] },
      isFree: { type: Sequelize.BOOLEAN, defaultValue: true },
      price: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0.00 },
      currency: { type: Sequelize.STRING(3), defaultValue: 'USD' },
      paymentRequired: { type: Sequelize.BOOLEAN, defaultValue: false },
      refundPolicy: { type: Sequelize.TEXT, allowNull: true },
      earlyBirdDiscount: { type: Sequelize.JSON, defaultValue: null },
      coverImage: { type: Sequelize.STRING, allowNull: true },
      images: { type: Sequelize.JSON, defaultValue: [] },
      videos: { type: Sequelize.JSON, defaultValue: [] },
      equipmentNeeded: { type: Sequelize.JSON, defaultValue: [] },
      skillsRequired: { type: Sequelize.JSON, defaultValue: [] },
      ageRestrictions: { type: Sequelize.JSON, defaultValue: {} },
      healthDisclaimer: { type: Sequelize.TEXT, allowNull: true },
      visibility: { type: Sequelize.ENUM('public', 'private', 'community_only', 'followers_only'), defaultValue: 'public' },
      allowDiscussion: { type: Sequelize.BOOLEAN, defaultValue: true },
      allowPhotoSharing: { type: Sequelize.BOOLEAN, defaultValue: true },
      communityId: { type: Sequelize.UUID, allowNull: true },
      views: { type: Sequelize.INTEGER, defaultValue: 0 },
      interested: { type: Sequelize.INTEGER, defaultValue: 0 },
      shares: { type: Sequelize.INTEGER, defaultValue: 0 },
      saves: { type: Sequelize.INTEGER, defaultValue: 0 },
      enableLiveStream: { type: Sequelize.BOOLEAN, defaultValue: false },
      liveStreamUrl: { type: Sequelize.STRING, allowNull: true },
      enableChat: { type: Sequelize.BOOLEAN, defaultValue: true },
      recordSession: { type: Sequelize.BOOLEAN, defaultValue: false },
      status: { type: Sequelize.ENUM('draft', 'published', 'live', 'completed', 'cancelled', 'postponed'), defaultValue: 'draft' },
      publishedAt: { type: Sequelize.DATE, allowNull: true },
      cancelledAt: { type: Sequelize.DATE, allowNull: true },
      cancellationReason: { type: Sequelize.TEXT, allowNull: true },
      allowFeedback: { type: Sequelize.BOOLEAN, defaultValue: true },
      averageRating: { type: Sequelize.DECIMAL(3, 2), defaultValue: 0.0 },
      ratingCount: { type: Sequelize.INTEGER, defaultValue: 0 },
      workoutPlanId: { type: Sequelize.UUID, allowNull: true },
      challengeId: { type: Sequelize.UUID, allowNull: true },
      aiTags: { type: Sequelize.JSON, defaultValue: [] },
      recommendationScore: { type: Sequelize.DECIMAL(5, 3), defaultValue: 0.0 },
      targetAudience: { type: Sequelize.JSON, defaultValue: {} },
      createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    // SocialEvents indexes
    await queryInterface.addIndex('SocialEvents', ['organizerId'], { name: 'social_events_organizer_idx' });
    await queryInterface.addIndex('SocialEvents', ['category'], { name: 'social_events_category_idx' });
    await queryInterface.addIndex('SocialEvents', ['startDateTime'], { name: 'social_events_start_idx' });
    await queryInterface.addIndex('SocialEvents', ['status'], { name: 'social_events_status_idx' });
    await queryInterface.addIndex('SocialEvents', ['visibility'], { name: 'social_events_visibility_idx' });
    await queryInterface.addIndex('SocialEvents', ['locationType'], { name: 'social_events_location_type_idx' });
    await queryInterface.addIndex('SocialEvents', ['category', 'startDateTime', 'status'], { name: 'social_events_discovery_idx' });

    // ─────────────────────────────────────────────────────
    // TABLE 2: EventAttendances
    // ─────────────────────────────────────────────────────
    await queryInterface.createTable('EventAttendances', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      eventId: { type: Sequelize.UUID, allowNull: false, references: { model: 'SocialEvents', key: 'id' }, onDelete: 'CASCADE' },
      userId: { type: Sequelize.INTEGER, allowNull: false },
      status: {
        type: Sequelize.ENUM('interested', 'going', 'maybe', 'not_going', 'waitlist', 'attended', 'no_show'),
        defaultValue: 'interested'
      },
      previousStatus: {
        type: Sequelize.ENUM('interested', 'going', 'maybe', 'not_going', 'waitlist'),
        allowNull: true
      },
      registeredAt: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      registrationAnswers: { type: Sequelize.JSON, defaultValue: {} },
      specialRequests: { type: Sequelize.TEXT, allowNull: true },
      paymentRequired: { type: Sequelize.BOOLEAN, defaultValue: false },
      paymentStatus: { type: Sequelize.ENUM('pending', 'paid', 'refunded', 'failed'), allowNull: true },
      amountPaid: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0.00 },
      ticketCode: { type: Sequelize.STRING(50), allowNull: true, unique: true },
      checkedIn: { type: Sequelize.BOOLEAN, defaultValue: false },
      checkInTime: { type: Sequelize.DATE, allowNull: true },
      checkInMethod: { type: Sequelize.ENUM('qr_code', 'manual', 'geolocation', 'automatic'), allowNull: true },
      attendanceVerified: { type: Sequelize.BOOLEAN, defaultValue: false },
      waitlistPosition: { type: Sequelize.INTEGER, allowNull: true },
      waitlistNotified: { type: Sequelize.BOOLEAN, defaultValue: false },
      waitlistExpiry: { type: Sequelize.DATE, allowNull: true },
      allowPublicVisibility: { type: Sequelize.BOOLEAN, defaultValue: true },
      shareOnTimeline: { type: Sequelize.BOOLEAN, defaultValue: false },
      invitedBy: { type: Sequelize.UUID, allowNull: true },
      enableReminders: { type: Sequelize.BOOLEAN, defaultValue: true },
      enableUpdates: { type: Sequelize.BOOLEAN, defaultValue: true },
      preferredContactMethod: { type: Sequelize.ENUM('email', 'sms', 'push', 'in_app'), defaultValue: 'in_app' },
      feedback: { type: Sequelize.TEXT, allowNull: true },
      rating: { type: Sequelize.INTEGER, allowNull: true },
      feedbackSubmittedAt: { type: Sequelize.DATE, allowNull: true },
      wouldRecommend: { type: Sequelize.BOOLEAN, allowNull: true },
      openToNetworking: { type: Sequelize.BOOLEAN, defaultValue: true },
      connectionsRequested: { type: Sequelize.JSON, defaultValue: [] },
      connectionsAccepted: { type: Sequelize.JSON, defaultValue: [] },
      cancelledAt: { type: Sequelize.DATE, allowNull: true },
      cancellationReason: { type: Sequelize.STRING(200), allowNull: true },
      refundRequested: { type: Sequelize.BOOLEAN, defaultValue: false },
      refundAmount: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    await queryInterface.addIndex('EventAttendances', ['eventId', 'userId'], { unique: true, name: 'unique_event_attendance' });
    await queryInterface.addIndex('EventAttendances', ['eventId'], { name: 'event_attendances_event_idx' });
    await queryInterface.addIndex('EventAttendances', ['userId'], { name: 'event_attendances_user_idx' });
    await queryInterface.addIndex('EventAttendances', ['status'], { name: 'event_attendances_status_idx' });

    // ─────────────────────────────────────────────────────
    // TABLE 3: EventDiscussions
    // ─────────────────────────────────────────────────────
    await queryInterface.createTable('EventDiscussions', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      eventId: { type: Sequelize.UUID, allowNull: false, references: { model: 'SocialEvents', key: 'id' }, onDelete: 'CASCADE' },
      userId: { type: Sequelize.INTEGER, allowNull: false },
      parentId: { type: Sequelize.UUID, allowNull: true },
      content: { type: Sequelize.TEXT, allowNull: false },
      messageType: { type: Sequelize.ENUM('comment', 'question', 'announcement', 'update'), defaultValue: 'comment' },
      images: { type: Sequelize.JSON, defaultValue: [] },
      files: { type: Sequelize.JSON, defaultValue: [] },
      likes: { type: Sequelize.INTEGER, defaultValue: 0 },
      replies: { type: Sequelize.INTEGER, defaultValue: 0 },
      isModerated: { type: Sequelize.BOOLEAN, defaultValue: false },
      moderatedBy: { type: Sequelize.UUID, allowNull: true },
      moderationReason: { type: Sequelize.STRING, allowNull: true },
      isPinned: { type: Sequelize.BOOLEAN, defaultValue: false },
      isOrganizerPost: { type: Sequelize.BOOLEAN, defaultValue: false },
      isImportant: { type: Sequelize.BOOLEAN, defaultValue: false },
      createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    await queryInterface.addIndex('EventDiscussions', ['eventId'], { name: 'event_discussions_event_idx' });
    await queryInterface.addIndex('EventDiscussions', ['userId'], { name: 'event_discussions_user_idx' });
    await queryInterface.addIndex('EventDiscussions', ['eventId', 'createdAt'], { name: 'event_discussions_timeline_idx' });

    // ─────────────────────────────────────────────────────
    // TABLE 4: EventPhotos
    // ─────────────────────────────────────────────────────
    await queryInterface.createTable('EventPhotos', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      eventId: { type: Sequelize.UUID, allowNull: false, references: { model: 'SocialEvents', key: 'id' }, onDelete: 'CASCADE' },
      userId: { type: Sequelize.INTEGER, allowNull: false },
      imageUrl: { type: Sequelize.STRING, allowNull: false },
      thumbnailUrl: { type: Sequelize.STRING, allowNull: true },
      caption: { type: Sequelize.TEXT, allowNull: true },
      photoType: { type: Sequelize.ENUM('before', 'during', 'after', 'group', 'achievement', 'venue'), defaultValue: 'during' },
      takenAt: { type: Sequelize.DATE, allowNull: true },
      location: { type: Sequelize.JSON, defaultValue: null },
      visibility: { type: Sequelize.ENUM('public', 'event_attendees', 'private'), defaultValue: 'event_attendees' },
      allowDownload: { type: Sequelize.BOOLEAN, defaultValue: true },
      taggedUsers: { type: Sequelize.JSON, defaultValue: [] },
      likes: { type: Sequelize.INTEGER, defaultValue: 0 },
      comments: { type: Sequelize.INTEGER, defaultValue: 0 },
      isApproved: { type: Sequelize.BOOLEAN, defaultValue: true },
      moderationRequired: { type: Sequelize.BOOLEAN, defaultValue: false },
      uploadedAt: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    await queryInterface.addIndex('EventPhotos', ['eventId'], { name: 'event_photos_event_idx' });
    await queryInterface.addIndex('EventPhotos', ['userId'], { name: 'event_photos_user_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('EventPhotos');
    await queryInterface.dropTable('EventDiscussions');
    await queryInterface.dropTable('EventAttendances');
    await queryInterface.dropTable('SocialEvents');
  }
};
