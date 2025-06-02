/**
 * EVENT & MEETUP MANAGEMENT MODELS - 7-STAR SOCIAL MEDIA
 * =======================================================
 * Advanced event system for fitness meetups, virtual workouts,
 * community gatherings, and live experiences with RSVP management.
 */

import { DataTypes } from 'sequelize';
import db from '../../../database.mjs';

// SOCIAL EVENT MODEL
// ==================
const SocialEvent = db.define('SocialEvent', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // EVENT OWNERSHIP
  // ===============
  organizerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  coOrganizers: {
    type: DataTypes.JSON, // Array of co-organizer user IDs
    defaultValue: []
  },
  
  // BASIC EVENT INFO
  // ================
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      len: [3, 200]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: [10, 5000]
    }
  },
  shortDescription: {
    type: DataTypes.STRING(300),
    allowNull: true
  },
  
  // EVENT CATEGORIZATION
  // ====================
  category: {
    type: DataTypes.ENUM(
      'workout_class', 'group_training', 'running_club', 'yoga_session',
      'dance_class', 'cycling_group', 'hiking', 'swimming', 'martial_arts',
      'nutrition_workshop', 'wellness_seminar', 'mental_health', 'meditation',
      'competition', 'challenge', 'social_meetup', 'virtual_event',
      'outdoor_activity', 'fitness_bootcamp', 'sports_game', 'other'
    ),
    allowNull: false
  },
  subcategory: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  tags: {
    type: DataTypes.JSON, // Event tags for discovery
    defaultValue: []
  },
  fitnessLevel: {
    type: DataTypes.ENUM('beginner', 'intermediate', 'advanced', 'all_levels'),
    defaultValue: 'all_levels'
  },
  
  // EVENT SCHEDULING
  // ================
  eventType: {
    type: DataTypes.ENUM('one_time', 'recurring', 'series'),
    defaultValue: 'one_time'
  },
  startDateTime: {
    type: DataTypes.DATE,
    allowNull: false
  },
  endDateTime: {
    type: DataTypes.DATE,
    allowNull: false
  },
  timezone: {
    type: DataTypes.STRING(50),
    defaultValue: 'UTC'
  },
  duration: {
    type: DataTypes.INTEGER, // Duration in minutes
    allowNull: false
  },
  
  // RECURRING EVENT SETTINGS
  // =========================
  isRecurring: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  recurrencePattern: {
    type: DataTypes.JSON, // Recurrence rules
    defaultValue: null
    // Format: { frequency: 'weekly', interval: 1, daysOfWeek: [1,3,5], endDate: '2024-12-31' }
  },
  recurrenceEndDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  maxOccurrences: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  
  // LOCATION & VENUE
  // ================
  locationType: {
    type: DataTypes.ENUM('in_person', 'virtual', 'hybrid'),
    allowNull: false
  },
  venue: {
    type: DataTypes.JSON, // Venue details
    defaultValue: {}
    // Format: { name: '', address: '', coordinates: {lat, lng}, capacity: 0 }
  },
  virtualMeetingInfo: {
    type: DataTypes.JSON, // Virtual meeting details
    defaultValue: null
    // Format: { platform: 'zoom', url: '', meetingId: '', password: '' }
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  coordinates: {
    type: DataTypes.JSON, // Latitude/longitude
    defaultValue: null
  },
  
  // CAPACITY & REGISTRATION
  // =======================
  maxAttendees: {
    type: DataTypes.INTEGER,
    allowNull: true // Null = unlimited
  },
  currentAttendees: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  waitlistEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  waitlistCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  // REGISTRATION SETTINGS
  // =====================
  registrationRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  registrationDeadline: {
    type: DataTypes.DATE,
    allowNull: true
  },
  approvalRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  registrationQuestions: {
    type: DataTypes.JSON, // Custom registration questions
    defaultValue: []
  },
  
  // PRICING & PAYMENT
  // =================
  isFree: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'USD'
  },
  paymentRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  refundPolicy: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  earlyBirdDiscount: {
    type: DataTypes.JSON, // Early bird pricing
    defaultValue: null
  },
  
  // VISUAL CONTENT
  // ==============
  coverImage: {
    type: DataTypes.STRING,
    allowNull: true
  },
  images: {
    type: DataTypes.JSON, // Additional event images
    defaultValue: []
  },
  videos: {
    type: DataTypes.JSON, // Event preview videos
    defaultValue: []
  },
  
  // EVENT REQUIREMENTS
  // ==================
  equipmentNeeded: {
    type: DataTypes.JSON, // Required equipment
    defaultValue: []
  },
  skillsRequired: {
    type: DataTypes.JSON, // Required skills
    defaultValue: []
  },
  ageRestrictions: {
    type: DataTypes.JSON, // Age requirements
    defaultValue: {}
  },
  healthDisclaimer: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // SOCIAL FEATURES
  // ===============
  visibility: {
    type: DataTypes.ENUM('public', 'private', 'community_only', 'followers_only'),
    defaultValue: 'public'
  },
  allowDiscussion: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  allowPhotoSharing: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  communityId: {
    type: DataTypes.UUID,
    allowNull: true, // Associated community
    references: {
      model: 'Communities',
      key: 'id'
    }
  },
  
  // ENGAGEMENT METRICS
  // ==================
  views: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  interested: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  shares: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  saves: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  // LIVE FEATURES
  // =============
  enableLiveStream: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  liveStreamUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  enableChat: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  recordSession: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  // EVENT STATUS & MANAGEMENT
  // =========================
  status: {
    type: DataTypes.ENUM('draft', 'published', 'live', 'completed', 'cancelled', 'postponed'),
    defaultValue: 'draft'
  },
  publishedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cancelledAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cancellationReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // FEEDBACK & RATINGS
  // ==================
  allowFeedback: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  averageRating: {
    type: DataTypes.DECIMAL(3, 2), // 0-5 stars
    defaultValue: 0.0
  },
  ratingCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  // RELATED CONTENT
  // ===============
  workoutPlanId: {
    type: DataTypes.UUID,
    allowNull: true, // Associated workout plan
    references: {
      model: 'WorkoutPlans',
      key: 'id'
    }
  },
  challengeId: {
    type: DataTypes.UUID,
    allowNull: true, // Associated challenge
    references: {
      model: 'Challenges',
      key: 'id'
    }
  },
  
  // AI & RECOMMENDATIONS
  // ====================
  aiTags: {
    type: DataTypes.JSON, // AI-generated tags
    defaultValue: []
  },
  recommendationScore: {
    type: DataTypes.DECIMAL(5, 3),
    defaultValue: 0.0
  },
  targetAudience: {
    type: DataTypes.JSON, // AI-defined target audience
    defaultValue: {}
  },
  
  // TIMESTAMPS
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'SocialEvents',
  timestamps: true,
  indexes: [
    { fields: ['organizerId'], name: 'social_events_organizer_idx' },
    { fields: ['category'], name: 'social_events_category_idx' },
    { fields: ['startDateTime'], name: 'social_events_start_idx' },
    { fields: ['endDateTime'], name: 'social_events_end_idx' },
    { fields: ['status'], name: 'social_events_status_idx' },
    { fields: ['visibility'], name: 'social_events_visibility_idx' },
    { fields: ['locationType'], name: 'social_events_location_type_idx' },
    { fields: ['fitnessLevel'], name: 'social_events_fitness_level_idx' },
    { fields: ['isFree'], name: 'social_events_free_idx' },
    { fields: ['communityId'], name: 'social_events_community_idx' },
    { fields: ['averageRating'], name: 'social_events_rating_idx' },
    {
      fields: ['category', 'startDateTime', 'status'],
      name: 'social_events_discovery_idx'
    },
    {
      fields: ['locationType', 'coordinates'],
      name: 'social_events_location_idx'
    }
  ]
});

