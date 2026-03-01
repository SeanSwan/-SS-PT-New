import { getMeasurementMilestone, getBodyMeasurement } from '../models/index.mjs';
import { Op } from 'sequelize';

/**
 * Measurement Milestone Service
 * Detects achievement milestones and triggers renewal conversations
 * CRITICAL for client retention - 40-60% improvement when milestone → renewal conversation happens
 */

/**
 * Milestone configuration with thresholds and metadata
 */
const MILESTONE_CONFIG = {
  // Weight loss milestones
  weight_loss_5lbs: {
    title: 'Lost 5 Pounds!',
    description: 'You\'ve lost 5 pounds - great progress!',
    celebrationMessage: '🎉 Congratulations on losing 5 pounds! Your dedication is paying off!',
    threshold: -5,
    metricType: 'weight',
    triggersRenewal: false,
    xpReward: 50
  },
  weight_loss_10lbs: {
    title: 'Lost 10 Pounds!',
    description: 'Double-digit weight loss achieved!',
    celebrationMessage: '🌟 Amazing! You\'ve lost 10 pounds! This is a major milestone!',
    threshold: -10,
    metricType: 'weight',
    triggersRenewal: true, // CRITICAL: Triggers renewal conversation
    xpReward: 100
  },
  weight_loss_20lbs: {
    title: 'Lost 20 Pounds!',
    description: 'You\'ve lost 20 pounds - incredible transformation!',
    celebrationMessage: '🏆 WOW! 20 pounds down! You\'re absolutely crushing it!',
    threshold: -20,
    metricType: 'weight',
    triggersRenewal: true,
    xpReward: 200
  },
  weight_loss_50lbs: {
    title: 'Lost 50 Pounds!',
    description: 'An epic 50-pound transformation!',
    celebrationMessage: '💎 LEGENDARY! 50 pounds lost! You\'re an inspiration!',
    threshold: -50,
    metricType: 'weight',
    triggersRenewal: true,
    xpReward: 500
  },

  // Waist loss milestones
  waist_loss_1inch: {
    title: 'Lost 1 Inch Off Waist!',
    description: 'One inch off your waist!',
    celebrationMessage: '📏 Great work! One inch off your waist!',
    threshold: -1,
    metricType: 'waist',
    triggersRenewal: false,
    xpReward: 30
  },
  waist_loss_2inches: {
    title: 'Lost 2 Inches Off Waist!',
    description: 'Two inches off your waist!',
    celebrationMessage: '🎯 Awesome! Two inches off your waist - you can feel the difference!',
    threshold: -2,
    metricType: 'waist',
    triggersRenewal: false,
    xpReward: 75
  },
  waist_loss_4inches: {
    title: 'Lost 4 Inches Off Waist!',
    description: 'Four inches off your waist - major progress!',
    celebrationMessage: '🔥 Incredible! 4 inches off your waist! You\'re transforming!',
    threshold: -4,
    metricType: 'waist',
    triggersRenewal: true,
    xpReward: 150
  },

  // Body fat milestones
  body_fat_drop_1pct: {
    title: 'Body Fat Down 1%!',
    description: 'Reduced body fat by 1%!',
    celebrationMessage: '💪 Nice! Body fat down 1% - you\'re getting leaner!',
    threshold: -1,
    metricType: 'bodyFat',
    triggersRenewal: false,
    xpReward: 40
  },
  body_fat_drop_5pct: {
    title: 'Body Fat Down 5%!',
    description: 'Reduced body fat by 5% - major body recomposition!',
    celebrationMessage: '🌟 Outstanding! 5% body fat reduction - you\'re totally transforming your body!',
    threshold: -5,
    metricType: 'bodyFat',
    triggersRenewal: true,
    xpReward: 200
  },

  // Muscle gain milestones
  muscle_gain_5lbs: {
    title: 'Gained 5 Pounds of Muscle!',
    description: 'Built 5 pounds of muscle!',
    celebrationMessage: '💪 Awesome! You\'ve built 5 pounds of muscle!',
    threshold: 5,
    metricType: 'muscleMass',
    triggersRenewal: false,
    xpReward: 100
  },
  muscle_gain_10lbs: {
    title: 'Gained 10 Pounds of Muscle!',
    description: 'Built 10 pounds of muscle!',
    celebrationMessage: '🏋️ Incredible! 10 pounds of muscle gained - you\'re getting STRONG!',
    threshold: 10,
    metricType: 'muscleMass',
    triggersRenewal: true,
    xpReward: 200
  },

  // BMI milestone
  bmi_normal_range: {
    title: 'BMI in Normal Range!',
    description: 'Your BMI is now in the healthy range!',
    celebrationMessage: '🎊 Congratulations! Your BMI is now in the healthy range - amazing achievement!',
    threshold: null, // Special logic
    metricType: 'bmi',
    triggersRenewal: true,
    xpReward: 250
  },

  // Goal weight
  goal_weight_achieved: {
    title: 'Goal Weight Achieved!',
    description: 'You\'ve reached your goal weight!',
    celebrationMessage: '🏆 YOU DID IT! Goal weight achieved! Time to celebrate this amazing accomplishment!',
    threshold: null, // Special logic (requires user goal data)
    metricType: 'weight',
    triggersRenewal: true,
    xpReward: 300
  }
};

