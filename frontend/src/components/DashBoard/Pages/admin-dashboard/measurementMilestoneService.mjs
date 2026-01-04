import { BodyMeasurement, MeasurementMilestone, WorkoutSession, WorkoutExercise, Set, DailyCheckIn, Exercise, sequelize } from '../models/index.cjs';
import { Op } from 'sequelize';
import moment from 'moment';

const MILESTONE_CONFIG = {
  // Measurement Milestones
  'weight_loss_5lbs': { title: 'Lost 5 Pounds!', description: 'You\'ve lost 5 pounds since you started training. Great progress!', celebrationMessage: '🎉 You lost 5 pounds! Keep up the amazing work!', metricType: 'weight', xpReward: 100, badge: 'weight_warrior_bronze' },
  'weight_loss_10lbs': { title: 'Lost 10 Pounds!', description: 'You\'ve lost 10 pounds since you started. This is a significant achievement!', celebrationMessage: '🏆 Double digits! You lost 10 pounds! You\'re crushing it!', metricType: 'weight', xpReward: 250, badge: 'weight_warrior_silver' },
  'weight_loss_20lbs': { title: 'Lost 20 Pounds!', description: 'You\'ve lost 20 pounds. This is a major transformation!', celebrationMessage: '💪 WOW! 20 pounds gone! You\'ve completely transformed your body!', metricType: 'weight', xpReward: 500, badge: 'weight_warrior_gold' },
  'waist_loss_1inch': { title: 'Lost 1 Inch on Waist!', description: 'Your waist is 1 inch smaller. Visible progress!', celebrationMessage: '👖 Lost an inch on your waist! Your clothes are fitting better!', metricType: 'waist', xpReward: 150, badge: 'waist_warrior_bronze' },
  'waist_loss_2inches': { title: 'Lost 2 Inches on Waist!', description: 'Your waist is 2 inches smaller. That\'s a pant size!', celebrationMessage: '🎉 2 inches off your waist! Time for new pants!', metricType: 'waist', xpReward: 300, badge: 'waist_warrior_silver' },
  'waist_loss_4inches': { title: 'Lost 4 Inches on Waist!', description: 'Your waist is 4 inches smaller. This is incredible progress!', celebrationMessage: '🏆 4 INCHES! You\'ve dropped 2 full pant sizes! Amazing!', metricType: 'waist', xpReward: 600, badge: 'waist_warrior_gold' },
  'body_fat_drop_1pct': { title: 'Body Fat Decreased 1%!', description: 'Your body composition is improving!', celebrationMessage: '💪 Body fat down 1%! You\'re getting leaner!', metricType: 'bodyFat', xpReward: 150, badge: 'lean_machine_bronze' },
  'body_fat_drop_5pct': { title: 'Body Fat Decreased 5%!', description: 'Major improvement in body composition!', celebrationMessage: '🔥 5% body fat loss! You\'re a lean machine now!', metricType: 'bodyFat', xpReward: 500, badge: 'lean_machine_gold' },
  'bmi_normal_range': { title: 'BMI in Normal Range!', description: 'Your BMI is now in the healthy range!', celebrationMessage: '🏆 Healthy BMI achieved! This is a major health milestone!', metricType: 'bmi', xpReward: 400, badge: 'health_hero' },

  // New Consistency Milestones
  'consistency_streak_7_days': { title: '7-Day Consistency Streak!', description: 'You\'ve logged an activity every day for a week. Incredible commitment!', celebrationMessage: '🎉 7 days in a row! You are building an unstoppable habit!', metricType: 'consistency', xpReward: 100, badge: 'consistency_bronze' },
  'consistency_streak_30_days': { title: '30-Day Consistency Streak!', description: 'A full month of dedication! This is how results are made.', celebrationMessage: '🗓️ 30-day streak! You are officially consistent!', metricType: 'consistency', xpReward: 300, badge: 'consistency_silver' },
  'consistency_perfect_month': { title: 'Perfect Month!', description: 'You completed 100% of your scheduled workouts this month.', celebrationMessage: '💯 Perfect month! You didn\'t miss a single scheduled workout!', metricType: 'consistency', xpReward: 500, badge: 'consistency_gold' },

  // New Performance Milestones
  'pr_squat_225lbs': { title: '225lb Squat!', description: 'You\'ve joined the 2-plate club on squats!', celebrationMessage: '🏋️ You just squatted 225 lbs! Welcome to the club!', metricType: 'performance', xpReward: 200, badge: 'strength_silver' },
  'total_volume_1M_lbs': { title: '1 Million Pounds Lifted!', description: 'Your total workout volume has exceeded 1,000,000 pounds!', celebrationMessage: '💥 One Million Pounds! You\'ve lifted the weight of a Boeing 747!', metricType: 'performance', xpReward: 1000, badge: 'volume_gold' },
  'first_pull_up': { title: 'First Pull-Up!', description: 'You successfully completed your first unassisted pull-up!', celebrationMessage: '💪 First pull-up complete! You just conquered gravity!', metricType: 'performance', xpReward: 250, badge: 'calisthenics_bronze' },

  // New Health & Wellness Milestones
  'sleep_avg_7_hours': { title: 'Excellent Sleep Hygiene!', description: 'You averaged over 7 hours of sleep for the last 30 days.', celebrationMessage: '😴 Sleep champion! Averaging 7+ hours is key to recovery.', metricType: 'wellness', xpReward: 150, badge: 'wellness_bronze' },
  'hydration_goal_met_7_days': { title: 'Hydration Pro!', description: 'You met your daily water intake goal for 7 consecutive days.', celebrationMessage: '💧 Hydration streak! 7 days of hitting your water goals!', metricType: 'wellness', xpReward: 100, badge: 'wellness_bronze' },
};