// EVENT ATTENDANCE MODEL
// ======================
const EventAttendance = db.define('EventAttendance', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  eventId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'SocialEvents',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  
  // ATTENDANCE STATUS
  // =================
  status: {
    type: DataTypes.ENUM('interested', 'going', 'maybe', 'not_going', 'waitlist', 'attended', 'no_show'),
    defaultValue: 'interested'
  },
  previousStatus: {
    type: DataTypes.ENUM('interested', 'going', 'maybe', 'not_going', 'waitlist'),
    allowNull: true
  },
  
  // REGISTRATION DETAILS
  // ====================
  registeredAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  registrationAnswers: {
    type: DataTypes.JSON, // Answers to registration questions
    defaultValue: {}
  },
  specialRequests: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // PAYMENT & TICKETS
  // =================
  paymentRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'paid', 'refunded', 'failed'),
    allowNull: true
  },
  amountPaid: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  ticketCode: {
    type: DataTypes.STRING(50),
    allowNull: true,
    unique: true
  },
  
  // CHECK-IN & ATTENDANCE
  // =====================
  checkedIn: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  checkInTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  checkInMethod: {
    type: DataTypes.ENUM('qr_code', 'manual', 'geolocation', 'automatic'),
    allowNull: true
  },
  attendanceVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  // WAITLIST MANAGEMENT
  // ===================
  waitlistPosition: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  waitlistNotified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  waitlistExpiry: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // SOCIAL FEATURES
  // ===============
  allowPublicVisibility: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  shareOnTimeline: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  invitedBy: {
    type: DataTypes.UUID,
    allowNull: true, // User who invited this attendee
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  
  // COMMUNICATION PREFERENCES
  // ==========================
  enableReminders: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  enableUpdates: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  preferredContactMethod: {
    type: DataTypes.ENUM('email', 'sms', 'push', 'in_app'),
    defaultValue: 'in_app'
  },
  
  // FEEDBACK & RATING
  // =================
  feedback: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 5
    }
  },
  feedbackSubmittedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  wouldRecommend: {
    type: DataTypes.BOOLEAN,
    allowNull: true
  },
  
  // NETWORKING & CONNECTIONS
  // =========================
  openToNetworking: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  connectionsRequested: {
    type: DataTypes.JSON, // User IDs of connection requests made
    defaultValue: []
  },
  connectionsAccepted: {
    type: DataTypes.JSON, // User IDs of connections made
    defaultValue: []
  },
  
  // CANCELLATION & REFUNDS
  // ======================
  cancelledAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cancellationReason: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  refundRequested: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  refundAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'EventAttendances',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['eventId', 'userId'],
      name: 'unique_event_attendance'
    },
    { fields: ['eventId'], name: 'event_attendances_event_idx' },
    { fields: ['userId'], name: 'event_attendances_user_idx' },
    { fields: ['status'], name: 'event_attendances_status_idx' },
    { fields: ['checkedIn'], name: 'event_attendances_checkin_idx' },
    { fields: ['paymentStatus'], name: 'event_attendances_payment_idx' },
    { fields: ['waitlistPosition'], name: 'event_attendances_waitlist_idx' },
    { fields: ['registeredAt'], name: 'event_attendances_registered_idx' }
  ]
});

