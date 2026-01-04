import { BodyMeasurement } from '../models/index.mjs';
import { Op } from 'sequelize';

/**
 * Measurement Comparison Service
 * Automatically calculates progress by comparing current measurements to historical data
 * Called after every BodyMeasurement creation to populate comparisonData
 */

/**
 * Calculate comparisons for a new measurement
 * @param {string} userId - User ID
 * @param {string} measurementId - ID of the new measurement
 * @returns {Object} Comparison data with 1mo, 3mo, 6mo, all-time comparisons
 */
export async function calculateComparisons(userId, measurementId) {
  try {
    // Get the new measurement
    const currentMeasurement = await BodyMeasurement.findByPk(measurementId);
    if (!currentMeasurement) {
      throw new Error('Measurement not found');
    }

    const measurementDate = new Date(currentMeasurement.measurementDate);

    // Calculate date boundaries
    const oneMonthAgo = new Date(measurementDate);
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const threeMonthsAgo = new Date(measurementDate);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const sixMonthsAgo = new Date(measurementDate);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Get historical measurements
    const [oneMonthMeasurement, threeMonthMeasurement, sixMonthMeasurement, firstMeasurement] = await Promise.all([
      // Closest measurement to 1 month ago
      BodyMeasurement.findOne({
        where: {
          userId,
          measurementDate: { [Op.lte]: measurementDate },
          id: { [Op.ne]: measurementId }
        },
        order: [['measurementDate', 'DESC']],
        limit: 1,
        offset: 0
      }),

      // Closest measurement to 3 months ago
      BodyMeasurement.findOne({
        where: {
          userId,
          measurementDate: { [Op.lte]: threeMonthsAgo },
          id: { [Op.ne]: measurementId }
        },
        order: [['measurementDate', 'DESC']],
        limit: 1
      }),

      // Closest measurement to 6 months ago
      BodyMeasurement.findOne({
        where: {
          userId,
          measurementDate: { [Op.lte]: sixMonthsAgo },
          id: { [Op.ne]: measurementId }
        },
        order: [['measurementDate', 'DESC']],
        limit: 1
      }),

      // First ever measurement (baseline)
      BodyMeasurement.findOne({
        where: {
          userId,
          id: { [Op.ne]: measurementId }
        },
        order: [['measurementDate', 'ASC']],
        limit: 1
      })
    ]);

    // Build comparison object
    const comparisonData = {
      oneMonth: oneMonthMeasurement ? calculateDifferences(currentMeasurement, oneMonthMeasurement, 1) : null,
      threeMonth: threeMonthMeasurement ? calculateDifferences(currentMeasurement, threeMonthMeasurement, 3) : null,
      sixMonth: sixMonthMeasurement ? calculateDifferences(currentMeasurement, sixMonthMeasurement, 6) : null,
      allTime: firstMeasurement ? calculateDifferences(currentMeasurement, firstMeasurement, null) : null,
      hasProgress: false,
      insights: [],
      celebrationMessage: null
    };

    // Determine if there's measurable progress
    comparisonData.hasProgress = hasSignificantProgress(comparisonData);

    // Generate insights and celebration messages
    comparisonData.insights = generateInsights(comparisonData);
    comparisonData.celebrationMessage = generateCelebrationMessage(comparisonData);

    // Calculate overall progress score (0-100)
    const progressScore = calculateProgressScore(comparisonData);

    return {
      comparisonData,
      progressScore,
      hasProgress: comparisonData.hasProgress
    };

  } catch (error) {
    console.error('Error calculating comparisons:', error);
    throw error;
  }
}

/**
 * Calculate differences between current and previous measurement
 * @param {Object} current - Current measurement
 * @param {Object} previous - Previous measurement
 * @param {number|null} monthsAgo - Number of months ago (null for all-time)
 * @returns {Object} Differences object
 */
