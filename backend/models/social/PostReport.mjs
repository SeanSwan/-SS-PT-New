/**
 * PostReport.mjs
 * ==============
 * 
 * Model for tracking user reports on social posts and comments
 * Supports content moderation and community guidelines enforcement
 */

import { DataTypes } from 'sequelize';
import db from '../../database.mjs';

const PostReport = db.define('PostReport', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  reporterId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'User who submitted the report'
  },
  contentType: {
    type: DataTypes.ENUM('post', 'comment'),
    allowNull: false,
    comment: 'Type of content being reported'
  },
  contentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID of the post or comment being reported'
  },
  contentAuthorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'Author of the reported content'
  },
  reason: {
    type: DataTypes.ENUM(
      'inappropriate-content',
      'harassment',
      'spam',
      'false-information',
      'copyright-violation',
      'adult-content',
      'violence',
      'hate-speech',
      'impersonation',
      'other'
    ),
    allowNull: false,
    comment: 'Reason for the report'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional details provided by the reporter'
  },
  status: {
    type: DataTypes.ENUM('pending', 'under-review', 'resolved', 'dismissed'),
    defaultValue: 'pending',
    allowNull: false,
    comment: 'Current status of the report'
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium',
    allowNull: false,
    comment: 'Priority level based on report content and history'
  },
  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the report was resolved'
  },
  resolvedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'Admin who resolved the report'
  },
  actionTaken: {
    type: DataTypes.ENUM(
      'no-action',
      'content-approved',
      'content-flagged',
      'content-removed',
      'user-warned',
      'user-suspended',
      'user-banned'
    ),
    allowNull: true,
    comment: 'Action taken after reviewing the report'
  },
  adminNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Internal notes from the admin review'
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
  tableName: 'PostReports',
  timestamps: true,
  indexes: [
    {
      fields: ['reporterId'],
      name: 'postreport_reporter_idx'
    },
    {
      fields: ['contentType', 'contentId'],
      name: 'postreport_content_idx'
    },
    {
      fields: ['contentAuthorId'],
      name: 'postreport_author_idx'
    },
    {
      fields: ['status'],
      name: 'postreport_status_idx'
    },
    {
      fields: ['priority'],
      name: 'postreport_priority_idx'
    },
    {
      fields: ['createdAt'],
      name: 'postreport_created_idx'
    }
  ]
});

// Instance methods
PostReport.prototype.resolve = async function(adminId, action, notes = null) {
  this.status = 'resolved';
  this.resolvedAt = new Date();
  this.resolvedBy = adminId;
  this.actionTaken = action;
  this.adminNotes = notes;
  return this.save();
};

PostReport.prototype.dismiss = async function(adminId, notes = null) {
  this.status = 'dismissed';
  this.resolvedAt = new Date();
  this.resolvedBy = adminId;
  this.actionTaken = 'no-action';
  this.adminNotes = notes;
  return this.save();
};

// Class methods
PostReport.getPendingReports = async function(options = {}) {
  const { limit = 50, offset = 0, priority = null } = options;
  
  const whereClause = { status: ['pending', 'under-review'] };
  if (priority) {
    whereClause.priority = priority;
  }
  
  return this.findAll({
    where: whereClause,
    limit,
    offset,
    order: [
      ['priority', 'DESC'], // High priority first
      ['createdAt', 'ASC']  // Oldest first within same priority
    ],
    include: [
      {
        model: db.models.User,
        as: 'reporter',
        attributes: ['id', 'firstName', 'lastName', 'email']
      },
      {
        model: db.models.User,
        as: 'contentAuthor',
        attributes: ['id', 'firstName', 'lastName', 'email']
      },
      {
        model: db.models.User,
        as: 'resolver',
        attributes: ['id', 'firstName', 'lastName', 'email'],
        required: false
      }
    ]
  });
};

PostReport.getReportsByContent = async function(contentType, contentId) {
  return this.findAll({
    where: {
      contentType,
      contentId
    },
    order: [['createdAt', 'DESC']],
    include: [
      {
        model: db.models.User,
        as: 'reporter',
        attributes: ['id', 'firstName', 'lastName', 'email']
      }
    ]
  });
};

PostReport.getUserReportHistory = async function(userId, options = {}) {
  const { limit = 20, offset = 0 } = options;
  
  return this.findAll({
    where: { reporterId: userId },
    limit,
    offset,
    order: [['createdAt', 'DESC']],
    include: [
      {
        model: db.models.User,
        as: 'contentAuthor',
        attributes: ['id', 'firstName', 'lastName']
      }
    ]
  });
};

PostReport.getContentAuthorReports = async function(authorId, options = {}) {
  const { limit = 20, offset = 0, status = null } = options;
  
  const whereClause = { contentAuthorId: authorId };
  if (status) {
    whereClause.status = status;
  }
  
  return this.findAll({
    where: whereClause,
    limit,
    offset,
    order: [['createdAt', 'DESC']],
    include: [
      {
        model: db.models.User,
        as: 'reporter',
        attributes: ['id', 'firstName', 'lastName']
      }
    ]
  });
};

export default PostReport;
