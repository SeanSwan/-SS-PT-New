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
    }
  ]
});

// Class methods
SocialPost.createWorkoutPost = async function(userId, content, workoutSessionId, options = {}) {
  return this.create({
    userId,
    content,
    type: 'workout',
    workoutSessionId,
    visibility: options.visibility || 'friends',
    mediaUrl: options.mediaUrl
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
    mediaUrl: options.mediaUrl
  });
};

// Static methods for querying feed posts
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
      [db.Sequelize.Op.or]: [
        { userId: { [db.Sequelize.Op.in]: userIds } },
        { visibility: 'public' } // Also include public posts from non-friends
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