function createMilestone(type, userId, measurementId, data) {
  const config = MILESTONE_CONFIG[type];
  if (!config) return null;

  return {
    milestoneType: type,
    userId,
    measurementId,
    title: config.title,
    description: config.description,
    celebrationMessage: config.celebrationMessage,
    metricType: config.metricType,
    startValue: data.startValue,
    endValue: data.endValue,
    changeAmount: data.changeAmount,
    changePercentage: data.startValue ? ((data.changeAmount / data.startValue) * 100).toFixed(2) : 0,
    achievedAt: new Date(),
    daysSinceStart: data.daysSinceStart,
    triggersRenewalConversation: data.triggersRenewalConversation || false,
    xpReward: config.xpReward,
    badgeAwarded: config.badge
  };
}

function daysBetween(date1, date2) {
    return moment(date2).diff(moment(date1), 'days');
}

const measurementMilestoneService = {
  /**
   * Detects milestones based on a new body measurement.
   * Called automatically from BodyMeasurement.afterCreate hook or after saving a measurement.
   */
  async detectMeasurementMilestones(userId, newMeasurement) {
    const milestones = [];
    const baseline = await BodyMeasurement.findOne({ where: { userId }, order: [['measurementDate', 'ASC']], limit: 1 });

    if (!baseline || baseline.id === newMeasurement.id) return [];

    const existingMilestones = (await MeasurementMilestone.findAll({ where: { userId }, attributes: ['milestoneType'] })).map(m => m.milestoneType);

    const checkAndCreate = (type, condition, data) => {
      if (condition && !existingMilestones.includes(type)) {
        milestones.push(createMilestone(type, userId, newMeasurement.id, data));
      }
    };

    const weightChange = newMeasurement.weight - baseline.weight;
    const waistChange = newMeasurement.naturalWaist - baseline.naturalWaist;
    const bodyFatChange = newMeasurement.bodyFatPercentage - baseline.bodyFatPercentage;
    const days = daysBetween(baseline.measurementDate, newMeasurement.measurementDate);

    // Weight Loss
    checkAndCreate('weight_loss_5lbs', weightChange <= -5, { startValue: baseline.weight, endValue: newMeasurement.weight, changeAmount: weightChange, daysSinceStart: days });
    checkAndCreate('weight_loss_10lbs', weightChange <= -10, { startValue: baseline.weight, endValue: newMeasurement.weight, changeAmount: weightChange, daysSinceStart: days });
    checkAndCreate('weight_loss_20lbs', weightChange <= -20, { startValue: baseline.weight, endValue: newMeasurement.weight, changeAmount: weightChange, daysSinceStart: days });

    // Waist Loss
    checkAndCreate('waist_loss_1inch', waistChange <= -1, { startValue: baseline.naturalWaist, endValue: newMeasurement.naturalWaist, changeAmount: waistChange, daysSinceStart: days });
    checkAndCreate('waist_loss_2inches', waistChange <= -2, { startValue: baseline.naturalWaist, endValue: newMeasurement.naturalWaist, changeAmount: waistChange, daysSinceStart: days });
    checkAndCreate('waist_loss_4inches', waistChange <= -4, { startValue: baseline.naturalWaist, endValue: newMeasurement.naturalWaist, changeAmount: waistChange, daysSinceStart: days, triggersRenewalConversation: true });

    // Body Fat
    checkAndCreate('body_fat_drop_1pct', bodyFatChange <= -1, { startValue: baseline.bodyFatPercentage, endValue: newMeasurement.bodyFatPercentage, changeAmount: bodyFatChange, daysSinceStart: days });
    checkAndCreate('body_fat_drop_5pct', bodyFatChange <= -5, { startValue: baseline.bodyFatPercentage, endValue: newMeasurement.bodyFatPercentage, changeAmount: bodyFatChange, daysSinceStart: days, triggersRenewalConversation: true });

    // BMI
    checkAndCreate('bmi_normal_range', newMeasurement.bmi < 25 && baseline.bmi >= 25, { startValue: baseline.bmi, endValue: newMeasurement.bmi, changeAmount: newMeasurement.bmi - baseline.bmi, daysSinceStart: days, triggersRenewalConversation: true });

    if (milestones.length > 0) {
      await MeasurementMilestone.bulkCreate(milestones.filter(m => m !== null));
    }

    return milestones;
  },

  /**
   * Detects performance-based milestones after a workout is completed.
   * Call this from your workout saving logic.
   */
  async detectPerformanceMilestones(userId, workoutSessionId) {
    const milestones = [];
    const existingMilestones = (await MeasurementMilestone.findAll({ where: { userId }, attributes: ['milestoneType'] })).map(m => m.milestoneType);

    // --- Check for PRs (e.g., Squat 225lbs) ---
    if (!existingMilestones.includes('pr_squat_225lbs')) {
      const squatPR = await Set.findOne({
        include: [{
          model: WorkoutExercise,
          where: { workoutSessionId },
          include: [{ model: Exercise, where: { name: { [Op.iLike]: '%squat%' } } }]
        }],
        where: { weight: { [Op.gte]: 225 } },
      });
      if (squatPR) {
        milestones.push(createMilestone('pr_squat_225lbs', userId, null, {}));
      }
    }

    // --- Check for Total Volume ---
    if (!existingMilestones.includes('total_volume_1M_lbs')) {
        const result = await Set.findOne({
            attributes: [[sequelize.fn('SUM', sequelize.literal('weight * reps')), 'totalVolume']],
            include: [{
                model: WorkoutExercise,
                attributes: [],
                include: [{ model: WorkoutSession, where: { userId }, attributes: [] }]
            }],
            raw: true,
        });
        const totalVolume = result ? parseFloat(result.totalVolume) : 0;
        if (totalVolume >= 1000000) {
            milestones.push(createMilestone('total_volume_1M_lbs', userId, null, {}));
        }
    }

    // --- Check for First Pull-up ---
    if (!existingMilestones.includes('first_pull_up')) {
        const pullUpSet = await Set.findOne({
            where: { reps: { [Op.gte]: 1 } },
            include: [{
                model: WorkoutExercise,
                include: [
                    { model: WorkoutSession, where: { userId } },
                    { model: Exercise, where: { name: { [Op.iLike]: '%pull-up%' } } }
                ]
            }]
        });
        if (pullUpSet) {
            milestones.push(createMilestone('first_pull_up', userId, null, {}));
        }
    }

    if (milestones.length > 0) {
      await MeasurementMilestone.bulkCreate(milestones.filter(m => m !== null));
    }
    return milestones;
  },

  /**
   * Detects consistency-based milestones.
   * Recommended to run this via a daily scheduled job.
   */
  async detectConsistencyMilestones(userId) {
    const milestones = [];
    const existingMilestones = (await MeasurementMilestone.findAll({ where: { userId }, attributes: ['milestoneType'] })).map(m => m.milestoneType);

    // --- Check for 7-day streak ---
    if (!existingMilestones.includes('consistency_streak_7_days')) {
        const sevenDaysAgo = moment().subtract(7, 'days').toDate();
        const recentActivities = await DailyCheckIn.count({
            where: { userId, checkInDate: { [Op.gte]: sevenDaysAgo } },
            distinct: true,
            col: 'checkInDate'
        });
        if (recentActivities >= 7) {
            milestones.push(createMilestone('consistency_streak_7_days', userId, null, {}));
        }
    }
    
    // --- Check for 30-day streak ---
    if (!existingMilestones.includes('consistency_streak_30_days')) {
        const thirtyDaysAgo = moment().subtract(30, 'days').toDate();
        const recentActivities = await DailyCheckIn.count({
            where: { userId, checkInDate: { [Op.gte]: thirtyDaysAgo } },
            distinct: true,
            col: 'checkInDate'
        });
        if (recentActivities >= 30) {
            milestones.push(createMilestone('consistency_streak_30_days', userId, null, {}));
        }
    }

    if (milestones.length > 0) {
      await MeasurementMilestone.bulkCreate(milestones.filter(m => m !== null));
    }
    return milestones;
  },

  /**
   * Detects health and wellness milestones.
   * Recommended to run this via a daily scheduled job.
   */
  async detectWellnessMilestones(userId) {
    const milestones = [];
    const existingMilestones = (await MeasurementMilestone.findAll({ where: { userId }, attributes: ['milestoneType'] })).map(m => m.milestoneType);

    // --- Check for sleep average ---
    if (!existingMilestones.includes('sleep_avg_7_hours')) {
        const thirtyDaysAgo = moment().subtract(30, 'days').toDate();
        const sleepData = await DailyCheckIn.findAll({
            where: { userId, sleep_hours: { [Op.not]: null }, checkInDate: { [Op.gte]: thirtyDaysAgo } },
            attributes: ['sleep_hours']
        });
        if (sleepData.length >= 20) { // Require at least 20 data points
            const avgSleep = sleepData.reduce((sum, day) => sum + day.sleep_hours, 0) / sleepData.length;
            if (avgSleep >= 7) {
                milestones.push(createMilestone('sleep_avg_7_hours', userId, null, {}));
            }
        }
    }

    if (milestones.length > 0) {
      await MeasurementMilestone.bulkCreate(milestones.filter(m => m !== null));
    }
    return milestones;
  }
};

export default measurementMilestoneService;