/**
 * Detect milestones for a new measurement
 * @param {string} userId - User ID
 * @param {Object} newMeasurement - New BodyMeasurement instance
 * @returns {Array} Array of created milestone records
 */
export async function detectMilestones(userId, newMeasurement) {
  try {
    const BodyMeasurement = getBodyMeasurement();
    const MeasurementMilestone = getMeasurementMilestone();
    // Get baseline (first) measurement
    const baselineMeasurement = await BodyMeasurement.findOne({
      where: {
        userId,
        id: { [Op.ne]: newMeasurement.id }
      },
      order: [['measurementDate', 'ASC']],
      limit: 1
    });

    if (!baselineMeasurement) {
      // This is the first measurement - no milestones yet
      return [];
    }

    // Get existing milestone types for this user to avoid duplicates
    const existingMilestones = await MeasurementMilestone.findAll({
      where: { userId },
      attributes: ['milestoneType']
    });

    const existingTypes = existingMilestones.map(m => m.milestoneType);
    const milestonesToCreate = [];

    // Calculate days since baseline
    const daysSinceStart = Math.floor(
      (new Date(newMeasurement.measurementDate) - new Date(baselineMeasurement.measurementDate)) / (1000 * 60 * 60 * 24)
    );

    // Check weight loss milestones
    if (newMeasurement.weight && baselineMeasurement.weight) {
      const weightChange = newMeasurement.weight - baselineMeasurement.weight;

      if (weightChange <= -50 && !existingTypes.includes('weight_loss_50lbs')) {
        milestonesToCreate.push(createMilestoneData('weight_loss_50lbs', userId, newMeasurement.id, baselineMeasurement.weight, newMeasurement.weight, weightChange, daysSinceStart));
      }
      if (weightChange <= -20 && !existingTypes.includes('weight_loss_20lbs')) {
        milestonesToCreate.push(createMilestoneData('weight_loss_20lbs', userId, newMeasurement.id, baselineMeasurement.weight, newMeasurement.weight, weightChange, daysSinceStart));
      }
      if (weightChange <= -10 && !existingTypes.includes('weight_loss_10lbs')) {
        milestonesToCreate.push(createMilestoneData('weight_loss_10lbs', userId, newMeasurement.id, baselineMeasurement.weight, newMeasurement.weight, weightChange, daysSinceStart));
      }
      if (weightChange <= -5 && !existingTypes.includes('weight_loss_5lbs')) {
        milestonesToCreate.push(createMilestoneData('weight_loss_5lbs', userId, newMeasurement.id, baselineMeasurement.weight, newMeasurement.weight, weightChange, daysSinceStart));
      }
    }

    // Check waist loss milestones
    if (newMeasurement.naturalWaist && baselineMeasurement.naturalWaist) {
      const waistChange = newMeasurement.naturalWaist - baselineMeasurement.naturalWaist;

      if (waistChange <= -4 && !existingTypes.includes('waist_loss_4inches')) {
        milestonesToCreate.push(createMilestoneData('waist_loss_4inches', userId, newMeasurement.id, baselineMeasurement.naturalWaist, newMeasurement.naturalWaist, waistChange, daysSinceStart));
      }
      if (waistChange <= -2 && !existingTypes.includes('waist_loss_2inches')) {
        milestonesToCreate.push(createMilestoneData('waist_loss_2inches', userId, newMeasurement.id, baselineMeasurement.naturalWaist, newMeasurement.naturalWaist, waistChange, daysSinceStart));
      }
      if (waistChange <= -1 && !existingTypes.includes('waist_loss_1inch')) {
        milestonesToCreate.push(createMilestoneData('waist_loss_1inch', userId, newMeasurement.id, baselineMeasurement.naturalWaist, newMeasurement.naturalWaist, waistChange, daysSinceStart));
      }
    }

    // Check body fat milestones
    if (newMeasurement.bodyFatPercentage && baselineMeasurement.bodyFatPercentage) {
      const bfChange = newMeasurement.bodyFatPercentage - baselineMeasurement.bodyFatPercentage;

      if (bfChange <= -5 && !existingTypes.includes('body_fat_drop_5pct')) {
        milestonesToCreate.push(createMilestoneData('body_fat_drop_5pct', userId, newMeasurement.id, baselineMeasurement.bodyFatPercentage, newMeasurement.bodyFatPercentage, bfChange, daysSinceStart));
      }
      if (bfChange <= -1 && !existingTypes.includes('body_fat_drop_1pct')) {
        milestonesToCreate.push(createMilestoneData('body_fat_drop_1pct', userId, newMeasurement.id, baselineMeasurement.bodyFatPercentage, newMeasurement.bodyFatPercentage, bfChange, daysSinceStart));
      }
    }

    // Check muscle gain milestones (using muscleMassPercentage)
    if (newMeasurement.muscleMassPercentage && baselineMeasurement.muscleMassPercentage) {
      const mmChange = newMeasurement.muscleMassPercentage - baselineMeasurement.muscleMassPercentage;

      if (mmChange >= 10 && !existingTypes.includes('muscle_gain_10lbs')) {
        milestonesToCreate.push(createMilestoneData('muscle_gain_10lbs', userId, newMeasurement.id, baselineMeasurement.muscleMassPercentage, newMeasurement.muscleMassPercentage, mmChange, daysSinceStart));
      }
      if (mmChange >= 5 && !existingTypes.includes('muscle_gain_5lbs')) {
        milestonesToCreate.push(createMilestoneData('muscle_gain_5lbs', userId, newMeasurement.id, baselineMeasurement.muscleMassPercentage, newMeasurement.muscleMassPercentage, mmChange, daysSinceStart));
      }
    }

    // Check BMI normal range milestone
    if (newMeasurement.bmi && !existingTypes.includes('bmi_normal_range')) {
      const currentBMI = parseFloat(newMeasurement.bmi);
      if (currentBMI >= 18.5 && currentBMI < 25) {
        // Check if they weren't in normal range before
        const wasOutOfRange = !baselineMeasurement.bmi ||
          parseFloat(baselineMeasurement.bmi) < 18.5 ||
          parseFloat(baselineMeasurement.bmi) >= 25;

        if (wasOutOfRange) {
          milestonesToCreate.push(createMilestoneData('bmi_normal_range', userId, newMeasurement.id, baselineMeasurement.bmi, newMeasurement.bmi, newMeasurement.bmi - (baselineMeasurement.bmi || 0), daysSinceStart));
        }
      }
    }

    // TODO: Check goal weight milestone (requires integration with user goals system)
    // This would check if user has a goal weight set and if current weight matches it

    // Create all detected milestones
    const createdMilestones = [];
    for (const milestoneData of milestonesToCreate) {
      const milestone = await MeasurementMilestone.create(milestoneData);
      createdMilestones.push(milestone);
    }

    return createdMilestones;

  } catch (error) {
    console.error('Error detecting milestones:', error);
    throw error;
  }
}