function calculateDifferences(current, previous, monthsAgo) {
  const diff = {
    monthsAgo,
    previousDate: previous.measurementDate,
    daysSince: Math.floor((new Date(current.measurementDate) - new Date(previous.measurementDate)) / (1000 * 60 * 60 * 24)),
    weight: null,
    bodyFat: null,
    muscleMass: null,
    bmi: null,
    waist: null,
    hips: null,
    chest: null,
    biceps: null,
    thighs: null
  };

  // Weight change
  if (current.weight && previous.weight) {
    const weightChange = current.weight - previous.weight;
    diff.weight = {
      previous: parseFloat(previous.weight),
      current: parseFloat(current.weight),
      change: parseFloat(weightChange.toFixed(2)),
      percentChange: parseFloat(((weightChange / previous.weight) * 100).toFixed(2)),
      unit: current.weightUnit || 'lbs'
    };
  }

  // Body fat change
  if (current.bodyFatPercentage && previous.bodyFatPercentage) {
    const bfChange = current.bodyFatPercentage - previous.bodyFatPercentage;
    diff.bodyFat = {
      previous: parseFloat(previous.bodyFatPercentage),
      current: parseFloat(current.bodyFatPercentage),
      change: parseFloat(bfChange.toFixed(2)),
      percentChange: parseFloat(((bfChange / previous.bodyFatPercentage) * 100).toFixed(2))
    };
  }

  // Muscle mass change
  if (current.muscleMassPercentage && previous.muscleMassPercentage) {
    const mmChange = current.muscleMassPercentage - previous.muscleMassPercentage;
    diff.muscleMass = {
      previous: parseFloat(previous.muscleMassPercentage),
      current: parseFloat(current.muscleMassPercentage),
      change: parseFloat(mmChange.toFixed(2)),
      percentChange: parseFloat(((mmChange / previous.muscleMassPercentage) * 100).toFixed(2))
    };
  }

  // BMI change
  if (current.bmi && previous.bmi) {
    const bmiChange = current.bmi - previous.bmi;
    diff.bmi = {
      previous: parseFloat(previous.bmi),
      current: parseFloat(current.bmi),
      change: parseFloat(bmiChange.toFixed(2)),
      percentChange: parseFloat(((bmiChange / previous.bmi) * 100).toFixed(2))
    };
  }

  // Waist change (using naturalWaist as primary waist measurement)
  if (current.naturalWaist && previous.naturalWaist) {
    const waistChange = current.naturalWaist - previous.naturalWaist;
    diff.waist = {
      previous: parseFloat(previous.naturalWaist),
      current: parseFloat(current.naturalWaist),
      change: parseFloat(waistChange.toFixed(2)),
      percentChange: parseFloat(((waistChange / previous.naturalWaist) * 100).toFixed(2)),
      unit: current.circumferenceUnit || 'inches'
    };
  }

  // Hips change
  if (current.hips && previous.hips) {
    const hipsChange = current.hips - previous.hips;
    diff.hips = {
      previous: parseFloat(previous.hips),
      current: parseFloat(current.hips),
      change: parseFloat(hipsChange.toFixed(2)),
      percentChange: parseFloat(((hipsChange / previous.hips) * 100).toFixed(2)),
      unit: current.circumferenceUnit || 'inches'
    };
  }

  // Chest change
  if (current.chest && previous.chest) {
    const chestChange = current.chest - previous.chest;
    diff.chest = {
      previous: parseFloat(previous.chest),
      current: parseFloat(current.chest),
      change: parseFloat(chestChange.toFixed(2)),
      percentChange: parseFloat(((chestChange / previous.chest) * 100).toFixed(2)),
      unit: current.circumferenceUnit || 'inches'
    };
  }

  // Biceps change (average of both arms)
  if (current.rightBicep && previous.rightBicep && current.leftBicep && previous.leftBicep) {
    const currentAvg = (parseFloat(current.rightBicep) + parseFloat(current.leftBicep)) / 2;
    const previousAvg = (parseFloat(previous.rightBicep) + parseFloat(previous.leftBicep)) / 2;
    const bicepsChange = currentAvg - previousAvg;
    diff.biceps = {
      previous: parseFloat(previousAvg.toFixed(2)),
      current: parseFloat(currentAvg.toFixed(2)),
      change: parseFloat(bicepsChange.toFixed(2)),
      percentChange: parseFloat(((bicepsChange / previousAvg) * 100).toFixed(2)),
      unit: current.circumferenceUnit || 'inches'
    };
  }

  // Thighs change (average of both legs)
  if (current.rightThigh && previous.rightThigh && current.leftThigh && previous.leftThigh) {
    const currentAvg = (parseFloat(current.rightThigh) + parseFloat(current.leftThigh)) / 2;
    const previousAvg = (parseFloat(previous.rightThigh) + parseFloat(previous.leftThigh)) / 2;
    const thighsChange = currentAvg - previousAvg;
    diff.thighs = {
      previous: parseFloat(previousAvg.toFixed(2)),
      current: parseFloat(currentAvg.toFixed(2)),
      change: parseFloat(thighsChange.toFixed(2)),
      percentChange: parseFloat(((thighsChange / previousAvg) * 100).toFixed(2)),
      unit: current.circumferenceUnit || 'inches'
    };
  }

  return diff;
}

/**
 * Determine if there's significant progress
 * @param {Object} comparisonData - Comparison data object
 * @returns {boolean} True if significant progress detected
 */
function hasSignificantProgress(comparisonData) {
  const { oneMonth, threeMonth, sixMonth, allTime } = comparisonData;

  // Check for weight loss
  if (allTime?.weight?.change < -5) return true; // Lost 5+ lbs
  if (sixMonth?.weight?.change < -3) return true; // Lost 3+ lbs in 6 months
  if (threeMonth?.weight?.change < -2) return true; // Lost 2+ lbs in 3 months

  // Check for body fat reduction
  if (allTime?.bodyFat?.change < -1) return true; // Lost 1%+ body fat
  if (sixMonth?.bodyFat?.change < -0.5) return true;

  // Check for waist reduction
  if (allTime?.waist?.change < -2) return true; // Lost 2+ inches waist
  if (sixMonth?.waist?.change < -1) return true;

  // Check for muscle gain
  if (allTime?.muscleMass?.change > 2) return true; // Gained 2%+ muscle
  if (sixMonth?.muscleMass?.change > 1) return true;

  return false;
}

