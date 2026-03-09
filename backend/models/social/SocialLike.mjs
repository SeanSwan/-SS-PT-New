import { DataTypes, Op } from 'sequelize';
import db from '../../database.mjs';

const SocialLike = db.define('SocialLike', {
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
  // The target can be either a post or a comment
  targetType: {
    type: DataTypes.ENUM('post', 'comment'),
    allowNull: false
  },
  targetId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  // Reaction type: thumbs_up, heart, or swan
  reactionType: {
    type: DataTypes.STRING(16),
    allowNull: false,
    defaultValue: 'swan',
    validate: {
      isIn: [['thumbs_up', 'heart', 'swan']]
    }
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
      fields: ['userId', 'targetType', 'targetId', 'reactionType'],
      name: 'unique_reaction'
    },
    {
      fields: ['targetType', 'targetId'],
      name: 'target_idx'
    }
  ]
});

// Class methods
SocialLike.reactToPost = async function(userId, postId, reactionType = 'swan') {
  // Check if this exact reaction already exists
  const existingReaction = await this.findOne({
    where: {
      userId,
      targetType: 'post',
      targetId: postId,
      reactionType
    }
  });

  if (existingReaction) {
    return { reaction: existingReaction, alreadyExists: true };
  }

  // Create new reaction
  const reaction = await this.create({
    userId,
    targetType: 'post',
    targetId: postId,
    reactionType
  });

  // Update post like count (total reactions)
  await db.models.SocialPost.increment('likesCount', {
    where: { id: postId }
  });

  return { reaction, alreadyExists: false };
};

SocialLike.removeReaction = async function(userId, postId, reactionType = 'swan') {
  const reaction = await this.findOne({
    where: {
      userId,
      targetType: 'post',
      targetId: postId,
      reactionType
    }
  });

  if (!reaction) {
    return false;
  }

  await reaction.destroy();

  // Update post like count
  await db.models.SocialPost.decrement('likesCount', {
    where: { id: postId }
  });

  return true;
};

// Legacy compat — used by existing code
SocialLike.likePost = async function(userId, postId) {
  const result = await this.reactToPost(userId, postId, 'swan');
  return result.reaction;
};

SocialLike.unlikePost = async function(userId, postId) {
  return this.removeReaction(userId, postId, 'swan');
};

// Get reaction breakdown for a set of post IDs
SocialLike.getReactionCounts = async function(postIds) {
  // Op imported at top
  const counts = await this.findAll({
    attributes: [
      'targetId',
      'reactionType',
      [db.fn('COUNT', db.col('id')), 'count']
    ],
    where: {
      targetType: 'post',
      targetId: { [Op.in]: postIds }
    },
    group: ['targetId', 'reactionType'],
    raw: true
  });

  // Build map: { postId: { thumbs_up: N, heart: N, swan: N } }
  const result = {};
  for (const row of counts) {
    if (!result[row.targetId]) {
      result[row.targetId] = { thumbs_up: 0, heart: 0, swan: 0 };
    }
    result[row.targetId][row.reactionType] = parseInt(row.count);
  }
  return result;
};

// Get user's reactions for a set of post IDs
SocialLike.getUserReactions = async function(userId, postIds) {
  // Op imported at top
  const reactions = await this.findAll({
    where: {
      userId,
      targetType: 'post',
      targetId: { [Op.in]: postIds }
    },
    attributes: ['targetId', 'reactionType'],
    raw: true
  });

  // Build map: { postId: ['swan', 'heart'] }
  const result = {};
  for (const row of reactions) {
    if (!result[row.targetId]) {
      result[row.targetId] = [];
    }
    result[row.targetId].push(row.reactionType);
  }
  return result;
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
