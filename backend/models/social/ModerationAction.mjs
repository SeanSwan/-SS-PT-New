/**
 * ModerationAction.mjs
 * ====================
 * 
 * Model for tracking admin moderation actions and audit logging
 * Provides complete audit trail for content moderation decisions
 */

import { DataTypes } from 'sequelize';
import db from '../../database.mjs';

const ModerationAction = db.define('ModerationAction', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  moderatorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'Admin who performed the moderation action'
  },
  contentType: {
    type: DataTypes.ENUM('post', 'comment', 'user'),
    allowNull: false,
    comment: 'Type of content that was moderated'
  },
  contentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID of the moderated content'
  },
  contentAuthorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'Author of the moderated content'
  },
  action: {
    type: DataTypes.ENUM(
      'approve',
      'reject',
      'flag',
      'hide',
      'delete',
      'warn-user',
      'suspend-user',
      'ban-user',
      'restore'
    ),
    allowNull: false,
    comment: 'Action taken by the moderator'
  },
  previousStatus: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Previous status before moderation action'
  },
  newStatus: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'New status after moderation action'
  },
  reason: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Reason provided for the moderation action'
  },
  details: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional details or notes about the action'
  },
  relatedReportId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'PostReports',
      key: 'id'
    },
    comment: 'Report that triggered this action (if any)'
  },
  automaticAction: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    comment: 'Whether this was an automatic system action'
  },
  reversible: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: 'Whether this action can be reversed'
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'IP address of the moderator (for audit purposes)'
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'User agent of the moderator (for audit purposes)'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional metadata about the action'
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
  tableName: 'ModerationActions',
  timestamps: true,
  indexes: [
    {
      fields: ['moderatorId'],
      name: 'modaction_moderator_idx'
    },
    {
      fields: ['contentType', 'contentId'],
      name: 'modaction_content_idx'
    },
    {
      fields: ['contentAuthorId'],
      name: 'modaction_author_idx'
    },
    {
      fields: ['action'],
      name: 'modaction_action_idx'
    },
    {
      fields: ['automaticAction'],
      name: 'modaction_automatic_idx'
    },
    {
      fields: ['createdAt'],
      name: 'modaction_created_idx'
    },
    {
      fields: ['relatedReportId'],
      name: 'modaction_report_idx'
    }
  ]
});

// Instance methods
ModerationAction.prototype.canReverse = function() {
  return this.reversible && ['delete', 'ban-user', 'suspend-user'].includes(this.action);
};

// Class methods
ModerationAction.logAction = async function(actionData) {
  const {
    moderatorId,
    contentType,
    contentId,
    contentAuthorId,
    action,
    previousStatus,
    newStatus,
    reason,
    details,
    relatedReportId,
    automaticAction = false,
    ipAddress,
    userAgent,
    metadata
  } = actionData;

  return this.create({
    moderatorId,
    contentType,
    contentId,
    contentAuthorId,
    action,
    previousStatus,
    newStatus,
    reason,
    details,
    relatedReportId,
    automaticAction,
    ipAddress,
    userAgent,
    metadata
  });
};

ModerationAction.getModeratorHistory = async function(moderatorId, options = {}) {
  const { limit = 50, offset = 0, days = 30 } = options;
  
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - days);
  
  return this.findAll({
    where: {
      moderatorId,
      createdAt: {
        [db.Sequelize.Op.gte]: dateThreshold
      }
    },
    limit,
    offset,
    order: [['createdAt', 'DESC']],
    include: [
      {
        model: db.models.User,
        as: 'moderator',
        attributes: ['id', 'firstName', 'lastName', 'email']
      },
      {
        model: db.models.User,
        as: 'contentAuthor',
        attributes: ['id', 'firstName', 'lastName', 'email']
      }
    ]
  });
};

ModerationAction.getContentHistory = async function(contentType, contentId) {
  return this.findAll({
    where: {
      contentType,
      contentId
    },
    order: [['createdAt', 'ASC']],
    include: [
      {
        model: db.models.User,
        as: 'moderator',
        attributes: ['id', 'firstName', 'lastName', 'email']
      }
    ]
  });
};

ModerationAction.getActionStats = async function(options = {}) {
  const { days = 30, moderatorId = null } = options;
  
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - days);
  
  const whereClause = {
    createdAt: {
      [db.Sequelize.Op.gte]: dateThreshold
    }
  };
  
  if (moderatorId) {
    whereClause.moderatorId = moderatorId;
  }

  return this.findAll({
    where: whereClause,
    attributes: [
      'action',
      [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count']
    ],
    group: ['action'],
    order: [[db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'DESC']]
  });
};

ModerationAction.getUserModerationHistory = async function(userId, options = {}) {
  const { limit = 20, offset = 0 } = options;
  
  return this.findAll({
    where: { contentAuthorId: userId },
    limit,
    offset,
    order: [['createdAt', 'DESC']],
    include: [
      {
        model: db.models.User,
        as: 'moderator',
        attributes: ['id', 'firstName', 'lastName']
      }
    ]
  });
};

ModerationAction.getRecentActions = async function(options = {}) {
  const { limit = 100, hours = 24 } = options;
  
  const dateThreshold = new Date();
  dateThreshold.setHours(dateThreshold.getHours() - hours);
  
  return this.findAll({
    where: {
      createdAt: {
        [db.Sequelize.Op.gte]: dateThreshold
      }
    },
    limit,
    order: [['createdAt', 'DESC']],
    include: [
      {
        model: db.models.User,
        as: 'moderator',
        attributes: ['id', 'firstName', 'lastName', 'email']
      },
      {
        model: db.models.User,
        as: 'contentAuthor',
        attributes: ['id', 'firstName', 'lastName', 'email']
      }
    ]
  });
};

export default ModerationAction;
