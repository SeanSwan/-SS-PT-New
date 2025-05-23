import { DataTypes } from 'sequelize';
import db from '../../database.mjs';

const SocialLike = db.define('SocialLike', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  // The target can be either a post or a comment
  targetType: {
    type: DataTypes.ENUM('post', 'comment'),
    allowNull: false
  },
  targetId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'SocialLikes',
  timestamps: true,
  updatedAt: false, // We only need created timestamp
  indexes: [
    {
      unique: true,
      fields: ['userId', 'targetType', 'targetId'],
      name: 'unique_like'
    },
    {
      fields: ['targetType', 'targetId'],
      name: 'target_idx'
    }
  ]
});

// Class methods
SocialLike.likePost = async function(userId, postId) {
  // Check if like already exists
  const existingLike = await this.findOne({
    where: {
      userId,
      targetType: 'post',
      targetId: postId
    }
  });
  
  if (existingLike) {
    return existingLike;
  }
  
  // Create new like
  const like = await this.create({
    userId,
    targetType: 'post',
    targetId: postId
  });
  
  // Update post like count
  await db.models.SocialPost.increment('likesCount', {
    where: { id: postId }
  });
  
  return like;
};

SocialLike.unlikePost = async function(userId, postId) {
  const like = await this.findOne({
    where: {
      userId,
      targetType: 'post',
      targetId: postId
    }
  });
  
  if (!like) {
    return false;
  }
  
  // Delete the like
  await like.destroy();
  
  // Update post like count
  await db.models.SocialPost.decrement('likesCount', {
    where: { id: postId }
  });
  
  return true;
};

SocialLike.likeComment = async function(userId, commentId) {
  // Check if like already exists
  const existingLike = await this.findOne({
    where: {
      userId,
      targetType: 'comment',
      targetId: commentId
    }
  });
  
  if (existingLike) {
    return existingLike;
  }
  
  // Create new like
  const like = await this.create({
    userId,
    targetType: 'comment',
    targetId: commentId
  });
  
  // Update comment like count
  await db.models.SocialComment.increment('likesCount', {
    where: { id: commentId }
  });
  
  return like;
};

SocialLike.unlikeComment = async function(userId, commentId) {
  const like = await this.findOne({
    where: {
      userId,
      targetType: 'comment',
      targetId: commentId
    }
  });
  
  if (!like) {
    return false;
  }
  
  // Delete the like
  await like.destroy();
  
  // Update comment like count
  await db.models.SocialComment.decrement('likesCount', {
    where: { id: commentId }
  });
  
  return true;
};

export default SocialLike;