// EVENT DISCUSSION MODEL
// ======================
const EventDiscussion = db.define('EventDiscussion', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  eventId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'SocialEvents',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  parentId: {
    type: DataTypes.UUID,
    allowNull: true, // For threaded discussions
    references: {
      model: 'EventDiscussions',
      key: 'id'
    }
  },
  
  // MESSAGE CONTENT
  // ===============
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: [1, 2000]
    }
  },
  messageType: {
    type: DataTypes.ENUM('comment', 'question', 'announcement', 'update'),
    defaultValue: 'comment'
  },
  
  // MEDIA ATTACHMENTS
  // =================
  images: {
    type: DataTypes.JSON, // Image attachments
    defaultValue: []
  },
  files: {
    type: DataTypes.JSON, // File attachments
    defaultValue: []
  },
  
  // ENGAGEMENT
  // ==========
  likes: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  replies: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  // MODERATION
  // ==========
  isModerated: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  moderatedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  moderationReason: {
    type: DataTypes.STRING,
    allowNull: true
  },
  
  // SPECIAL FLAGS
  // =============
  isPinned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isOrganizerPost: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isImportant: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'EventDiscussions',
  timestamps: true,
  indexes: [
    { fields: ['eventId'], name: 'event_discussions_event_idx' },
    { fields: ['userId'], name: 'event_discussions_user_idx' },
    { fields: ['parentId'], name: 'event_discussions_parent_idx' },
    { fields: ['messageType'], name: 'event_discussions_type_idx' },
    { fields: ['isPinned'], name: 'event_discussions_pinned_idx' },
    { fields: ['createdAt'], name: 'event_discussions_created_idx' },
    {
      fields: ['eventId', 'createdAt'],
      name: 'event_discussions_timeline_idx'
    }
  ]
});

// EVENT PHOTO MODEL
// =================
const EventPhoto = db.define('EventPhoto', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  eventId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'SocialEvents',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  
  // PHOTO DETAILS
  // =============
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: false
  },
  thumbnailUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  caption: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // PHOTO METADATA
  // ==============
  photoType: {
    type: DataTypes.ENUM('before', 'during', 'after', 'group', 'achievement', 'venue'),
    defaultValue: 'during'
  },
  takenAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  location: {
    type: DataTypes.JSON, // Photo location data
    defaultValue: null
  },
  
  // PRIVACY & SHARING
  // =================
  visibility: {
    type: DataTypes.ENUM('public', 'event_attendees', 'private'),
    defaultValue: 'event_attendees'
  },
  allowDownload: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  taggedUsers: {
    type: DataTypes.JSON, // Array of tagged user IDs
    defaultValue: []
  },
  
  // ENGAGEMENT
  // ==========
  likes: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  comments: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  // MODERATION
  // ==========
  isApproved: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  moderationRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  uploadedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'EventPhotos',
  timestamps: false, // Using custom uploadedAt
  indexes: [
    { fields: ['eventId'], name: 'event_photos_event_idx' },
    { fields: ['userId'], name: 'event_photos_user_idx' },
    { fields: ['photoType'], name: 'event_photos_type_idx' },
    { fields: ['visibility'], name: 'event_photos_visibility_idx' },
    { fields: ['uploadedAt'], name: 'event_photos_uploaded_idx' },
    { fields: ['likes'], name: 'event_photos_likes_idx' }
  ]
});

