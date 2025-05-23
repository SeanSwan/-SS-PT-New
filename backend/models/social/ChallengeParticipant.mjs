import { DataTypes } from 'sequelize';
import db from '../../database.mjs';

const ChallengeParticipant = db.define('ChallengeParticipant', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  challengeId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Challenges',
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
  teamId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'ChallengeTeams',
      key: 'id'
    },
    comment: 'For team challenges, the team this participant belongs to'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'completed'),
    defaultValue: 'active',
    allowNull: false
  },
  progress: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    allowNull: false,
    comment: 'Current progress towards the challenge goal'
  },
  isCompleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  pointsEarned: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    comment: 'Total points earned from this challenge so far'
  },
  rank: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Participant rank in the challenge (calculated on completion)'
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
  tableName: 'ChallengeParticipants',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['challengeId', 'userId'],
      name: 'unique_challenge_participant'
    },
    {
      fields: ['challengeId', 'progress'],
      name: 'challenge_progress_idx'
    },
    {
      fields: ['userId', 'status'],
      name: 'user_challenge_status_idx'
    }
  ]
});

// Add instance methods for updating progress
ChallengeParticipant.prototype.updateProgress = async function(value, options = {}) {
  const { overwrite = false } = options;
  
  // Get the challenge details
  const challenge = await db.models.Challenge.findByPk(this.challengeId);
  if (!challenge) {
    throw new Error('Challenge not found');
  }
  
  // Update progress
  if (overwrite) {
    this.progress = value;
  } else {
    this.progress += value;
  }
  
  // Calculate points earned
  const newPointsEarned = Math.floor(this.progress * challenge.pointsPerUnit);
  const previousPointsEarned = this.pointsEarned;
  this.pointsEarned = newPointsEarned;
  
  // Check if challenge is now completed
  if (!this.isCompleted && this.progress >= challenge.goal) {
    this.isCompleted = true;
    this.completedAt = new Date();
    this.status = 'completed';
    
    // Add bonus points for completion
    this.pointsEarned += challenge.bonusPoints;
    
    // If a badge is associated with this challenge, award it to the user
    if (challenge.badgeId) {
      try {
        await db.models.UserAchievement.create({
          userId: this.userId,
          achievementId: challenge.badgeId,
          earnedAt: new Date(),
          isCompleted: true
        });
      } catch (error) {
        console.error('Error awarding badge for challenge completion:', error);
      }
    }
    
    // Create a post for challenge completion (optional)
    try {
      await db.models.SocialPost.create({
        userId: this.userId,
        content: `I just completed the "${challenge.name}" challenge!`,
        type: 'challenge',
        challengeId: challenge.id,
        visibility: 'public'
      });
    } catch (error) {
      console.error('Error creating challenge completion post:', error);
    }
  }
  
  await this.save();
  
  // If points have increased, create a point transaction
  const pointIncrease = this.pointsEarned - previousPointsEarned;
  if (pointIncrease > 0) {
    try {
      // Add points to the user's total
      await db.models.User.increment('points', {
        by: pointIncrease,
        where: { id: this.userId }
      });
      
      // Create a point transaction record
      await db.models.PointTransaction.create({
        userId: this.userId,
        points: pointIncrease,
        transactionType: 'earn',
        source: 'challenge_progress',
        description: `Progress in "${challenge.name}" challenge`,
        // Need to fetch current balance for reference
        balance: (await db.models.User.findByPk(this.userId)).points
      });
    } catch (error) {
      console.error('Error creating point transaction for challenge progress:', error);
    }
  }
  
  return this;
};

// Add class methods for leaderboard
ChallengeParticipant.getLeaderboard = async function(challengeId, options = {}) {
  const { limit = 10, offset = 0 } = options;
  
  return this.findAll({
    where: {
      challengeId,
      status: { [db.Sequelize.Op.in]: ['active', 'completed'] }
    },
    order: [
      ['progress', 'DESC'],
      ['updatedAt', 'ASC'] // Tiebreaker: who reached this progress first
    ],
    limit,
    offset,
    include: [
      {
        model: db.models.User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'username', 'photo']
      }
    ]
  });
};

// Get all challenges for a specific user
ChallengeParticipant.getChallengesForUser = async function(userId, options = {}) {
  const { status = 'active', limit = 10, offset = 0 } = options;
  
  return this.findAll({
    where: {
      userId,
      status
    },
    limit, 
    offset,
    include: [
      {
        model: db.models.Challenge,
        as: 'challenge'
      }
    ],
    order: [
      ['updatedAt', 'DESC']
    ]
  });
};

export default ChallengeParticipant;
