import { DataTypes } from 'sequelize';
import db from '../../database.mjs';

const SocialPost = db.define('SocialPost', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('general', 'workout', 'achievement', 'challenge', 'milestone'),
    defaultValue: 'general',
    allowNull: false
  },
  visibility: {
    type: DataTypes.ENUM('public', 'friends', 'private'),
    defaultValue: 'friends',
    allowNull: false
  },
  // === CONTENT MODERATION FIELDS ===
  moderationStatus: {
    type: DataTypes.ENUM('pending', 'approved', 'flagged', 'rejected', 'hidden'),
    defaultValue: 'approved', // Auto-approve by default, can be changed based on user trust level
    allowNull: false,
    comment: 'Current moderation status of the post'
  },
  flaggedReason: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Reason why the post was flagged'
  },
  flaggedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the post was flagged'
  },
  flaggedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'Admin who flagged the post'
  },
  reportsCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    comment: 'Number of user reports on this post'
  },
  autoModerated: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    comment: 'Whether this post was automatically moderated by AI/filters'
  },
  moderationScore: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0.0,
    allowNull: true,
    comment: 'AI moderation confidence score (0.0 - 1.0)'
  },
  moderationFlags: {
    type: DataTypes.JSON,
    defaultValue: [],
    allowNull: true,
    comment: 'Array of moderation flags detected by AI or users'
  },
  moderationNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Internal moderation notes from admins'
  },
  lastModeratedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the post was last reviewed by a moderator'
  },
  lastModeratedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'Last admin who reviewed the post'
  },
  // === ORIGINAL FIELDS ===
  // Optional references to other entities
  workoutSessionId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'MongoDB ObjectId reference to WorkoutSession'
  },
  achievementId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Achievements',
      key: 'id'
    }
  },
  userAchievementId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'UserAchievements',
      key: 'id'
    }
  },
  challengeId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  // For attaching photos to posts
  mediaUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  likesCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  commentsCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
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
  tableName: 'SocialPosts',
  timestamps: true,
  indexes: [
    {
      fields: ['userId'],
      name: 'socialpost_user_idx'
    },
    {
      fields: ['type'],
      name: 'socialpost_type_idx'
    },
    {
      fields: ['createdAt'],
      name: 'socialpost_created_idx'
    },
    // === NEW MODERATION INDEXES ===
    {
      fields: ['moderationStatus'],
      name: 'socialpost_moderation_status_idx'
    },
    {
      fields: ['reportsCount'],
      name: 'socialpost_reports_count_idx'
    },
    {
      fields: ['flaggedAt'],
      name: 'socialpost_flagged_at_idx'
    },
    {
      fields: ['autoModerated'],
      name: 'socialpost_auto_moderated_idx'
    },
    {
      fields: ['lastModeratedAt'],
      name: 'socialpost_last_moderated_idx'
    }
  ]
});

// === MODERATION INSTANCE METHODS ===
SocialPost.prototype.flagContent = async function(reason, flaggedByUserId, notes = null) {
  this.moderationStatus = 'flagged';
  this.flaggedReason = reason;
  this.flaggedAt = new Date();
  this.flaggedBy = flaggedByUserId;
  this.moderationNotes = notes;
  this.lastModeratedAt = new Date();
  this.lastModeratedBy = flaggedByUserId;
  return this.save();
};

SocialPost.prototype.approveContent = async function(approvedByUserId, notes = null) {
  this.moderationStatus = 'approved';
  this.flaggedReason = null;
  this.flaggedAt = null;
  this.flaggedBy = null;
  this.moderationNotes = notes;
  this.lastModeratedAt = new Date();
  this.lastModeratedBy = approvedByUserId;
  return this.save();
};

SocialPost.prototype.rejectContent = async function(reason, rejectedByUserId, notes = null) {
  this.moderationStatus = 'rejected';
  this.flaggedReason = reason;
  this.flaggedAt = new Date();
  this.flaggedBy = rejectedByUserId;
  this.moderationNotes = notes;
  this.lastModeratedAt = new Date();
  this.lastModeratedBy = rejectedByUserId;
  return this.save();
};

SocialPost.prototype.hideContent = async function(reason, hiddenByUserId, notes = null) {
  this.moderationStatus = 'hidden';
  this.flaggedReason = reason;
  this.flaggedAt = new Date();
  this.flaggedBy = hiddenByUserId;
  this.moderationNotes = notes;
  this.lastModeratedAt = new Date();
  this.lastModeratedBy = hiddenByUserId;
  return this.save();
};

SocialPost.prototype.incrementReports = async function() {
  this.reportsCount += 1;
  
  // Auto-flag if reports reach threshold
  if (this.reportsCount >= 3 && this.moderationStatus === 'approved') {
    this.moderationStatus = 'flagged';
    this.flaggedReason = 'Multiple user reports';
    this.flaggedAt = new Date();
    this.autoModerated = true;
  }
  
  return this.save();
};

