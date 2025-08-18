import { DataTypes } from 'sequelize';
import db from '../../database.mjs';

const SocialComment = db.define('SocialComment', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  postId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'SocialPosts',
      key: 'id'
    }
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
  // === CONTENT MODERATION FIELDS ===
  moderationStatus: {
    type: DataTypes.ENUM('pending', 'approved', 'flagged', 'rejected', 'hidden'),
    defaultValue: 'approved', // Auto-approve by default, can be changed based on user trust level
    allowNull: false,
    comment: 'Current moderation status of the comment'
  },
  flaggedReason: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Reason why the comment was flagged'
  },
  flaggedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the comment was flagged'
  },
  flaggedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'Admin who flagged the comment'
  },
  reportsCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    comment: 'Number of user reports on this comment'
  },
  autoModerated: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    comment: 'Whether this comment was automatically moderated by AI/filters'
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
    comment: 'When the comment was last reviewed by a moderator'
  },
  lastModeratedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'Last admin who reviewed the comment'
  },
  // === ORIGINAL FIELDS ===
  likesCount: {
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
  tableName: 'SocialComments',
  timestamps: true,
  indexes: [
    {
      fields: ['postId'],
      name: 'socialcomment_post_idx'
    },
    {
      fields: ['userId'],
      name: 'socialcomment_user_idx'
    },
    // === NEW MODERATION INDEXES ===
    {
      fields: ['moderationStatus'],
      name: 'socialcomment_moderation_status_idx'
    },
    {
      fields: ['reportsCount'],
      name: 'socialcomment_reports_count_idx'
    },
    {
      fields: ['flaggedAt'],
      name: 'socialcomment_flagged_at_idx'
    },
    {
      fields: ['autoModerated'],
      name: 'socialcomment_auto_moderated_idx'
    },
    {
      fields: ['lastModeratedAt'],
      name: 'socialcomment_last_moderated_idx'
    }
  ]
});

// === MODERATION INSTANCE METHODS ===
SocialComment.prototype.flagContent = async function(reason, flaggedByUserId, notes = null) {
  this.moderationStatus = 'flagged';
  this.flaggedReason = reason;
  this.flaggedAt = new Date();
  this.flaggedBy = flaggedByUserId;
  this.moderationNotes = notes;
  this.lastModeratedAt = new Date();
  this.lastModeratedBy = flaggedByUserId;
  return this.save();
};

SocialComment.prototype.approveContent = async function(approvedByUserId, notes = null) {
  this.moderationStatus = 'approved';
  this.flaggedReason = null;
  this.flaggedAt = null;
  this.flaggedBy = null;
  this.moderationNotes = notes;
  this.lastModeratedAt = new Date();
  this.lastModeratedBy = approvedByUserId;
  return this.save();
};

SocialComment.prototype.rejectContent = async function(reason, rejectedByUserId, notes = null) {
  this.moderationStatus = 'rejected';
  this.flaggedReason = reason;
  this.flaggedAt = new Date();
  this.flaggedBy = rejectedByUserId;
  this.moderationNotes = notes;
  this.lastModeratedAt = new Date();
  this.lastModeratedBy = rejectedByUserId;
  return this.save();
};

SocialComment.prototype.hideContent = async function(reason, hiddenByUserId, notes = null) {
  this.moderationStatus = 'hidden';
  this.flaggedReason = reason;
  this.flaggedAt = new Date();
  this.flaggedBy = hiddenByUserId;
  this.moderationNotes = notes;
  this.lastModeratedAt = new Date();
  this.lastModeratedBy = hiddenByUserId;
  return this.save();
};

SocialComment.prototype.incrementReports = async function() {
  this.reportsCount += 1;
  
  // Auto-flag if reports reach threshold
  if (this.reportsCount >= 2 && this.moderationStatus === 'approved') {
    this.moderationStatus = 'flagged';
    this.flaggedReason = 'Multiple user reports';
    this.flaggedAt = new Date();
    this.autoModerated = true;
  }
  
  return this.save();
};

// === MODERATION CLASS METHODS ===
SocialComment.getPendingModeration = async function(options = {}) {
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
        model: db.models.SocialPost,
        as: 'post',
        attributes: ['id', 'content', 'type']
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

SocialComment.getContentForModeration = async function(options = {}) {
  const { 
    limit = 20, 
    offset = 0, 
    status = 'all',
    search = null,
    postId = null,
    sortBy = 'createdAt',
    sortOrder = 'DESC'
  } = options;
  
  let whereClause = {};
  
  // Filter by moderation status
  if (status !== 'all') {
    whereClause.moderationStatus = status;
  }
  
  // Filter by post
  if (postId) {
    whereClause.postId = postId;
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
        model: db.models.SocialPost,
        as: 'post',
        attributes: ['id', 'content', 'type'],
        include: [
          {
            model: db.models.User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName']
          }
        ]
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

SocialComment.getModerationStats = async function(days = 30) {
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

// === ORIGINAL METHODS (UPDATED FOR MODERATION) ===
// Add instance methods as needed
SocialComment.prototype.like = async function() {
  this.likesCount += 1;
  return this.save();
};

// Add class methods (updated to only show approved comments)
SocialComment.getForPost = async function(postId, options = {}) {
  const { limit = 50, offset = 0, includeModerated = false } = options;
  
  let whereClause = { postId };
  
  // Only show approved comments unless specifically requested
  if (!includeModerated) {
    whereClause.moderationStatus = 'approved';
  }
  
  return this.findAll({
    where: whereClause,
    limit,
    offset,
    order: [['createdAt', 'ASC']], // Oldest first
    include: [
      {
        model: db.models.User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'username', 'photo']
      }
    ]
  });
};

export default SocialComment;