/**
 * Create milestone data object
 * @param {string} type - Milestone type key
 * @param {string} userId - User ID
 * @param {string} measurementId - Measurement ID
 * @param {number} startValue - Starting value
 * @param {number} endValue - Current value
 * @param {number} change - Change amount
 * @param {number} daysSinceStart - Days since baseline
 * @returns {Object} Milestone data object
 */
function createMilestoneData(type, userId, measurementId, startValue, endValue, change, daysSinceStart) {
  const config = MILESTONE_CONFIG[type];

  const changePercentage = startValue !== 0 ? ((change / startValue) * 100) : 0;

  return {
    userId,
    measurementId,
    milestoneType: type,
    title: config.title,
    description: config.description,
    celebrationMessage: config.celebrationMessage,
    metricType: config.metricType,
    startValue: parseFloat(startValue),
    endValue: parseFloat(endValue),
    changeAmount: parseFloat(change.toFixed(2)),
    changePercentage: parseFloat(changePercentage.toFixed(2)),
    achievedAt: new Date(),
    daysSinceStart,
    triggersRenewalConversation: config.triggersRenewal,
    renewalConversationHeld: false,
    xpReward: config.xpReward,
    badgeAwarded: type,
    isShared: false
  };
}

/**
 * Get all milestones for a user
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Array} Array of milestones
 */
