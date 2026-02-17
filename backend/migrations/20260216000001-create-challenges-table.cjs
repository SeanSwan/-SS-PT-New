'use strict';

/**
 * Migration: Create challenges table
 * ===================================
 *
 * Creates the challenges table for the gamification system.
 * Supports all challenge types: daily, weekly, monthly, community, custom.
 *
 * Blueprint Reference: docs/ai-workflow/social-media/SOCIAL-MEDIA-PLATFORM-BLUEPRINT.md
 *
 * Table Structure:
 * - Core challenge data (title, description, type, difficulty, category)
 * - Participation management (max participants, current count)
 * - Progress tracking (max progress, progress unit)
 * - Reward system (XP rewards, bonus XP)
 * - Time management (start/end dates)
 * - Creator and ownership (createdBy FK to Users)
 * - Requirements and tags (JSONB for flexibility)
 * - Status and visibility (status, isPublic, isFeatured)
 * - Business intelligence (completion rate, engagement score)
 * - Advanced features (auto-complete, verification, teams, leaderboard)
 *
 * Indexes:
 * - challengeType + status (filtering active challenges by type)
 * - category + difficulty (challenge discovery)
 * - startDate + endDate (time-based queries)
 * - createdBy (user's created challenges)
 * - isPremium + isFeatured (featured challenge queries)
 * - completionRate + engagementScore (analytics queries)
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('challenges', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
        comment: 'Unique identifier for the challenge'
      },

      // Challenge Identity
      title: {
        type: Sequelize.STRING(100),
        allowNull: false,
        validate: {
          len: [3, 100]
        },
        comment: 'Challenge title (3-100 characters)'
      },

      description: {
        type: Sequelize.TEXT,
        allowNull: false,
        validate: {
          len: [10, 1000]
        },
        comment: 'Detailed challenge description (10-1000 characters)'
      },

      // Challenge Classification
      challengeType: {
        type: Sequelize.ENUM('daily', 'weekly', 'monthly', 'community', 'custom'),
        allowNull: false,
        defaultValue: 'daily',
        comment: 'Type of challenge (daily/weekly/monthly/community/custom)'
      },

      difficulty: {
        type: Sequelize.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
          max: 5
        },
        defaultValue: 3,
        comment: 'Difficulty level (1-5, where 5 is hardest)'
      },

      category: {
        type: Sequelize.ENUM('fitness', 'nutrition', 'mindfulness', 'social', 'streak'),
        allowNull: false,
        defaultValue: 'fitness',
        comment: 'Challenge category for organization and filtering'
      },

      // Reward System
      xpReward: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 100,
        validate: {
          min: 0
        },
        comment: 'Base XP reward for completing the challenge'
      },

      bonusXpReward: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
        validate: {
          min: 0
        },
        comment: 'Bonus XP for exceptional performance or early completion'
      },

      // Participation Management
      maxParticipants: {
        type: Sequelize.INTEGER,
        allowNull: true,
        validate: {
          min: 1
        },
        comment: 'Maximum number of participants (null = unlimited)'
      },

      currentParticipants: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0
        },
        comment: 'Current number of active participants'
      },

      // Progress Tracking
      maxProgress: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
          min: 1
        },
        comment: 'Maximum progress value for completion calculation'
      },

      progressUnit: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'completion',
        validate: {
          isIn: [['completion', 'workouts', 'minutes', 'calories', 'sessions', 'days', 'points', 'custom']]
        },
        comment: 'Unit of measurement for progress (completion/workouts/minutes/etc.)'
      },

      // Time Management
      startDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'When the challenge becomes active'
      },

      endDate: {
        type: Sequelize.DATE,
        allowNull: false,
        validate: {
          isAfterStart(value) {
            if (value <= this.startDate) {
              throw new Error('End date must be after start date');
            }
          }
        },
        comment: 'When the challenge ends (must be after startDate)'
      },

      // Challenge Creator
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'User who created the challenge (FK to Users.id)'
      },

      // Challenge Requirements
      requirements: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
        comment: 'JSON array of specific requirements or conditions'
      },

      // Challenge Tags
      tags: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
        comment: 'JSON array of tags for categorization and search'
      },

      // Challenge Status
      status: {
        type: Sequelize.ENUM('draft', 'active', 'completed', 'cancelled', 'archived'),
        allowNull: false,
        defaultValue: 'active',
        comment: 'Current status of the challenge'
      },

      isPublic: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether the challenge is visible to all users'
      },

      isFeatured: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether the challenge is featured/promoted'
      },

      // Business Intelligence
      completionRate: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.00,
        validate: {
          min: 0,
          max: 100
        },
        comment: 'Percentage of participants who completed (0-100)'
      },

      averageProgress: {
        type: Sequelize.DECIMAL(8, 2),
        allowNull: false,
        defaultValue: 0.00,
        validate: {
          min: 0
        },
        comment: 'Average progress across all participants'
      },

      engagementScore: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.00,
        validate: {
          min: 0,
          max: 10
        },
        comment: 'Engagement score (0-10 scale based on participation metrics)'
      },

      // Advanced Configuration
      autoComplete: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether to auto-complete when maxProgress is reached'
      },

      allowEarlyCompletion: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether participants can complete before endDate'
      },

      requireVerification: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether completion requires admin verification'
      },

      // Premium Features
      isPremium: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether this is a premium-only challenge'
      },

      premiumBenefits: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'JSON object describing premium benefits'
      },

      // Leaderboard Configuration
      hasLeaderboard: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether to show a leaderboard for this challenge'
      },

      leaderboardType: {
        type: Sequelize.ENUM('progress', 'completion_time', 'total_score', 'custom'),
        allowNull: false,
        defaultValue: 'progress',
        comment: 'Type of leaderboard ranking (progress/completion_time/total_score/custom)'
      },

      // Social Features
      allowTeams: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether the challenge supports team participation'
      },

      maxTeamSize: {
        type: Sequelize.INTEGER,
        allowNull: true,
        validate: {
          min: 2
        },
        comment: 'Maximum team size if teams are allowed'
      },

      // Notification Settings
      sendStartNotification: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether to send notifications when challenge starts'
      },

      sendProgressNotifications: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether to send progress update notifications'
      },

      sendCompletionNotification: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether to send completion notifications'
      },

      // Analytics Tracking
      viewCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0
        },
        comment: 'Number of times the challenge has been viewed'
      },

      shareCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0
        },
        comment: 'Number of times the challenge has been shared'
      },

      likeCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0
        },
        comment: 'Number of likes the challenge has received'
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
    await queryInterface.addIndex('challenges', ['challengeType', 'status'], {
      name: 'challenges_type_status_idx'
    });

    await queryInterface.addIndex('challenges', ['category', 'difficulty'], {
      name: 'challenges_category_difficulty_idx'
    });

    await queryInterface.addIndex('challenges', ['startDate', 'endDate'], {
      name: 'challenges_dates_idx'
    });

    await queryInterface.addIndex('challenges', ['createdBy'], {
      name: 'challenges_creator_idx'
    });

    await queryInterface.addIndex('challenges', ['isPremium', 'isFeatured'], {
      name: 'challenges_premium_featured_idx'
    });

    await queryInterface.addIndex('challenges', ['completionRate'], {
      name: 'challenges_completion_rate_idx'
    });

    await queryInterface.addIndex('challenges', ['engagementScore'], {
      name: 'challenges_engagement_score_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Drop indexes first
    await queryInterface.removeIndex('challenges', 'challenges_type_status_idx');
    await queryInterface.removeIndex('challenges', 'challenges_category_difficulty_idx');
    await queryInterface.removeIndex('challenges', 'challenges_dates_idx');
    await queryInterface.removeIndex('challenges', 'challenges_creator_idx');
    await queryInterface.removeIndex('challenges', 'challenges_premium_featured_idx');
    await queryInterface.removeIndex('challenges', 'challenges_completion_rate_idx');
    await queryInterface.removeIndex('challenges', 'challenges_engagement_score_idx');

    // Drop the table
    await queryInterface.dropTable('challenges');
  }
};
