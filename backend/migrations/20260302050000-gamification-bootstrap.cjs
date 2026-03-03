'use strict';

/**
 * Comprehensive Gamification Bootstrap Migration (.cjs)
 * =====================================================
 *
 * Problem: sequelize-cli v6.6.2 ignores .mjs migration files.
 * The 8 gamification .mjs migrations never ran on production.
 * This single .cjs migration creates ALL gamification tables
 * idempotently (skips tables that already exist).
 *
 * Tables created:
 *   1. Achievements
 *   2. Rewards
 *   3. Milestones
 *   4. UserAchievements  (already handled by 20260301000100 but included for safety)
 *   5. UserRewards
 *   6. UserMilestones
 *   7. PointTransactions
 *   8. GamificationSettings
 *   + Gamification fields added to Users table
 *
 * IMPORTANT: User.id is INTEGER (autoIncrement), NOT UUID.
 * All userId foreign keys use INTEGER to match.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Helper: check if table exists
    const tableExists = async (tableName) => {
      const [results] = await queryInterface.sequelize.query(
        `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = '${tableName}';`
      );
      return results.length > 0;
    };

    // Helper: check if column exists on a table
    const columnExists = async (tableName, columnName) => {
      const [results] = await queryInterface.sequelize.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = '${tableName}' AND column_name = '${columnName}';`
      );
      return results.length > 0;
    };

    // Helper: safe add column
    const safeAddColumn = async (tableName, columnName, definition) => {
      if (await columnExists(tableName, columnName)) {
        console.log(`  ~ ${tableName}.${columnName} already exists, skipping`);
        return;
      }
      await queryInterface.addColumn(tableName, columnName, definition);
      console.log(`  + Added ${tableName}.${columnName}`);
    };

    // Helper: safe create ENUM type
    const safeCreateEnum = async (typeName, values) => {
      const valuesStr = values.map(v => `'${v}'`).join(', ');
      await queryInterface.sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE "${typeName}" AS ENUM (${valuesStr});
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);
    };

    // Helper: safe add index
    const safeAddIndex = async (tableName, columns, options = {}) => {
      try {
        await queryInterface.addIndex(tableName, columns, options);
        console.log(`  + Added index on ${tableName}(${columns.join(', ')})`);
      } catch (e) {
        if (e.message && (e.message.includes('already exists') || e.message.includes('duplicate'))) {
          console.log(`  ~ Index on ${tableName}(${columns.join(', ')}) already exists`);
        } else {
          console.warn(`  ! Index on ${tableName}(${columns.join(', ')}) failed: ${e.message}`);
        }
      }
    };

    console.log('=== Gamification Bootstrap Migration Starting ===');

    // ─────────────────────────────────────────────────
    // 1. ACHIEVEMENTS TABLE
    // ─────────────────────────────────────────────────
    if (!(await tableExists('Achievements'))) {
      console.log('Creating Achievements table...');

      // Create ENUM types first
      await safeCreateEnum('enum_Achievements_requirementType', [
        'session_count', 'exercise_count', 'level_reached', 'specific_exercise',
        'streak_days', 'workout_time', 'invite_friend', 'purchase_package', 'complete_assessment'
      ]);
      await safeCreateEnum('enum_Achievements_tier', ['bronze', 'silver', 'gold', 'platinum']);

      await queryInterface.createTable('Achievements', {
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
        icon: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'Award'
        },
        pointValue: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 100
        },
        requirementType: {
          type: Sequelize.ENUM('session_count', 'exercise_count', 'level_reached', 'specific_exercise',
            'streak_days', 'workout_time', 'invite_friend', 'purchase_package', 'complete_assessment'),
          allowNull: false
        },
        requirementValue: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1
        },
        tier: {
          type: Sequelize.ENUM('bronze', 'silver', 'gold', 'platinum'),
          allowNull: true,
          defaultValue: 'bronze'
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        exerciseId: {
          type: Sequelize.UUID,
          allowNull: true
          // No FK constraint — Exercises table may not exist
        },
        specificRequirement: {
          type: Sequelize.JSON,
          allowNull: true
        },
        badgeImageUrl: {
          type: Sequelize.STRING,
          allowNull: true
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        }
      });
      console.log('  ✓ Achievements table created');
    } else {
      console.log('  ~ Achievements table already exists');
    }

    // ─────────────────────────────────────────────────
    // 2. REWARDS TABLE
    // ─────────────────────────────────────────────────
    if (!(await tableExists('Rewards'))) {
      console.log('Creating Rewards table...');

      await safeCreateEnum('enum_Rewards_tier', ['bronze', 'silver', 'gold', 'platinum']);
      await safeCreateEnum('enum_Rewards_rewardType', ['session', 'product', 'discount', 'service', 'other']);

      await queryInterface.createTable('Rewards', {
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
        icon: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'Gift'
        },
        pointCost: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 500
        },
        tier: {
          type: Sequelize.ENUM('bronze', 'silver', 'gold', 'platinum'),
          allowNull: false,
          defaultValue: 'bronze'
        },
        stock: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 10
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        redemptionCount: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        imageUrl: {
          type: Sequelize.STRING,
          allowNull: true
        },
        rewardType: {
          type: Sequelize.ENUM('session', 'product', 'discount', 'service', 'other'),
          allowNull: false,
          defaultValue: 'other'
        },
        expiresAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        }
      });
      console.log('  ✓ Rewards table created');
    } else {
      console.log('  ~ Rewards table already exists');
    }

    // ─────────────────────────────────────────────────
    // 3. MILESTONES TABLE
    // ─────────────────────────────────────────────────
    if (!(await tableExists('Milestones'))) {
      console.log('Creating Milestones table...');

      await safeCreateEnum('enum_Milestones_tier', ['bronze', 'silver', 'gold', 'platinum']);

      await queryInterface.createTable('Milestones', {
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
        targetPoints: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        tier: {
          type: Sequelize.ENUM('bronze', 'silver', 'gold', 'platinum'),
          allowNull: false,
          defaultValue: 'bronze'
        },
        bonusPoints: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 100
        },
        icon: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'Star'
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        imageUrl: {
          type: Sequelize.STRING,
          allowNull: true
        },
        requiredForPromotion: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        }
      });
      console.log('  ✓ Milestones table created');
    } else {
      console.log('  ~ Milestones table already exists');
    }

    // ─────────────────────────────────────────────────
    // 4. USER ACHIEVEMENTS TABLE
    // (May already exist from 20260301000100 migration)
    // ─────────────────────────────────────────────────
    if (!(await tableExists('UserAchievements'))) {
      console.log('Creating UserAchievements table...');
      await queryInterface.createTable('UserAchievements', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        userId: {
          type: Sequelize.INTEGER,  // INTEGER to match Users.id
          allowNull: false,
          references: { model: 'Users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        achievementId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'Achievements', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        earnedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        progress: {
          type: Sequelize.FLOAT,
          allowNull: false,
          defaultValue: 0
        },
        isCompleted: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        pointsAwarded: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        notificationSent: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        }
      });
      await safeAddIndex('UserAchievements', ['userId', 'achievementId'], {
        unique: true,
        name: 'user_achievement_unique'
      });
      console.log('  ✓ UserAchievements table created');
    } else {
      console.log('  ~ UserAchievements table already exists');
    }

    // ─────────────────────────────────────────────────
    // 5. USER REWARDS TABLE
    // ─────────────────────────────────────────────────
    if (!(await tableExists('UserRewards'))) {
      console.log('Creating UserRewards table...');

      await safeCreateEnum('enum_UserRewards_status', ['pending', 'fulfilled', 'cancelled', 'expired']);

      await queryInterface.createTable('UserRewards', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        userId: {
          type: Sequelize.INTEGER,  // INTEGER to match Users.id
          allowNull: false,
          references: { model: 'Users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        rewardId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'Rewards', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        redeemedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        pointsCost: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        status: {
          type: Sequelize.ENUM('pending', 'fulfilled', 'cancelled', 'expired'),
          allowNull: false,
          defaultValue: 'pending'
        },
        fulfillmentDetails: {
          type: Sequelize.JSON,
          allowNull: true
        },
        expiresAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        fulfilledBy: {
          type: Sequelize.INTEGER,  // INTEGER to match Users.id
          allowNull: true,
          references: { model: 'Users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        fulfilledAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        }
      });
      console.log('  ✓ UserRewards table created');
    } else {
      console.log('  ~ UserRewards table already exists');
    }

    // ─────────────────────────────────────────────────
    // 6. USER MILESTONES TABLE
    // ─────────────────────────────────────────────────
    if (!(await tableExists('UserMilestones'))) {
      console.log('Creating UserMilestones table...');
      await queryInterface.createTable('UserMilestones', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        userId: {
          type: Sequelize.INTEGER,  // INTEGER to match Users.id
          allowNull: false,
          references: { model: 'Users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        milestoneId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'Milestones', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        reachedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        bonusPointsAwarded: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        notificationSent: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        }
      });
      await safeAddIndex('UserMilestones', ['userId', 'milestoneId'], {
        unique: true,
        name: 'user_milestone_unique'
      });
      console.log('  ✓ UserMilestones table created');
    } else {
      console.log('  ~ UserMilestones table already exists');
    }

    // ─────────────────────────────────────────────────
    // 7. POINT TRANSACTIONS TABLE
    // ─────────────────────────────────────────────────
    if (!(await tableExists('PointTransactions'))) {
      console.log('Creating PointTransactions table...');

      await safeCreateEnum('enum_PointTransactions_transactionType',
        ['earn', 'spend', 'adjustment', 'bonus', 'expire']);
      await safeCreateEnum('enum_PointTransactions_source', [
        'workout_completion', 'exercise_completion', 'streak_bonus', 'level_up',
        'achievement_earned', 'milestone_reached', 'reward_redemption',
        'package_purchase', 'friend_referral', 'admin_adjustment',
        'trainer_award', 'challenge_completion'
      ]);

      await queryInterface.createTable('PointTransactions', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        userId: {
          type: Sequelize.INTEGER,  // INTEGER to match Users.id
          allowNull: false,
          references: { model: 'Users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        points: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        balance: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        transactionType: {
          type: Sequelize.ENUM('earn', 'spend', 'adjustment', 'bonus', 'expire'),
          allowNull: false
        },
        source: {
          type: Sequelize.ENUM(
            'workout_completion', 'exercise_completion', 'streak_bonus', 'level_up',
            'achievement_earned', 'milestone_reached', 'reward_redemption',
            'package_purchase', 'friend_referral', 'admin_adjustment',
            'trainer_award', 'challenge_completion'
          ),
          allowNull: false
        },
        sourceId: {
          type: Sequelize.UUID,
          allowNull: true
        },
        description: {
          type: Sequelize.STRING,
          allowNull: false
        },
        metadata: {
          type: Sequelize.JSON,
          allowNull: true
        },
        awardedBy: {
          type: Sequelize.INTEGER,  // INTEGER to match Users.id
          allowNull: true,
          references: { model: 'Users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        }
      });

      await safeAddIndex('PointTransactions', ['userId']);
      await safeAddIndex('PointTransactions', ['transactionType']);
      await safeAddIndex('PointTransactions', ['source']);
      await safeAddIndex('PointTransactions', ['createdAt']);
      console.log('  ✓ PointTransactions table created');
    } else {
      console.log('  ~ PointTransactions table already exists');
    }

    // ─────────────────────────────────────────────────
    // 8. GAMIFICATION SETTINGS TABLE
    // ─────────────────────────────────────────────────
    if (!(await tableExists('GamificationSettings'))) {
      console.log('Creating GamificationSettings table...');
      await queryInterface.createTable('GamificationSettings', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        isEnabled: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        pointsPerWorkout: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 50
        },
        pointsPerExercise: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 10
        },
        pointsPerStreak: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 20
        },
        pointsPerLevel: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 100
        },
        pointsPerReview: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 15
        },
        pointsPerReferral: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 200
        },
        tierThresholds: {
          type: Sequelize.JSON,
          allowNull: false,
          defaultValue: {
            bronze: 0,
            silver: 1000,
            gold: 5000,
            platinum: 20000
          }
        },
        levelRequirements: {
          type: Sequelize.JSON,
          allowNull: true
        },
        pointsMultiplier: {
          type: Sequelize.FLOAT,
          allowNull: false,
          defaultValue: 1.0
        },
        enableLeaderboards: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        enableNotifications: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        autoAwardAchievements: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        }
      });
      console.log('  ✓ GamificationSettings table created');
    } else {
      console.log('  ~ GamificationSettings table already exists');
    }

    // ─────────────────────────────────────────────────
    // 9. ADD GAMIFICATION FIELDS TO USERS TABLE
    // ─────────────────────────────────────────────────
    console.log('Checking gamification fields on Users table...');

    // Create tier ENUM if not exists
    await safeCreateEnum('enum_users_tier', ['bronze', 'silver', 'gold', 'platinum']);

    const userGamificationColumns = [
      { name: 'points', def: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 } },
      { name: 'level', def: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 } },
      { name: 'tier', def: { type: Sequelize.STRING, allowNull: true, defaultValue: 'bronze' } },
      { name: 'streakDays', def: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 } },
      { name: 'lastActivityDate', def: { type: Sequelize.DATE, allowNull: true } },
      { name: 'totalWorkouts', def: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 } },
      { name: 'totalExercises', def: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 } },
      { name: 'exercisesCompleted', def: { type: Sequelize.JSON, allowNull: true, defaultValue: {} } },
    ];

    for (const col of userGamificationColumns) {
      await safeAddColumn('Users', col.name, col.def);
    }

    console.log('=== Gamification Bootstrap Migration Complete ===');
  },

  async down(queryInterface, Sequelize) {
    // Drop tables in reverse dependency order
    const tables = [
      'UserMilestones', 'UserRewards', 'UserAchievements',
      'PointTransactions', 'GamificationSettings',
      'Milestones', 'Rewards', 'Achievements'
    ];

    for (const table of tables) {
      try {
        await queryInterface.dropTable(table);
        console.log(`  Dropped ${table}`);
      } catch (e) {
        console.log(`  Could not drop ${table}: ${e.message}`);
      }
    }

    // Remove gamification columns from Users
    const userColumns = [
      'points', 'level', 'tier', 'streakDays', 'lastActivityDate',
      'totalWorkouts', 'totalExercises', 'exercisesCompleted'
    ];
    for (const col of userColumns) {
      try {
        await queryInterface.removeColumn('Users', col);
      } catch (e) {
        console.log(`  Could not remove Users.${col}: ${e.message}`);
      }
    }
  }
};
