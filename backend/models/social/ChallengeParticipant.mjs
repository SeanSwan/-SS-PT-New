import { DataTypes } from 'sequelize';
import db from '../../database.mjs';

const ChallengeParticipant = db.define('ChallengeParticipant', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  challengeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Challenges',
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
  teamId: {
    type: DataTypes.INTEGER,
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