/**
 * Generate insights from comparison data
 * @param {Object} comparisonData - Comparison data object
 * @returns {Array} Array of insight strings
 */
function generateInsights(comparisonData) {
  const insights = [];
  const { oneMonth, threeMonth, sixMonth, allTime } = comparisonData;

  // Weight insights
  if (allTime?.weight?.change < -10) {
    insights.push(`Amazing! You've lost ${Math.abs(allTime.weight.change)} ${allTime.weight.unit} total!`);
  } else if (allTime?.weight?.change < -5) {
    insights.push(`Great progress! Down ${Math.abs(allTime.weight.change)} ${allTime.weight.unit} overall!`);
  }

  // Body fat insights
  if (allTime?.bodyFat?.change < -5) {
    insights.push(`Incredible body recomposition! Body fat down ${Math.abs(allTime.bodyFat.change)}%!`);
  } else if (allTime?.bodyFat?.change < -2) {
    insights.push(`Excellent work! Body fat reduced by ${Math.abs(allTime.bodyFat.change)}%!`);
  }

  // Waist insights
  if (allTime?.waist?.change < -4) {
    insights.push(`Your waist is down ${Math.abs(allTime.waist.change)} ${allTime.waist.unit} - major progress!`);
  } else if (allTime?.waist?.change < -2) {
    insights.push(`Lost ${Math.abs(allTime.waist.change)} ${allTime.waist.unit} off your waist!`);
  }

  // Muscle gain insights
  if (allTime?.muscleMass?.change > 5) {
    insights.push(`You've gained ${allTime.muscleMass.change}% muscle mass - incredible strength gains!`);
  } else if (allTime?.muscleMass?.change > 2) {
    insights.push(`Building muscle! Up ${allTime.muscleMass.change}% in muscle mass!`);
  }

  // Consistency insights
  if (threeMonth && oneMonth) {
    insights.push('Consistent progress over the last 3 months - keep it up!');
  }

  return insights;
}

/**
 * Generate celebration message
 * @param {Object} comparisonData - Comparison data object
 * @returns {string|null} Celebration message or null
 */
function generateCelebrationMessage(comparisonData) {
  const { allTime } = comparisonData;

  if (allTime?.weight?.change < -20) {
    return '🎉 You\'ve lost over 20 pounds! This is a major achievement!';
  } else if (allTime?.weight?.change < -10) {
    return '🌟 Double-digit weight loss achieved! Amazing work!';
  } else if (allTime?.bodyFat?.change < -5) {
    return '💪 You\'ve dropped 5% body fat! Your hard work is paying off!';
  } else if (allTime?.waist?.change < -4) {
    return '🎯 Down 4 inches on your waist! You\'re transforming!';
  }

  return null;
}

/**
 * Calculate overall progress score (0-100)
 * @param {Object} comparisonData - Comparison data object
 * @returns {number} Progress score 0-100
 */
function calculateProgressScore(comparisonData) {
  let score = 0;
  const { allTime } = comparisonData;

  if (!allTime) return 0;

  // Weight component (max 30 points)
  if (allTime.weight) {
    const weightLoss = Math.abs(Math.min(allTime.weight.change, 0));
    score += Math.min(weightLoss * 1.5, 30); // 20 lbs = 30 points
  }

  // Body fat component (max 30 points)
  if (allTime.bodyFat) {
    const bfLoss = Math.abs(Math.min(allTime.bodyFat.change, 0));
    score += Math.min(bfLoss * 6, 30); // 5% = 30 points
  }

  // Waist component (max 20 points)
  if (allTime.waist) {
    const waistLoss = Math.abs(Math.min(allTime.waist.change, 0));
    score += Math.min(waistLoss * 5, 20); // 4 inches = 20 points
  }

  // Muscle gain component (max 20 points)
  if (allTime.muscleMass) {
    const muscleGain = Math.max(allTime.muscleMass.change, 0);
    score += Math.min(muscleGain * 4, 20); // 5% = 20 points
  }

  return Math.min(Math.round(score), 100);
}

/**
 * Get comparison summary for display
 * @param {string} userId - User ID
 * @param {string} measurementId - Measurement ID
 * @returns {Object} Formatted comparison summary
 */
export async function getComparisonSummary(userId, measurementId) {
  const measurement = await BodyMeasurement.findByPk(measurementId);
  if (!measurement) {
    throw new Error('Measurement not found');
  }

  return {
    comparisonData: measurement.comparisonData,
    progressScore: measurement.progressScore,
    hasProgress: measurement.hasProgress,
    insights: measurement.comparisonData?.insights || [],
    celebrationMessage: measurement.comparisonData?.celebrationMessage
  };
}
