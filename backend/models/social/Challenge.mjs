import { DataTypes } from 'sequelize';
import db from '../../database.mjs';

const Challenge = db.define('Challenge', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('individual', 'team', 'global'),
    defaultValue: 'individual',
    allowNull: false
  },
  category: {
    type: DataTypes.ENUM('workout', 'steps', 'weight', 'nutrition', 'water', 'sleep', 'custom'),
    defaultValue: 'workout',
    allowNull: false
  },
  goal: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Target value to achieve (e.g., number of workouts, steps, etc.)'
  },
  unit: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Unit of measurement (e.g., workouts, steps, lbs, oz, hours, etc.)'
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  creatorId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('upcoming', 'active', 'completed', 'cancelled'),
    defaultValue: 'upcoming',
    allowNull: false
  },
  visibility: {
    type: DataTypes.ENUM('public', 'private', 'invite-only'),
    defaultValue: 'public',
    allowNull: false
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  pointsPerUnit: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 10,
    comment: 'Gamification points awarded per unit completed (e.g., 10 points per workout)'
  },
  bonusPoints: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 100,
    comment: 'Bonus points awarded for completing the entire challenge'
  },
  badgeId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Achievements',
      key: 'id'
    },
    comment: 'Badge/achievement to award upon completion'
  },
  participantCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
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
  tableName: 'Challenges',
  timestamps: true,
  indexes: [
    {
      fields: ['startDate', 'endDate'],
      name: 'challenge_dates_idx'
    },
    {
      fields: ['status'],
      name: 'challenge_status_idx'
    },
    {
      fields: ['creatorId'],
      name: 'challenge_creator_idx'
    },
    {
      fields: ['type', 'category'],
      name: 'challenge_type_category_idx'
    }
  ]
});

// Add class methods for challenge management
Challenge.getActive = async function(options = {}) {
  const { limit = 10, offset = 0, userId = null } = options;
  
  const now = new Date();
  const whereClause = {
    status: 'active',
    startDate: { [db.Sequelize.Op.lte]: now },
    endDate: { [db.Sequelize.Op.gte]: now },
    visibility: { [db.Sequelize.Op.in]: ['public'] }
  };
  
  // If a userId is provided, also include private challenges they're part of
  if (userId) {
    // Include challenges where the user is the creator
    const creatorChallenges = await this.findAll({
      where: {
        creatorId: userId,
        status: 'active'
      },
      attributes: ['id']
    });
    
    // Include challenges where the user is a participant
    const participantChallenges = await db.models.ChallengeParticipant.findAll({
      where: { userId },
      attributes: ['challengeId']
    });
    
    // Extract challenge IDs
    const creatorChallengeIds = creatorChallenges.map(c => c.id);
    const participantChallengeIds = participantChallenges.map(p => p.challengeId);
    
    // Combine all challenge IDs
    const userChallengeIds = [...new Set([...creatorChallengeIds, ...participantChallengeIds])];
    
    if (userChallengeIds.length > 0) {
      whereClause[db.Sequelize.Op.or] = [
        whereClause,
        { id: { [db.Sequelize.Op.in]: userChallengeIds } }
      ];
    }
  }
  
  return this.findAll({
    where: whereClause,
    limit,
    offset,
    order: [['endDate', 'ASC']] // Show challenges ending soon first
  });
};

Challenge.createChallenge = async function(data, creatorId) {
  const challenge = await this.create({
    ...data,
    creatorId,
    status: 'upcoming',
    participantCount: 0
  });
  
  // Auto-enroll the creator in their own challenge
  await db.models.ChallengeParticipant.create({
    challengeId: challenge.id,
    userId: creatorId,
    status: 'active',
    progress: 0,
    isCompleted: false
  });
  
  // Increment participant count
  challenge.participantCount = 1;
  await challenge.save();
  
  return challenge;
};

Challenge.prototype.join = async function(userId) {
  // Check if user is already a participant
  const existingParticipant = await db.models.ChallengeParticipant.findOne({
    where: {
      challengeId: this.id,
      userId
    }
  });
  
  if (existingParticipant) {
    if (existingParticipant.status === 'active') {
      return { success: false, message: 'User is already an active participant' };
    } else {
      // Reactivate the participation
      existingParticipant.status = 'active';
      await existingParticipant.save();
      return { success: true, message: 'Participation reactivated', participant: existingParticipant };
    }
  }
  
  // Create new participation
  const participant = await db.models.ChallengeParticipant.create({
    challengeId: this.id,
    userId,
    status: 'active',
    progress: 0,
    isCompleted: false
  });
  
  // Increment participant count
  this.participantCount += 1;
  await this.save();
  
  return { success: true, message: 'Successfully joined challenge', participant };
};

Challenge.prototype.leave = async function(userId) {
  const participant = await db.models.ChallengeParticipant.findOne({
    where: {
      challengeId: this.id,
      userId
    }
  });
  
  if (!participant) {
    return { success: false, message: 'User is not a participant in this challenge' };
  }
  
  // Mark participation as inactive
  participant.status = 'inactive';
  await participant.save();
  
  // Decrement participant count
  this.participantCount -= 1;
  await this.save();
  
  return { success: true, message: 'Successfully left challenge' };
};

export default Challenge;
