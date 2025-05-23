import { DataTypes } from 'sequelize';
import db from '../../database.mjs';

const ChallengeTeam = db.define('ChallengeTeam', {
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
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  logoUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  captainId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'Team captain/leader who can manage the team'
  },
  memberCount: {
    type: DataTypes.INTEGER,
    defaultValue: 1, // Starting with the captain
    allowNull: false
  },
  totalProgress: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    allowNull: false,
    comment: 'Sum of all team members progress'
  },
  averageProgress: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    allowNull: false,
    comment: 'Total progress divided by member count'
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
  rank: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Team rank in the challenge (calculated on completion)'
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
  tableName: 'ChallengeTeams',
  timestamps: true,
  indexes: [
    {
      fields: ['challengeId'],
      name: 'challenge_team_idx'
    },
    {
      fields: ['captainId'],
      name: 'team_captain_idx'
    },
    {
      fields: ['challengeId', 'totalProgress'],
      name: 'team_progress_idx'
    }
  ]
});

// Create a new team for a challenge
ChallengeTeam.createTeam = async function(challengeId, captainId, teamData) {
  // Check if the challenge exists and is of team type
  const challenge = await db.models.Challenge.findByPk(challengeId);
  if (!challenge) {
    throw new Error('Challenge not found');
  }
  
  if (challenge.type !== 'team') {
    throw new Error('This challenge does not support teams');
  }
  
  // Check if captain is already in a team for this challenge
  const existingTeamMembership = await db.models.ChallengeParticipant.findOne({
    where: {
      challengeId,
      userId: captainId,
      teamId: { [db.Sequelize.Op.not]: null }
    }
  });
  
  if (existingTeamMembership) {
    throw new Error('User is already a member of a team in this challenge');
  }
  
  // Create the team
  const team = await this.create({
    challengeId,
    captainId,
    name: teamData.name,
    description: teamData.description,
    logoUrl: teamData.logoUrl,
    memberCount: 1, // Starting with just the captain
    totalProgress: 0,
    averageProgress: 0,
    isCompleted: false
  });
  
  // Update the captain's challenge participation to link to this team
  const captainParticipation = await db.models.ChallengeParticipant.findOne({
    where: {
      challengeId,
      userId: captainId
    }
  });
  
  if (captainParticipation) {
    captainParticipation.teamId = team.id;
    await captainParticipation.save();
  } else {
    // Create a new participation entry for the captain
    await db.models.ChallengeParticipant.create({
      challengeId,
      userId: captainId,
      teamId: team.id,
      status: 'active',
      progress: 0,
      isCompleted: false
    });
  }
  
  return team;
};

// Add a member to a team
ChallengeTeam.prototype.addMember = async function(userId) {
  // Check if user is already in this team
  const existingTeamMembership = await db.models.ChallengeParticipant.findOne({
    where: {
      challengeId: this.challengeId,
      userId,
      teamId: this.id
    }
  });
  
  if (existingTeamMembership) {
    return { success: false, message: 'User is already a member of this team' };
  }
  
  // Check if user is in another team for this challenge
  const otherTeamMembership = await db.models.ChallengeParticipant.findOne({
    where: {
      challengeId: this.challengeId,
      userId,
      teamId: { [db.Sequelize.Op.ne]: this.id, [db.Sequelize.Op.ne]: null }
    }
  });
  
  if (otherTeamMembership) {
    return { success: false, message: 'User is already a member of another team in this challenge' };
  }
  
  // Update existing participation or create a new one
  let participation = await db.models.ChallengeParticipant.findOne({
    where: {
      challengeId: this.challengeId,
      userId
    }
  });
  
  if (participation) {
    participation.teamId = this.id;
    await participation.save();
  } else {
    participation = await db.models.ChallengeParticipant.create({
      challengeId: this.challengeId,
      userId,
      teamId: this.id,
      status: 'active',
      progress: 0,
      isCompleted: false
    });
  }
  
  // Update team member count
  this.memberCount += 1;
  
  // Recalculate team progress metrics
  await this.recalculateProgress();
  
  return { success: true, message: 'User successfully added to the team', participation };
};

// Remove a member from the team
ChallengeTeam.prototype.removeMember = async function(userId) {
  // Cannot remove the captain
  if (userId === this.captainId) {
    return { success: false, message: 'Cannot remove the team captain' };
  }
  
  // Find the participation
  const participation = await db.models.ChallengeParticipant.findOne({
    where: {
      challengeId: this.challengeId,
      userId,
      teamId: this.id
    }
  });
  
  if (!participation) {
    return { success: false, message: 'User is not a member of this team' };
  }
  
  // Remove team association, but keep the challenge participation
  participation.teamId = null;
  await participation.save();
  
  // Update team member count
  this.memberCount -= 1;
  
  // Recalculate team progress metrics
  await this.recalculateProgress();
  
  return { success: true, message: 'User successfully removed from the team' };
};

// Recalculate team progress based on member progress
ChallengeTeam.prototype.recalculateProgress = async function() {
  // Get all team members' progress
  const teamMembers = await db.models.ChallengeParticipant.findAll({
    where: {
      challengeId: this.challengeId,
      teamId: this.id,
      status: { [db.Sequelize.Op.in]: ['active', 'completed'] }
    }
  });
  
  // Calculate total progress
  let totalProgress = 0;
  let completedMembers = 0;
  
  teamMembers.forEach(member => {
    totalProgress += member.progress;
    if (member.isCompleted) {
      completedMembers += 1;
    }
  });
  
  this.totalProgress = totalProgress;
  
  // Calculate average progress
  this.averageProgress = this.memberCount > 0 ? totalProgress / this.memberCount : 0;
  
  // Check if the entire team has completed the challenge
  const challenge = await db.models.Challenge.findByPk(this.challengeId);
  
  // Team completion logic (can be customized based on challenge criteria)
  const allMembersCompleted = completedMembers === this.memberCount;
  const teamProgressMeetsGoal = this.totalProgress >= (challenge.goal * this.memberCount);
  
  if (!this.isCompleted && (allMembersCompleted || teamProgressMeetsGoal)) {
    this.isCompleted = true;
    this.completedAt = new Date();
    
    // Award team completion rewards here if needed
    // ...
  }
  
  await this.save();
  return this;
};

// Get team leaderboard for a challenge
ChallengeTeam.getLeaderboard = async function(challengeId, options = {}) {
  const { limit = 10, offset = 0 } = options;
  
  return this.findAll({
    where: { challengeId },
    order: [
      ['totalProgress', 'DESC'],
      ['memberCount', 'ASC'], // Tiebreaker: fewer members is more impressive
      ['updatedAt', 'ASC']    // Second tiebreaker: who reached this progress first
    ],
    limit,
    offset,
    include: [
      {
        model: db.models.User,
        as: 'captain',
        attributes: ['id', 'firstName', 'lastName', 'username', 'photo']
      }
    ]
  });
};

export default ChallengeTeam;