// =====================
// CLASS METHODS
// =====================

/**
 * Create a new event
 */
SocialEvent.createEvent = async function(organizerId, eventData) {
  const event = await this.create({
    ...eventData,
    organizerId,
    status: 'draft'
  });
  
  // Auto-register organizer as attending
  await EventAttendance.create({
    eventId: event.id,
    userId: organizerId,
    status: 'going',
    checkInMethod: 'automatic'
  });
  
  return event;
};

/**
 * Get upcoming events
 */
SocialEvent.getUpcomingEvents = async function(options = {}) {
  const { 
    limit = 20, 
    category = null, 
    locationType = null,
    location = null,
    radius = 50 // km
  } = options;
  
  const whereClause = {
    status: 'published',
    startDateTime: { [db.Sequelize.Op.gte]: new Date() }
  };
  
  if (category) {
    whereClause.category = category;
  }
  
  if (locationType) {
    whereClause.locationType = locationType;
  }
  
  return this.findAll({
    where: whereClause,
    limit,
    order: [['startDateTime', 'ASC']],
    include: [
      {
        model: db.models.User,
        as: 'organizer',
        attributes: ['id', 'firstName', 'lastName', 'username', 'photo', 'isVerified']
      }
    ]
  });
};

/**
 * Register for event
 */
EventAttendance.registerForEvent = async function(eventId, userId, registrationData = {}) {
  const event = await SocialEvent.findByPk(eventId);
  if (!event) {
    throw new Error('Event not found');
  }
  
  // Check if already registered
  const existing = await this.findOne({
    where: { eventId, userId }
  });
  
  if (existing) {
    throw new Error('User already registered for this event');
  }
  
  // Check capacity
  if (event.maxAttendees && event.currentAttendees >= event.maxAttendees) {
    if (event.waitlistEnabled) {
      return this.create({
        eventId,
        userId,
        status: 'waitlist',
        ...registrationData
      });
    } else {
      throw new Error('Event is full');
    }
  }
  
  // Register user
  const attendance = await this.create({
    eventId,
    userId,
    status: registrationData.status || 'going',
    registrationAnswers: registrationData.answers || {},
    specialRequests: registrationData.specialRequests
  });
  
  // Update event attendee count
  await event.increment('currentAttendees');
  
  return attendance;
};

/**
 * Check in to event
 */
EventAttendance.checkIn = async function(eventId, userId, checkInMethod = 'manual') {
  const attendance = await this.findOne({
    where: { eventId, userId, status: 'going' }
  });
  
  if (!attendance) {
    throw new Error('User not registered for this event');
  }
  
  return attendance.update({
    checkedIn: true,
    checkInTime: new Date(),
    checkInMethod,
    status: 'attended'
  });
};

/**
 * Get event analytics
 */
SocialEvent.getAnalytics = async function(eventId) {
  const event = await this.findByPk(eventId);
  if (!event) {
    throw new Error('Event not found');
  }
  
  const [attendanceStats, discussions, photos] = await Promise.all([
    EventAttendance.findAll({
      where: { eventId },
      attributes: [
        'status',
        [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count']
      ],
      group: ['status']
    }),
    EventDiscussion.count({ where: { eventId } }),
    EventPhoto.count({ where: { eventId } })
  ]);
  
  const attendance = attendanceStats.reduce((acc, stat) => {
    acc[stat.status] = stat.dataValues.count;
    return acc;
  }, {});
  
  return {
    event: event.toJSON(),
    attendance,
    totalDiscussions: discussions,
    totalPhotos: photos,
    engagementRate: calculateEngagementRate(event, attendance)
  };
};

// ===================
// HELPER FUNCTIONS
// ===================

function calculateEngagementRate(event, attendance) {
  const totalInterested = (attendance.interested || 0) + (attendance.going || 0) + (attendance.maybe || 0);
  return totalInterested > 0 ? ((attendance.attended || 0) / totalInterested) * 100 : 0;
}

export { SocialEvent, EventAttendance, EventDiscussion, EventPhoto };