// === MODERATION CLASS METHODS ===
SocialPost.getPendingModeration = async function(options = {}) {
  const { limit = 50, offset = 0 } = options;
  
  return this.findAll({
    where: {
      moderationStatus: ['pending', 'flagged']
    },
    limit,
    offset,
    order: [
      ['reportsCount', 'DESC'], // Most reported first
      ['flaggedAt', 'ASC']      // Oldest flags first
    ],
    include: [
      {
        model: db.models.User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'username', 'photo', 'email']
      },
      {
        model: db.models.User,
        as: 'flaggedByUser',
        attributes: ['id', 'firstName', 'lastName', 'email'],
        required: false
      }
    ]
  });
};

SocialPost.getContentForModeration = async function(options = {}) {
  const { 
    limit = 20, 
    offset = 0, 
    status = 'all',
    search = null,
    sortBy = 'createdAt',
    sortOrder = 'DESC'
  } = options;
  
  let whereClause = {};
  
  // Filter by moderation status
  if (status !== 'all') {
    whereClause.moderationStatus = status;
  }
  
  // Search in content
  if (search) {
    whereClause.content = {
      [db.Sequelize.Op.iLike]: `%${search}%`
    };
  }
  
  return this.findAll({
    where: whereClause,
    limit,
    offset,
    order: [[sortBy, sortOrder]],
    include: [
      {
        model: db.models.User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'username', 'photo', 'email']
      },
      {
        model: db.models.User,
        as: 'flaggedByUser',
        attributes: ['id', 'firstName', 'lastName', 'email'],
        required: false
      },
      {
        model: db.models.User,
        as: 'lastModeratedByUser',
        attributes: ['id', 'firstName', 'lastName', 'email'],
        required: false
      }
    ]
  });
};

SocialPost.getModerationStats = async function(days = 30) {
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - days);
  
  const stats = await this.findAll({
    where: {
      createdAt: {
        [db.Sequelize.Op.gte]: dateThreshold
      }
    },
    attributes: [
      'moderationStatus',
      [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count']
    ],
    group: ['moderationStatus'],
    raw: true
  });
  
  // Format stats object
  const formattedStats = {
    total: 0,
    pending: 0,
    approved: 0,
    flagged: 0,
    rejected: 0,
    hidden: 0
  };
  
  stats.forEach(stat => {
    formattedStats[stat.moderationStatus] = parseInt(stat.count);
    formattedStats.total += parseInt(stat.count);
  });
  
  return formattedStats;
};

// === ORIGINAL CLASS METHODS ===
SocialPost.createWorkoutPost = async function(userId, content, workoutSessionId, options = {}) {
  return this.create({
    userId,
    content,
    type: 'workout',
    workoutSessionId,
    visibility: options.visibility || 'friends',
    mediaUrl: options.mediaUrl,
    moderationStatus: 'approved' // Workout posts are generally safe
  });
};

SocialPost.createAchievementPost = async function(userId, achievementId, userAchievementId, options = {}) {
  // Fetch achievement name or details if needed to generate content
  let content = options.content || 'I just earned a new achievement!';
  
  return this.create({
    userId,
    content,
    type: 'achievement',
    achievementId,
    userAchievementId,
    visibility: options.visibility || 'public', // Achievements are public by default
    mediaUrl: options.mediaUrl,
    moderationStatus: 'approved' // Achievement posts are generally safe
  });
};

// Static methods for querying feed posts (updated for moderation)
SocialPost.getFeedForUser = async function(userId, options = {}) {
  const { limit = 20, offset = 0 } = options;
  
  // Get list of user's friends
  const friendships = await db.models.Friendship.findAll({
    where: {
      [db.Sequelize.Op.or]: [
        { requesterId: userId, status: 'accepted' },
        { recipientId: userId, status: 'accepted' }
      ]
    }
  });
  
  // Extract friend IDs
  const friendIds = friendships.map(f => 
    f.requesterId === userId ? f.recipientId : f.requesterId
  );
  
  // Include user's own posts and friends' posts
  const userIds = [userId, ...friendIds];
  
  return this.findAll({
    where: {
      [db.Sequelize.Op.and]: [
        {
          [db.Sequelize.Op.or]: [
            { userId: { [db.Sequelize.Op.in]: userIds } },
            { visibility: 'public' } // Also include public posts from non-friends
          ]
        },
        {
          moderationStatus: 'approved' // Only show approved content in feeds
        }
      ]
    },
    limit,
    offset,
    order: [['createdAt', 'DESC']], // Most recent first
    include: [
      {
        model: db.models.User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'username', 'photo']
      }
    ]
  });
};

export default SocialPost;
