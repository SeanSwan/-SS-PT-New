'use strict';

/**
 * Migration: Create challenge_participants table
 * =============================================
 *
 * Creates the junction table for the many-to-many relationship between Users and Challenges.
 * Tracks detailed participation data, progress, and performance metrics.
 *
 * Blueprint Reference: docs/ai-workflow/social-media/SOCIAL-MEDIA-PLATFORM-BLUEPRINT.md
 *
 * Table Structure:
 * - Foreign keys (userId, challengeId) with unique composite constraint
 * - Participation status and timeline tracking
 * - Progress tracking (current progress, percentage, history)
 * - Performance metrics (score, rank, XP earned)
 * - Social features (public sharing, friend updates)
 * - Notification preferences
 * - Verification system for challenges requiring proof
 * - Team participation support
 * - Engagement analytics (check-ins, streaks, consistency)
 *
 * Indexes:
 * - Composite unique: (userId, challengeId)
 * - challengeId + status (active participants per challenge)
 * - userId + status (user's active/completed challenges)
 * - challengeId + rank (leaderboard queries)
 * - challengeId + score (performance ranking)
 * - challengeId + progressPercentage (progress-based sorting)
 * - teamId (team-based queries)
 * - lastProgressUpdate (recent activity queries)
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('challenge_participants', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
        comment: 'Unique identifier for the participation record'
      },

      // Foreign Keys
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Participant user ID (FK to Users.id)'
      },

      challengeId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'challenges',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Challenge ID (FK to challenges.id)'
      },

      // Participation Status
      status: {
        type: Sequelize.ENUM('joined', 'active', 'completed', 'failed', 'quit', 'disqualified'),
        allowNull: false,
        defaultValue: 'joined',
        comment: 'Current participation status'
      },

      // Progress Tracking
      currentProgress: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        validate: {
          min: 0
        },
        comment: 'Current progress value (numeric)'
      },

      progressPercentage: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.00,
        validate: {
          min: 0,
          max: 100
        },
        comment: 'Progress as percentage (0-100)'
      },

      // Performance Metrics
      score: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0
        },
        comment: 'Performance score for leaderboards'
      },

      rank: {
        type: Sequelize.INTEGER,
        allowNull: true,
        validate: {
          min: 1
        },
        comment: 'Current rank in challenge leaderboard'
      },

      // XP and Rewards
      xpEarned: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0
        },
        comment: 'Total XP earned from this challenge'
      },

      bonusXpEarned: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0
        },
        comment: 'Bonus XP earned (separate from base XP)'
      },

      badgesEarned: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
        comment: 'JSON array of badge IDs earned'
      },

      // Timeline Tracking
      joinedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'When the user joined the challenge'
      },

      startedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the user actually started participating'
      },

      completedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the user completed the challenge'
      },

      lastProgressUpdate: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp of the last progress update'
      },

      // Team Participation (if challenge allows teams)
      // NOTE: FK to ChallengeTeams deferred — table lives in social migrations path.
      // Add constraint via ALTER TABLE once ChallengeTeams migration is unified.
      teamId: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'Team ID if participating as part of a team'
      },

      isTeamLeader: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether this participant is the team leader'
      },

      // Engagement Metrics
      checkInsCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0
        },
        comment: 'Number of times the user checked in/updated progress'
      },

      streakDays: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0
        },
        comment: 'Current streak of consecutive participation days'
      },

      longestStreak: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0
        },
        comment: 'Longest streak achieved in this challenge'
      },

      // Progress History (for charts and analytics)
      progressHistory: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
        comment: 'JSON array of progress updates with timestamps'
      },

      dailyProgress: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'JSON object tracking daily progress by date'
      },

      // Performance Analytics
      averageDailyProgress: {
        type: Sequelize.DECIMAL(8, 2),
        allowNull: false,
        defaultValue: 0.00,
        validate: {
          min: 0
        },
        comment: 'Average progress per day'
      },

      bestSingleDayProgress: {
        type: Sequelize.DECIMAL(8, 2),
        allowNull: false,
        defaultValue: 0.00,
        validate: {
          min: 0
        },
        comment: 'Best single day progress achieved'
      },

      consistencyScore: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.00,
        validate: {
          min: 0,
          max: 10
        },
        comment: 'Consistency score (0-10) based on regular participation'
      },

      // Social Features
      isPublic: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether progress is publicly visible'
      },

      allowFriendUpdates: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether friends can see progress updates'
      },

      shareAchievements: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether to auto-share achievements on social feeds'
      },

      // Notification Preferences
      receiveReminders: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether to receive challenge reminder notifications'
      },

      receiveEncouragement: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether to receive encouragement notifications'
      },

      reminderFrequency: {
        type: Sequelize.ENUM('daily', 'every_2_days', 'weekly', 'never'),
        allowNull: false,
        defaultValue: 'daily',
        comment: 'How often to send reminder notifications'
      },

      // Additional Metadata
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Personal notes about the challenge'
      },

      motivation: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Personal motivation statement'
      },

      // Verification for challenges that require it
      isVerified: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether completion has been verified (for challenges requiring proof)'
      },

      verifiedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'User ID of who verified the completion'
      },

      verifiedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the completion was verified'
      },

      verificationNotes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Notes from the verification process'
      },

      // Timestamps
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'Record creation timestamp'
      },

      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'Last update timestamp'
      }
    });

    // Create indexes for performance
    await queryInterface.addIndex('challenge_participants', ['userId', 'challengeId'], {
      name: 'challenge_participants_user_challenge_unique_idx',
      unique: true
    });

    await queryInterface.addIndex('challenge_participants', ['challengeId', 'status'], {
      name: 'challenge_participants_challenge_status_idx'
    });

    await queryInterface.addIndex('challenge_participants', ['userId', 'status'], {
      name: 'challenge_participants_user_status_idx'
    });

    await queryInterface.addIndex('challenge_participants', ['challengeId', 'rank'], {
      name: 'challenge_participants_challenge_rank_idx'
    });

    await queryInterface.addIndex('challenge_participants', ['challengeId', 'score'], {
      name: 'challenge_participants_challenge_score_idx'
    });

    await queryInterface.addIndex('challenge_participants', ['challengeId', 'progressPercentage'], {
      name: 'challenge_participants_challenge_progress_idx'
    });

    await queryInterface.addIndex('challenge_participants', ['teamId'], {
      name: 'challenge_participants_team_idx'
    });

    await queryInterface.addIndex('challenge_participants', ['lastProgressUpdate'], {
      name: 'challenge_participants_last_update_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Drop indexes first
    await queryInterface.removeIndex('challenge_participants', 'challenge_participants_user_challenge_unique_idx');
    await queryInterface.removeIndex('challenge_participants', 'challenge_participants_challenge_status_idx');
    await queryInterface.removeIndex('challenge_participants', 'challenge_participants_user_status_idx');
    await queryInterface.removeIndex('challenge_participants', 'challenge_participants_challenge_rank_idx');
    await queryInterface.removeIndex('challenge_participants', 'challenge_participants_challenge_score_idx');
    await queryInterface.removeIndex('challenge_participants', 'challenge_participants_challenge_progress_idx');
    await queryInterface.removeIndex('challenge_participants', 'challenge_participants_team_idx');
    await queryInterface.removeIndex('challenge_participants', 'challenge_participants_last_update_idx');

    // Drop the table
    await queryInterface.dropTable('challenge_participants');
  }
};
