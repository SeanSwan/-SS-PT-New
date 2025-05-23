import { DataTypes } from 'sequelize';
import db from '../../database.mjs';

const SocialComment = db.define('SocialComment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  postId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'SocialPosts',
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.UUID,
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
    }
  ]
});

// Add instance methods as needed
SocialComment.prototype.like = async function() {
  this.likesCount += 1;
  return this.save();
};

// Add class methods
SocialComment.getForPost = async function(postId, options = {}) {
  const { limit = 50, offset = 0 } = options;
  
  return this.findAll({
    where: { postId },
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