export async function getUserMilestones(userId, options = {}) {
  const BodyMeasurement = getBodyMeasurement();
  const MeasurementMilestone = getMeasurementMilestone();
  const queryOptions = {
    where: { userId },
    order: [['achievedAt', 'DESC']],
    include: [{
      model: BodyMeasurement,
      as: 'measurement',
      attributes: ['measurementDate', 'weight', 'bodyFatPercentage', 'naturalWaist']
    }]
  };

  if (options.limit) {
    queryOptions.limit = options.limit;
  }

  if (options.triggersRenewal !== undefined) {
    queryOptions.where.triggersRenewalConversation = options.triggersRenewal;
  }

  return await MeasurementMilestone.findAll(queryOptions);
}

/**
 * Get milestones that need renewal conversations
 * @returns {Array} Array of milestones needing renewal conversations
 */
export async function getMilestonesNeedingRenewalConversation() {
  const BodyMeasurement = getBodyMeasurement();
  const MeasurementMilestone = getMeasurementMilestone();
  return await MeasurementMilestone.findAll({
    where: {
      triggersRenewalConversation: true,
      renewalConversationHeld: false
    },
    order: [['achievedAt', 'ASC']],
    include: [{
      model: BodyMeasurement,
      as: 'measurement',
      attributes: ['userId', 'measurementDate']
    }]
  });
}

/**
 * Mark renewal conversation as held
 * @param {string} milestoneId - Milestone ID
 * @param {string} notes - Conversation notes
 * @returns {Object} Updated milestone
 */
export async function markRenewalConversationHeld(milestoneId, notes = '') {
  const MeasurementMilestone = getMeasurementMilestone();
  const milestone = await MeasurementMilestone.findByPk(milestoneId);
  if (!milestone) {
    throw new Error('Milestone not found');
  }

  await milestone.update({
    renewalConversationHeld: true,
    renewalConversationDate: new Date(),
    renewalConversationNotes: notes
  });

  return milestone;
}

/**
 * Get milestone statistics for a user
 * @param {string} userId - User ID
 * @returns {Object} Statistics object
 */
export async function getMilestoneStats(userId) {
  const MeasurementMilestone = getMeasurementMilestone();
  const milestones = await MeasurementMilestone.findAll({
    where: { userId }
  });

  const stats = {
    totalMilestones: milestones.length,
    totalXP: milestones.reduce((sum, m) => sum + (m.xpReward || 0), 0),
    renewalTriggers: milestones.filter(m => m.triggersRenewalConversation).length,
    conversationsHeld: milestones.filter(m => m.renewalConversationHeld).length,
    byType: {}
  };

  // Count by type
  milestones.forEach(m => {
    const category = m.metricType || 'other';
    stats.byType[category] = (stats.byType[category] || 0) + 1;
  });

  return stats;
}

/**
 * Create custom milestone
 * @param {string} userId - User ID
 * @param {string} measurementId - Measurement ID
 * @param {Object} customData - Custom milestone data
 * @returns {Object} Created milestone
 */
export async function createCustomMilestone(userId, measurementId, customData) {
  const MeasurementMilestone = getMeasurementMilestone();
  const milestoneData = {
    userId,
    measurementId,
    milestoneType: 'custom',
    title: customData.title,
    description: customData.description,
    celebrationMessage: customData.celebrationMessage || `Congratulations on achieving: ${customData.title}!`,
    metricType: customData.metricType || 'custom',
    startValue: customData.startValue || null,
    endValue: customData.endValue || null,
    changeAmount: customData.changeAmount || null,
    changePercentage: customData.changePercentage || null,
    achievedAt: new Date(),
    daysSinceStart: customData.daysSinceStart || null,
    triggersRenewalConversation: customData.triggersRenewal || false,
    renewalConversationHeld: false,
    xpReward: customData.xpReward || 50,
    badgeAwarded: customData.badgeAwarded || 'custom',
    isShared: false
  };

  return await MeasurementMilestone.create(milestoneData);
}
