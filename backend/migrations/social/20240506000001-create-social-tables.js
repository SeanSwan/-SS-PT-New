'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Create Friendships table
    await queryInterface.createTable('Friendships', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      requesterId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      recipientId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      status: {
        type: Sequelize.ENUM('pending', 'accepted', 'declined', 'blocked'),
        defaultValue: 'pending',
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add unique constraint to prevent duplicate friendships
    await queryInterface.addIndex('Friendships', ['requesterId', 'recipientId'], {
      unique: true,
      name: 'unique_friendship'
    });

    // 2. Create SocialPosts table
    await queryInterface.createTable('SocialPosts', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      type: {
        type: Sequelize.ENUM('general', 'workout', 'achievement', 'challenge'),
        defaultValue: 'general',
        allowNull: false
      },
      visibility: {
        type: Sequelize.ENUM('public', 'friends', 'private'),
        defaultValue: 'friends',
        allowNull: false
      },
      workoutSessionId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'WorkoutSessions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      achievementId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Achievements',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      userAchievementId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'UserAchievements',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      challengeId: {
        type: Sequelize.UUID,
        allowNull: true
      },
      mediaUrl: {
        type: Sequelize.STRING,
        allowNull: true
      },
      likesCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      commentsCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes for social posts
    await queryInterface.addIndex('SocialPosts', ['userId'], {
      name: 'socialpost_user_idx'
    });
    
    await queryInterface.addIndex('SocialPosts', ['type'], {
      name: 'socialpost_type_idx'
    });
    
    await queryInterface.addIndex('SocialPosts', ['createdAt'], {
      name: 'socialpost_created_idx'
    });

    // 3. Create SocialComments table
    await queryInterface.createTable('SocialComments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      postId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'SocialPosts',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      likesCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes for social comments
    await queryInterface.addIndex('SocialComments', ['postId'], {
      name: 'socialcomment_post_idx'
    });
    
    await queryInterface.addIndex('SocialComments', ['userId'], {
      name: 'socialcomment_user_idx'
    });

    // 4. Create SocialLikes table
    await queryInterface.createTable('SocialLikes', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      targetType: {
        type: Sequelize.ENUM('post', 'comment'),
        allowNull: false
      },
      targetId: {
        type: Sequelize.UUID,
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add unique constraint to prevent duplicate likes
    await queryInterface.addIndex('SocialLikes', ['userId', 'targetType', 'targetId'], {
      unique: true,
      name: 'unique_like'
    });
    
    await queryInterface.addIndex('SocialLikes', ['targetType', 'targetId'], {
      name: 'target_idx'
    });

    // 5. Create Challenges table
    await queryInterface.createTable('Challenges', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      type: {
        type: Sequelize.ENUM('individual', 'team', 'global'),
        defaultValue: 'individual',
        allowNull: false
      },
      category: {
        type: Sequelize.ENUM('workout', 'steps', 'weight', 'nutrition', 'water', 'sleep', 'custom'),
        defaultValue: 'workout',
        allowNull: false
      },
      goal: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Target value to achieve (e.g., number of workouts, steps, etc.)'
      },
      unit: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Unit of measurement (e.g., workouts, steps, lbs, oz, hours, etc.)'
      },
      startDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      endDate: {
        type: Sequelize.DATE,
        allowNull: false
      },
      creatorId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      status: {
        type: Sequelize.ENUM('upcoming', 'active', 'completed', 'cancelled'),
        defaultValue: 'upcoming',
        allowNull: false
      },
      visibility: {
        type: Sequelize.ENUM('public', 'private', 'invite-only'),
        defaultValue: 'public',
        allowNull: false
      },
      imageUrl: {
        type: Sequelize.STRING,
        allowNull: true
      },
      pointsPerUnit: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 10,
        comment: 'Gamification points awarded per unit completed (e.g., 10 points per workout)'
      },
      bonusPoints: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 100,
        comment: 'Bonus points awarded for completing the entire challenge'
      },
      badgeId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Achievements',
          key: 'id'
        },
        comment: 'Badge/achievement to award upon completion'
      },
      participantCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes for challenges
    await queryInterface.addIndex('Challenges', ['startDate', 'endDate'], {
      name: 'challenge_dates_idx'
    });
    
    await queryInterface.addIndex('Challenges', ['status'], {
      name: 'challenge_status_idx'
    });
    
    await queryInterface.addIndex('Challenges', ['creatorId'], {
      name: 'challenge_creator_idx'
    });
    
    await queryInterface.addIndex('Challenges', ['type', 'category'], {
      name: 'challenge_type_category_idx'
    });

    // 6. Create ChallengeTeams table
    await queryInterface.createTable('ChallengeTeams', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      challengeId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Challenges',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      logoUrl: {
        type: Sequelize.STRING,
        allowNull: true
      },
      captainId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      memberCount: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        allowNull: false
      },
      totalProgress: {
        type: Sequelize.FLOAT,
        defaultValue: 0,
        allowNull: false
      },
      averageProgress: {
        type: Sequelize.FLOAT,
        defaultValue: 0,
        allowNull: false
      },
      isCompleted: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      completedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      rank: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes for challenge teams
    await queryInterface.addIndex('ChallengeTeams', ['challengeId'], {
      name: 'challenge_team_idx'
    });
    
    await queryInterface.addIndex('ChallengeTeams', ['captainId'], {
      name: 'team_captain_idx'
    });
    
    await queryInterface.addIndex('ChallengeTeams', ['challengeId', 'totalProgress'], {
      name: 'team_progress_idx'
    });

    // 7. Create ChallengeParticipants table
    await queryInterface.createTable('ChallengeParticipants', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      challengeId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Challenges',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      teamId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'ChallengeTeams',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'completed'),
        defaultValue: 'active',
        allowNull: false
      },
      progress: {
        type: Sequelize.FLOAT,
        defaultValue: 0,
        allowNull: false
      },
      isCompleted: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      completedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      pointsEarned: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      rank: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add unique constraint to prevent duplicate participation
    await queryInterface.addIndex('ChallengeParticipants', ['challengeId', 'userId'], {
      unique: true,
      name: 'unique_challenge_participant'
    });
    
    await queryInterface.addIndex('ChallengeParticipants', ['challengeId', 'progress'], {
      name: 'challenge_progress_idx'
    });
    
    await queryInterface.addIndex('ChallengeParticipants', ['userId', 'status'], {
      name: 'user_challenge_status_idx'
    });
  },

  async down(queryInterface, Sequelize) {
    // Drop tables in reverse order to respect foreign key constraints
    await queryInterface.dropTable('ChallengeParticipants');
    await queryInterface.dropTable('ChallengeTeams');
    await queryInterface.dropTable('Challenges');
    await queryInterface.dropTable('SocialLikes');
    await queryInterface.dropTable('SocialComments');
    await queryInterface.dropTable('SocialPosts');
    await queryInterface.dropTable('Friendships');
  }
};
