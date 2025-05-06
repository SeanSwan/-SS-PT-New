import {
  User,
  Achievement,
  Reward,
  Milestone,
  PointTransaction,
  Exercise,
  Gamification,
  GamificationSettings
} from '../models/associations.mjs';

// These models aren't exported directly from associations but are created through Sequelize's associations
import UserAchievement from '../models/UserAchievement.mjs';
import UserReward from '../models/UserReward.mjs';
import UserMilestone from '../models/UserMilestone.mjs';
import { Op } from 'sequelize';
import db from '../database.mjs';

/**
 * Gamification Controller
 * Handles achievement, reward, and point management
 */
const gamificationController = {
  /**
   * Get gamification settings
   */
  getSettings: async (req, res) => {
    try {
      let settings = await GamificationSettings.findOne();
      
      if (!settings) {
        // Create default settings if none exist
        settings = await GamificationSettings.create({
          isEnabled: true,
          pointsPerWorkout: 50,
          pointsPerExercise: 10,
          pointsPerStreak: 20,
          pointsPerLevel: 100,
          pointsPerReview: 15,
          pointsPerReferral: 200,
          tierThresholds: {
            bronze: 0,
            silver: 1000,
            gold: 5000,
            platinum: 20000
          }
        });
      }
      
      return res.status(200).json({ success: true, settings });
    } catch (error) {
      console.error('Error getting gamification settings:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get gamification settings',
        error: error.message
      });
    }
  },

  /**
   * Update gamification settings
   */
  updateSettings: async (req, res) => {
    try {
      const {
        isEnabled,
        pointsPerWorkout,
        pointsPerExercise,
        pointsPerStreak,
        pointsPerLevel,
        pointsPerReview,
        pointsPerReferral,
        tierThresholds,
        levelRequirements,
        pointsMultiplier,
        enableLeaderboards,
        enableNotifications,
        autoAwardAchievements
      } = req.body;
      
      let settings = await GamificationSettings.findOne();
      
      if (!settings) {
        settings = await GamificationSettings.create({
          isEnabled: isEnabled ?? true,
          pointsPerWorkout: pointsPerWorkout ?? 50,
          pointsPerExercise: pointsPerExercise ?? 10,
          pointsPerStreak: pointsPerStreak ?? 20,
          pointsPerLevel: pointsPerLevel ?? 100,
          pointsPerReview: pointsPerReview ?? 15,
          pointsPerReferral: pointsPerReferral ?? 200,
          tierThresholds: tierThresholds ?? {
            bronze: 0,
            silver: 1000,
            gold: 5000,
            platinum: 20000
          },
          levelRequirements: levelRequirements ?? null,
          pointsMultiplier: pointsMultiplier ?? 1.0,
          enableLeaderboards: enableLeaderboards ?? true,
          enableNotifications: enableNotifications ?? true,
          autoAwardAchievements: autoAwardAchievements ?? true
        });
      } else {
        const updatedFields = {};
        
        if (isEnabled !== undefined) updatedFields.isEnabled = isEnabled;
        if (pointsPerWorkout !== undefined) updatedFields.pointsPerWorkout = pointsPerWorkout;
        if (pointsPerExercise !== undefined) updatedFields.pointsPerExercise = pointsPerExercise;
        if (pointsPerStreak !== undefined) updatedFields.pointsPerStreak = pointsPerStreak;
        if (pointsPerLevel !== undefined) updatedFields.pointsPerLevel = pointsPerLevel;
        if (pointsPerReview !== undefined) updatedFields.pointsPerReview = pointsPerReview;
        if (pointsPerReferral !== undefined) updatedFields.pointsPerReferral = pointsPerReferral;
        if (tierThresholds !== undefined) updatedFields.tierThresholds = tierThresholds;
        if (levelRequirements !== undefined) updatedFields.levelRequirements = levelRequirements;
        if (pointsMultiplier !== undefined) updatedFields.pointsMultiplier = pointsMultiplier;
        if (enableLeaderboards !== undefined) updatedFields.enableLeaderboards = enableLeaderboards;
        if (enableNotifications !== undefined) updatedFields.enableNotifications = enableNotifications;
        if (autoAwardAchievements !== undefined) updatedFields.autoAwardAchievements = autoAwardAchievements;
        
        await settings.update(updatedFields);
      }
      
      return res.status(200).json({
        success: true,
        message: 'Gamification settings updated successfully',
        settings
      });
    } catch (error) {
      console.error('Error updating gamification settings:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update gamification settings',
        error: error.message
      });
    }
  },

  /**
   * Get user gamification profile
   */
  getUserProfile: async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Get user with achievements, rewards, and milestones
      const user = await User.findByPk(userId, {
        attributes: [
          'id', 'firstName', 'lastName', 'username', 'photo',
          'points', 'level', 'tier', 'streakDays', 'totalWorkouts',
          'totalExercises', 'badgesPrimary'
        ],
        include: [
          {
            model: UserAchievement,
            as: 'achievements',
            include: [{
              model: Achievement,
              as: 'achievement'
            }]
          },
          {
            model: UserReward,
            as: 'rewards',
            include: [{
              model: Reward,
              as: 'reward'
            }]
          },
          {
            model: UserMilestone,
            as: 'milestones',
            include: [{
              model: Milestone,
              as: 'milestone'
            }]
          },
          {
            model: Achievement,
            as: 'primaryBadge'
          }
        ]
      });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Get leaderboard position
      const leaderboardPosition = await User.count({
        where: {
          points: {
            [Op.gt]: user.points
          }
        }
      }) + 1;
      
      // Get recent point transactions
      const recentTransactions = await PointTransaction.findAll({
        where: { userId },
        limit: 10,
        order: [['createdAt', 'DESC']]
      });
      
      // Get next milestone
      const nextMilestone = await Milestone.findOne({
        where: {
          targetPoints: {
            [Op.gt]: user.points
          },
          isActive: true
        },
        order: [['targetPoints', 'ASC']]
      });
      
      // Calculate progress to next level/tier
      const settings = await GamificationSettings.findOne();
      let nextLevelPoints = 0;
      let nextLevelProgress = 0;
      let nextTierProgress = 0;
      let nextTier = null;
      
      if (settings) {
        // Calculate next level if we have level requirements
        if (settings.levelRequirements && settings.levelRequirements[user.level + 1]) {
          nextLevelPoints = settings.levelRequirements[user.level + 1];
          const currentLevelPoints = settings.levelRequirements[user.level] || 0;
          nextLevelProgress = ((user.points - currentLevelPoints) / (nextLevelPoints - currentLevelPoints)) * 100;
        }
        
        // Calculate next tier progress
        if (user.tier !== 'platinum' && settings.tierThresholds) {
          const currentTierThreshold = settings.tierThresholds[user.tier] || 0;
          let nextTierThreshold = 0;
          
          if (user.tier === 'bronze') {
            nextTier = 'silver';
            nextTierThreshold = settings.tierThresholds.silver;
          } else if (user.tier === 'silver') {
            nextTier = 'gold';
            nextTierThreshold = settings.tierThresholds.gold;
          } else if (user.tier === 'gold') {
            nextTier = 'platinum';
            nextTierThreshold = settings.tierThresholds.platinum;
          }
          
          nextTierProgress = ((user.points - currentTierThreshold) / (nextTierThreshold - currentTierThreshold)) * 100;
        }
      }
      
      return res.status(200).json({
        success: true,
        profile: {
          ...user.toJSON(),
          leaderboardPosition,
          recentTransactions,
          nextMilestone,
          nextLevelProgress,
          nextLevelPoints,
          nextTierProgress,
          nextTier
        }
      });
    } catch (error) {
      console.error('Error getting user gamification profile:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get user gamification profile',
        error: error.message
      });
    }
  },

  /**
   * Get leaderboard
   */
  getLeaderboard: async (req, res) => {
    try {
      const { limit = 10, page = 1, tier } = req.query;
      const offset = (page - 1) * limit;
      
      const whereClause = {};
      if (tier) {
        whereClause.tier = tier;
      }
      
      const leaderboard = await User.findAll({
        attributes: [
          'id', 'firstName', 'lastName', 'username', 'photo',
          'points', 'level', 'tier', 'badgesPrimary'
        ],
        where: whereClause,
        order: [['points', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset),
        include: [{
          model: Achievement,
          as: 'primaryBadge',
          attributes: ['id', 'name', 'icon', 'badgeImageUrl']
        }]
      });
      
      const total = await User.count({ where: whereClause });
      
      return res.status(200).json({
        success: true,
        leaderboard,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get leaderboard',
        error: error.message
      });
    }
  },

  /**
   * Award points to a user
   */
  awardPoints: async (req, res) => {
    const transaction = await db.transaction();
    
    try {
      const { userId } = req.params;
      const { 
        points, 
        transactionType = 'earn', 
        source, 
        sourceId,
        description,
        metadata
      } = req.body;
      
      if (!points || !source || !description) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Points, source, and description are required'
        });
      }
      
      // Get current user points
      const user = await User.findByPk(userId, { transaction });
      
      if (!user) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Get settings
      const settings = await GamificationSettings.findOne({ transaction });
      
      // Apply multiplier if settings exist and feature is enabled
      const pointsToAward = settings && settings.isEnabled 
        ? Math.round(points * (settings.pointsMultiplier || 1)) 
        : points;
      
      // Calculate new balance
      const newBalance = transactionType === 'earn' || transactionType === 'bonus'
        ? user.points + pointsToAward
        : transactionType === 'spend' || transactionType === 'expire'
          ? user.points - pointsToAward
          : user.points + pointsToAward; // for adjustments, we trust the provided amount
      
      // Create transaction record
      const pointTransaction = await PointTransaction.create({
        userId,
        points: pointsToAward,
        balance: newBalance,
        transactionType,
        source,
        sourceId,
        description,
        metadata,
        awardedBy: req.user?.id // From auth middleware
      }, { transaction });
      
      // Update user points
      await user.update({ points: newBalance }, { transaction });
      
      // Check if user has reached new tier
      if (settings && settings.tierThresholds) {
        let newTier = user.tier;
        
        if (newBalance >= settings.tierThresholds.platinum && user.tier !== 'platinum') {
          newTier = 'platinum';
        } else if (newBalance >= settings.tierThresholds.gold && user.tier !== 'gold' && user.tier !== 'platinum') {
          newTier = 'gold';
        } else if (newBalance >= settings.tierThresholds.silver && user.tier !== 'silver' && user.tier !== 'gold' && user.tier !== 'platinum') {
          newTier = 'silver';
        }
        
        if (newTier !== user.tier) {
          await user.update({ tier: newTier }, { transaction });
          
          // Find milestone for this tier
          const tierMilestone = await Milestone.findOne({
            where: {
              tier: newTier,
              isActive: true
            },
            transaction
          });
          
          if (tierMilestone) {
            // Check if user already has this milestone
            const existingMilestone = await UserMilestone.findOne({
              where: {
                userId,
                milestoneId: tierMilestone.id
              },
              transaction
            });
            
            if (!existingMilestone) {
              // Award milestone to user
              await UserMilestone.create({
                userId,
                milestoneId: tierMilestone.id,
                reachedAt: new Date(),
                bonusPointsAwarded: tierMilestone.bonusPoints
              }, { transaction });
              
              // Award bonus points
              if (tierMilestone.bonusPoints > 0) {
                const bonusBalance = newBalance + tierMilestone.bonusPoints;
                
                await PointTransaction.create({
                  userId,
                  points: tierMilestone.bonusPoints,
                  balance: bonusBalance,
                  transactionType: 'bonus',
                  source: 'milestone_reached',
                  sourceId: tierMilestone.id,
                  description: `Milestone Bonus: ${tierMilestone.name}`,
                  metadata: { milestoneId: tierMilestone.id }
                }, { transaction });
                
                // Update user points again
                await user.update({ points: bonusBalance }, { transaction });
              }
            }
          }
        }
      }
      
      // Commit the transaction
      await transaction.commit();
      
      return res.status(200).json({
        success: true,
        message: 'Points awarded successfully',
        pointTransaction,
        newBalance
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error awarding points:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to award points',
        error: error.message
      });
    }
  },

  /**
   * Get all achievements
   */
  getAllAchievements: async (req, res) => {
    try {
      const { isActive, tier } = req.query;
      
      const whereClause = {};
      
      if (isActive !== undefined) {
        whereClause.isActive = isActive === 'true';
      }
      
      if (tier) {
        whereClause.tier = tier;
      }
      
      const achievements = await Achievement.findAll({
        where: whereClause,
        order: [
          ['tier', 'ASC'],
          ['requirementValue', 'ASC'],
          ['name', 'ASC']
        ],
        include: [{
          model: Exercise,
          as: 'exercise',
          attributes: ['id', 'name'],
          required: false
        }]
      });
      
      return res.status(200).json({ success: true, achievements });
    } catch (error) {
      console.error('Error getting achievements:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get achievements',
        error: error.message
      });
    }
  },

  /**
   * Get a single achievement
   */
  getAchievement: async (req, res) => {
    try {
      const { id } = req.params;
      
      const achievement = await Achievement.findByPk(id, {
        include: [{
          model: Exercise,
          as: 'exercise',
          attributes: ['id', 'name'],
          required: false
        }]
      });
      
      if (!achievement) {
        return res.status(404).json({
          success: false,
          message: 'Achievement not found'
        });
      }
      
      return res.status(200).json({ success: true, achievement });
    } catch (error) {
      console.error('Error getting achievement:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get achievement',
        error: error.message
      });
    }
  },

  /**
   * Create a new achievement
   */
  createAchievement: async (req, res) => {
    try {
      const {
        name,
        description,
        icon,
        pointValue,
        requirementType,
        requirementValue,
        tier,
        isActive,
        exerciseId,
        specificRequirement,
        badgeImageUrl
      } = req.body;
      
      if (!name || !description || !requirementType || !tier) {
        return res.status(400).json({
          success: false,
          message: 'Name, description, requirementType, and tier are required'
        });
      }
      
      const achievement = await Achievement.create({
        name,
        description,
        icon: icon || 'Award',
        pointValue: pointValue || 100,
        requirementType,
        requirementValue: requirementValue || 1,
        tier,
        isActive: isActive !== undefined ? isActive : true,
        exerciseId: requirementType === 'specific_exercise' ? exerciseId : null,
        specificRequirement,
        badgeImageUrl
      });
      
      return res.status(201).json({
        success: true,
        message: 'Achievement created successfully',
        achievement
      });
    } catch (error) {
      console.error('Error creating achievement:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create achievement',
        error: error.message
      });
    }
  },

  /**
   * Update an achievement
   */
  updateAchievement: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        name,
        description,
        icon,
        pointValue,
        requirementType,
        requirementValue,
        tier,
        isActive,
        exerciseId,
        specificRequirement,
        badgeImageUrl
      } = req.body;
      
      const achievement = await Achievement.findByPk(id);
      
      if (!achievement) {
        return res.status(404).json({
          success: false,
          message: 'Achievement not found'
        });
      }
      
      const updatedFields = {};
      
      if (name !== undefined) updatedFields.name = name;
      if (description !== undefined) updatedFields.description = description;
      if (icon !== undefined) updatedFields.icon = icon;
      if (pointValue !== undefined) updatedFields.pointValue = pointValue;
      if (requirementType !== undefined) updatedFields.requirementType = requirementType;
      if (requirementValue !== undefined) updatedFields.requirementValue = requirementValue;
      if (tier !== undefined) updatedFields.tier = tier;
      if (isActive !== undefined) updatedFields.isActive = isActive;
      if (badgeImageUrl !== undefined) updatedFields.badgeImageUrl = badgeImageUrl;
      
      if (requirementType === 'specific_exercise') {
        if (exerciseId !== undefined) updatedFields.exerciseId = exerciseId;
      } else {
        updatedFields.exerciseId = null;
      }
      
      if (specificRequirement !== undefined) {
        updatedFields.specificRequirement = specificRequirement;
      }
      
      await achievement.update(updatedFields);
      
      return res.status(200).json({
        success: true,
        message: 'Achievement updated successfully',
        achievement
      });
    } catch (error) {
      console.error('Error updating achievement:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update achievement',
        error: error.message
      });
    }
  },

  /**
   * Delete an achievement
   */
  deleteAchievement: async (req, res) => {
    const transaction = await db.transaction();
    
    try {
      const { id } = req.params;
      
      const achievement = await Achievement.findByPk(id, { transaction });
      
      if (!achievement) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Achievement not found'
        });
      }
      
      // Delete all user achievement records
      await UserAchievement.destroy({
        where: { achievementId: id },
        transaction
      });
      
      // Update any users with this badge as primary
      await User.update(
        { badgesPrimary: null },
        { 
          where: { badgesPrimary: id },
          transaction
        }
      );
      
      // Delete the achievement
      await achievement.destroy({ transaction });
      
      // Commit the transaction
      await transaction.commit();
      
      return res.status(200).json({
        success: true,
        message: 'Achievement deleted successfully'
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error deleting achievement:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete achievement',
        error: error.message
      });
    }
  },

  /**
   * Award an achievement to a user
   */
  awardAchievement: async (req, res) => {
    const transaction = await db.transaction();
    
    try {
      const { userId, achievementId } = req.params;
      
      // Check if user exists
      const user = await User.findByPk(userId, { transaction });
      
      if (!user) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Check if achievement exists
      const achievement = await Achievement.findByPk(achievementId, { transaction });
      
      if (!achievement) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Achievement not found'
        });
      }
      
      // Check if user already has this achievement
      let userAchievement = await UserAchievement.findOne({
        where: {
          userId,
          achievementId
        },
        transaction
      });
      
      if (userAchievement) {
        if (userAchievement.isCompleted) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: 'User already has this achievement'
          });
        } else {
          // Update existing progress record to completed
          await userAchievement.update({
            isCompleted: true,
            progress: 100,
            earnedAt: new Date(),
            pointsAwarded: achievement.pointValue
          }, { transaction });
        }
      } else {
        // Create new user achievement record
        userAchievement = await UserAchievement.create({
          userId,
          achievementId,
          isCompleted: true,
          progress: 100,
          earnedAt: new Date(),
          pointsAwarded: achievement.pointValue
        }, { transaction });
      }
      
      // Award points to user
      const newBalance = user.points + achievement.pointValue;
      
      await PointTransaction.create({
        userId,
        points: achievement.pointValue,
        balance: newBalance,
        transactionType: 'earn',
        source: 'achievement_earned',
        sourceId: achievement.id,
        description: `Achievement Earned: ${achievement.name}`,
        metadata: { achievementId: achievement.id }
      }, { transaction });
      
      // Update user points
      await user.update({ points: newBalance }, { transaction });
      
      // Commit the transaction
      await transaction.commit();
      
      return res.status(200).json({
        success: true,
        message: 'Achievement awarded successfully',
        userAchievement
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error awarding achievement:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to award achievement',
        error: error.message
      });
    }
  },

  /**
   * Update user achievement progress
   */
  updateAchievementProgress: async (req, res) => {
    try {
      const { userId, achievementId } = req.params;
      const { progress } = req.body;
      
      if (progress === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Progress is required'
        });
      }
      
      // Check if user achievement exists
      let userAchievement = await UserAchievement.findOne({
        where: {
          userId,
          achievementId
        },
        include: [{
          model: Achievement,
          as: 'achievement'
        }]
      });
      
      if (!userAchievement) {
        // Create new record with initial progress
        const achievement = await Achievement.findByPk(achievementId);
        
        if (!achievement) {
          return res.status(404).json({
            success: false,
            message: 'Achievement not found'
          });
        }
        
        userAchievement = await UserAchievement.create({
          userId,
          achievementId,
          progress: Math.min(100, Math.max(0, progress)),
          isCompleted: progress >= 100
        });
        
        // If completed, award points
        if (progress >= 100) {
          // Get user
          const user = await User.findByPk(userId);
          
          if (user) {
            const newBalance = user.points + achievement.pointValue;
            
            // Create point transaction
            await PointTransaction.create({
              userId,
              points: achievement.pointValue,
              balance: newBalance,
              transactionType: 'earn',
              source: 'achievement_earned',
              sourceId: achievement.id,
              description: `Achievement Earned: ${achievement.name}`,
              metadata: { achievementId: achievement.id }
            });
            
            // Update user points
            await user.update({ points: newBalance });
            
            // Update pointsAwarded in userAchievement
            await userAchievement.update({ pointsAwarded: achievement.pointValue });
          }
        }
      } else {
        // Only update if not already completed
        if (!userAchievement.isCompleted) {
          const newProgress = Math.min(100, Math.max(0, progress));
          const wasCompleted = userAchievement.progress < 100 && newProgress >= 100;
          
          await userAchievement.update({
            progress: newProgress,
            isCompleted: newProgress >= 100,
            earnedAt: newProgress >= 100 ? new Date() : userAchievement.earnedAt
          });
          
          // If newly completed, award points
          if (wasCompleted) {
            // Get user
            const user = await User.findByPk(userId);
            
            if (user && userAchievement.achievement) {
              const newBalance = user.points + userAchievement.achievement.pointValue;
              
              // Create point transaction
              await PointTransaction.create({
                userId,
                points: userAchievement.achievement.pointValue,
                balance: newBalance,
                transactionType: 'earn',
                source: 'achievement_earned',
                sourceId: userAchievement.achievement.id,
                description: `Achievement Earned: ${userAchievement.achievement.name}`,
                metadata: { achievementId: userAchievement.achievement.id }
              });
              
              // Update user points
              await user.update({ points: newBalance });
              
              // Update pointsAwarded in userAchievement
              await userAchievement.update({ pointsAwarded: userAchievement.achievement.pointValue });
            }
          }
        }
      }
      
      return res.status(200).json({
        success: true,
        message: 'Achievement progress updated',
        userAchievement
      });
    } catch (error) {
      console.error('Error updating achievement progress:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update achievement progress',
        error: error.message
      });
    }
  },

  /**
   * Get all rewards
   */
  getAllRewards: async (req, res) => {
    try {
      const { isActive, tier } = req.query;
      
      const whereClause = {};
      
      if (isActive !== undefined) {
        whereClause.isActive = isActive === 'true';
      }
      
      if (tier) {
        whereClause.tier = tier;
      }
      
      const rewards = await Reward.findAll({
        where: whereClause,
        order: [
          ['tier', 'ASC'],
          ['pointCost', 'ASC'],
          ['name', 'ASC']
        ]
      });
      
      return res.status(200).json({ success: true, rewards });
    } catch (error) {
      console.error('Error getting rewards:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get rewards',
        error: error.message
      });
    }
  },

  /**
   * Get a single reward
   */
  getReward: async (req, res) => {
    try {
      const { id } = req.params;
      
      const reward = await Reward.findByPk(id);
      
      if (!reward) {
        return res.status(404).json({
          success: false,
          message: 'Reward not found'
        });
      }
      
      return res.status(200).json({ success: true, reward });
    } catch (error) {
      console.error('Error getting reward:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get reward',
        error: error.message
      });
    }
  },

  /**
   * Create a new reward
   */
  createReward: async (req, res) => {
    try {
      const {
        name,
        description,
        icon,
        pointCost,
        tier,
        stock,
        isActive,
        imageUrl,
        rewardType,
        expiresAt
      } = req.body;
      
      if (!name || !description || !tier) {
        return res.status(400).json({
          success: false,
          message: 'Name, description, and tier are required'
        });
      }
      
      const reward = await Reward.create({
        name,
        description,
        icon: icon || 'Gift',
        pointCost: pointCost || 500,
        tier,
        stock: stock || 10,
        isActive: isActive !== undefined ? isActive : true,
        imageUrl,
        rewardType: rewardType || 'other',
        expiresAt: expiresAt || null
      });
      
      return res.status(201).json({
        success: true,
        message: 'Reward created successfully',
        reward
      });
    } catch (error) {
      console.error('Error creating reward:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create reward',
        error: error.message
      });
    }
  },

  /**
   * Update a reward
   */
  updateReward: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        name,
        description,
        icon,
        pointCost,
        tier,
        stock,
        isActive,
        imageUrl,
        rewardType,
        expiresAt
      } = req.body;
      
      const reward = await Reward.findByPk(id);
      
      if (!reward) {
        return res.status(404).json({
          success: false,
          message: 'Reward not found'
        });
      }
      
      const updatedFields = {};
      
      if (name !== undefined) updatedFields.name = name;
      if (description !== undefined) updatedFields.description = description;
      if (icon !== undefined) updatedFields.icon = icon;
      if (pointCost !== undefined) updatedFields.pointCost = pointCost;
      if (tier !== undefined) updatedFields.tier = tier;
      if (stock !== undefined) updatedFields.stock = stock;
      if (isActive !== undefined) updatedFields.isActive = isActive;
      if (imageUrl !== undefined) updatedFields.imageUrl = imageUrl;
      if (rewardType !== undefined) updatedFields.rewardType = rewardType;
      if (expiresAt !== undefined) updatedFields.expiresAt = expiresAt;
      
      await reward.update(updatedFields);
      
      return res.status(200).json({
        success: true,
        message: 'Reward updated successfully',
        reward
      });
    } catch (error) {
      console.error('Error updating reward:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update reward',
        error: error.message
      });
    }
  },

  /**
   * Delete a reward
   */
  deleteReward: async (req, res) => {
    const transaction = await db.transaction();
    
    try {
      const { id } = req.params;
      
      const reward = await Reward.findByPk(id, { transaction });
      
      if (!reward) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Reward not found'
        });
      }
      
      // Check if reward has been redeemed
      const redemptionCount = await UserReward.count({
        where: { rewardId: id },
        transaction
      });
      
      if (redemptionCount > 0) {
        // Set to inactive instead of deleting
        await reward.update({ isActive: false }, { transaction });
        
        await transaction.commit();
        
        return res.status(200).json({
          success: true,
          message: 'Reward has redemptions. It has been deactivated instead of deleted.'
        });
      }
      
      // No redemptions, safe to delete
      await reward.destroy({ transaction });
      
      // Commit the transaction
      await transaction.commit();
      
      return res.status(200).json({
        success: true,
        message: 'Reward deleted successfully'
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error deleting reward:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete reward',
        error: error.message
      });
    }
  },

  /**
   * Redeem a reward
   */
  redeemReward: async (req, res) => {
    const transaction = await db.transaction();
    
    try {
      const { userId, rewardId } = req.params;
      
      // Check if user exists
      const user = await User.findByPk(userId, { transaction });
      
      if (!user) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Check if reward exists and is active
      const reward = await Reward.findOne({
        where: {
          id: rewardId,
          isActive: true
        },
        transaction
      });
      
      if (!reward) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Reward not found or inactive'
        });
      }
      
      // Check if reward is expired
      if (reward.expiresAt && new Date(reward.expiresAt) < new Date()) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'This reward has expired'
        });
      }
      
      // Check if reward is in stock
      if (reward.stock <= 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'This reward is out of stock'
        });
      }
      
      // Check if user has enough points
      if (user.points < reward.pointCost) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Insufficient points to redeem this reward'
        });
      }
      
      // Create user reward record
      const userReward = await UserReward.create({
        userId,
        rewardId,
        redeemedAt: new Date(),
        status: 'pending',
        pointsCost: reward.pointCost,
        expiresAt: reward.expiresAt
      }, { transaction });
      
      // Deduct points from user
      const newBalance = user.points - reward.pointCost;
      
      await PointTransaction.create({
        userId,
        points: reward.pointCost,
        balance: newBalance,
        transactionType: 'spend',
        source: 'reward_redemption',
        sourceId: reward.id,
        description: `Reward Redeemed: ${reward.name}`,
        metadata: { rewardId: reward.id }
      }, { transaction });
      
      // Update user points
      await user.update({ points: newBalance }, { transaction });
      
      // Update reward stock and redemption count
      await reward.update({
        stock: reward.stock - 1,
        redemptionCount: reward.redemptionCount + 1
      }, { transaction });
      
      // Commit the transaction
      await transaction.commit();
      
      return res.status(200).json({
        success: true,
        message: 'Reward redeemed successfully',
        userReward
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error redeeming reward:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to redeem reward',
        error: error.message
      });
    }
  },

  /**
   * Get all milestones
   */
  getAllMilestones: async (req, res) => {
    try {
      const { isActive, tier } = req.query;
      
      const whereClause = {};
      
      if (isActive !== undefined) {
        whereClause.isActive = isActive === 'true';
      }
      
      if (tier) {
        whereClause.tier = tier;
      }
      
      const milestones = await Milestone.findAll({
        where: whereClause,
        order: [
          ['targetPoints', 'ASC'],
          ['tier', 'ASC'],
          ['name', 'ASC']
        ]
      });
      
      return res.status(200).json({ success: true, milestones });
    } catch (error) {
      console.error('Error getting milestones:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get milestones',
        error: error.message
      });
    }
  },

  /**
   * Get a single milestone
   */
  getMilestone: async (req, res) => {
    try {
      const { id } = req.params;
      
      const milestone = await Milestone.findByPk(id);
      
      if (!milestone) {
        return res.status(404).json({
          success: false,
          message: 'Milestone not found'
        });
      }
      
      return res.status(200).json({ success: true, milestone });
    } catch (error) {
      console.error('Error getting milestone:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get milestone',
        error: error.message
      });
    }
  },

  /**
   * Create a new milestone
   */
  createMilestone: async (req, res) => {
    try {
      const {
        name,
        description,
        targetPoints,
        tier,
        bonusPoints,
        icon,
        isActive,
        imageUrl,
        requiredForPromotion
      } = req.body;
      
      if (!name || !description || !targetPoints || !tier) {
        return res.status(400).json({
          success: false,
          message: 'Name, description, targetPoints, and tier are required'
        });
      }
      
      const milestone = await Milestone.create({
        name,
        description,
        targetPoints,
        tier,
        bonusPoints: bonusPoints || 200,
        icon: icon || 'Star',
        isActive: isActive !== undefined ? isActive : true,
        imageUrl,
        requiredForPromotion: requiredForPromotion || false
      });
      
      return res.status(201).json({
        success: true,
        message: 'Milestone created successfully',
        milestone
      });
    } catch (error) {
      console.error('Error creating milestone:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create milestone',
        error: error.message
      });
    }
  },

  /**
   * Update a milestone
   */
  updateMilestone: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        name,
        description,
        targetPoints,
        tier,
        bonusPoints,
        icon,
        isActive,
        imageUrl,
        requiredForPromotion
      } = req.body;
      
      const milestone = await Milestone.findByPk(id);
      
      if (!milestone) {
        return res.status(404).json({
          success: false,
          message: 'Milestone not found'
        });
      }
      
      const updatedFields = {};
      
      if (name !== undefined) updatedFields.name = name;
      if (description !== undefined) updatedFields.description = description;
      if (targetPoints !== undefined) updatedFields.targetPoints = targetPoints;
      if (tier !== undefined) updatedFields.tier = tier;
      if (bonusPoints !== undefined) updatedFields.bonusPoints = bonusPoints;
      if (icon !== undefined) updatedFields.icon = icon;
      if (isActive !== undefined) updatedFields.isActive = isActive;
      if (imageUrl !== undefined) updatedFields.imageUrl = imageUrl;
      if (requiredForPromotion !== undefined) updatedFields.requiredForPromotion = requiredForPromotion;
      
      await milestone.update(updatedFields);
      
      return res.status(200).json({
        success: true,
        message: 'Milestone updated successfully',
        milestone
      });
    } catch (error) {
      console.error('Error updating milestone:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update milestone',
        error: error.message
      });
    }
  },

  /**
   * Delete a milestone
   */
  deleteMilestone: async (req, res) => {
    const transaction = await db.transaction();
    
    try {
      const { id } = req.params;
      
      const milestone = await Milestone.findByPk(id, { transaction });
      
      if (!milestone) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Milestone not found'
        });
      }
      
      // Delete all user milestone records
      await UserMilestone.destroy({
        where: { milestoneId: id },
        transaction
      });
      
      // Delete the milestone
      await milestone.destroy({ transaction });
      
      // Commit the transaction
      await transaction.commit();
      
      return res.status(200).json({
        success: true,
        message: 'Milestone deleted successfully'
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error deleting milestone:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete milestone',
        error: error.message
      });
    }
  },

  /**
   * Check and award milestones
   * This can be called manually or automatically after point updates
   */
  checkAndAwardMilestones: async (req, res) => {
    const transaction = await db.transaction();
    
    try {
      const { userId } = req.params;
      
      // Check if user exists
      const user = await User.findByPk(userId, { transaction });
      
      if (!user) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Get all milestones the user hasn't reached yet
      const unreachedMilestones = await Milestone.findAll({
        where: {
          targetPoints: { [Op.lte]: user.points },
          isActive: true
        },
        include: [{
          model: UserMilestone,
          as: 'userMilestones',
          where: { userId },
          required: false
        }],
        transaction
      });
      
      // Filter for milestones that haven't been awarded yet
      const newMilestones = unreachedMilestones.filter(
        milestone => milestone.userMilestones.length === 0
      );
      
      if (newMilestones.length === 0) {
        await transaction.commit();
        return res.status(200).json({
          success: true,
          message: 'No new milestones to award',
          awardedMilestones: []
        });
      }
      
      // Award new milestones
      const awardedMilestones = [];
      let totalBonusPoints = 0;
      
      for (const milestone of newMilestones) {
        // Create user milestone record
        const userMilestone = await UserMilestone.create({
          userId,
          milestoneId: milestone.id,
          reachedAt: new Date(),
          bonusPointsAwarded: milestone.bonusPoints
        }, { transaction });
        
        awardedMilestones.push(userMilestone);
        totalBonusPoints += milestone.bonusPoints;
      }
      
      // Award bonus points for all milestones in a single transaction
      if (totalBonusPoints > 0) {
        const newBalance = user.points + totalBonusPoints;
        
        // Create point transaction for bonuses
        await PointTransaction.create({
          userId,
          points: totalBonusPoints,
          balance: newBalance,
          transactionType: 'bonus',
          source: 'milestone_reached',
          description: `Milestone Bonuses: ${newMilestones.map(m => m.name).join(', ')}`,
          metadata: { milestoneIds: newMilestones.map(m => m.id) }
        }, { transaction });
        
        // Update user points
        await user.update({ points: newBalance }, { transaction });
      }
      
      // Commit the transaction
      await transaction.commit();
      
      return res.status(200).json({
        success: true,
        message: 'Milestones awarded successfully',
        awardedMilestones,
        totalBonusPoints,
        newBalance: user.points + totalBonusPoints
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error awarding milestones:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to award milestones',
        error: error.message
      });
    }
  },

  /**
   * Get user transaction history
   */
  getUserTransactions: async (req, res) => {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 20, type, source } = req.query;
      
      const whereClause = { userId };
      
      if (type) {
        whereClause.transactionType = type;
      }
      
      if (source) {
        whereClause.source = source;
      }
      
      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      const transactions = await PointTransaction.findAll({
        where: whereClause,
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset
      });
      
      const total = await PointTransaction.count({ where: whereClause });
      
      return res.status(200).json({
        success: true,
        transactions,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error getting user transactions:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get user transactions',
        error: error.message
      });
    }
  }
};

export default gamificationController;