import { piiSafeLogger } from '../../utils/monitoring/piiSafeLogging.mjs';

export const estimateAchievementDifficulty = (achievement) => {
  const points = achievement?.points || 100;
  return Math.min(points / 1000, 1.0);
};

export const analyzeAchievementDifficulty = (achievements = {}) => {
  let tooEasy = 0;
  let tooHard = 0;
  let balanced = 0;

  for (const achievement of Object.values(achievements)) {
    const difficulty = estimateAchievementDifficulty(achievement);
    if (difficulty < 0.2) tooEasy += 1;
    else if (difficulty > 0.9) tooHard += 1;
    else balanced += 1;
  }

  return { tooEasy, tooHard, balanced };
};

export const detectAddictivePatterns = (rules = {}) => {
  const patterns = [];

  if (rules.pointRules) {
    const pointValues = Object.values(rules.pointRules);
    const avgPoints = pointValues.reduce((sum, points) => sum + points, 0) / pointValues.length;
    if (avgPoints > 200) {
      patterns.push('Excessive point rewards may create addiction');
    }
  }

  if (rules.notifications && rules.notifications.frequency > 5) {
    patterns.push('Too frequent notifications may be manipulative');
  }

  if (rules.streaks && rules.streaks.lossConsequence === 'severe') {
    patterns.push('Severe streak loss consequences may create unhealthy pressure');
  }

  return patterns;
};

export const validateCustomConstraints = (rules = {}, constraints = {}) => {
  const validation = {
    passed: true,
    scorePenalty: 0,
    issues: [],
    warnings: []
  };

  if (constraints.maxPointsPerAction) {
    const maxPoints = Math.max(...Object.values(rules.pointRules || {}));
    if (maxPoints > constraints.maxPointsPerAction) {
      validation.passed = false;
      validation.scorePenalty += 15;
      validation.issues.push(`Max points per action exceeded: ${maxPoints} > ${constraints.maxPointsPerAction}`);
    }
  }

  if (constraints.requiredBreakReminders && !rules.breakReminders) {
    validation.scorePenalty += 5;
    validation.warnings.push('Missing required break reminders');
  }

  return validation;
};

export async function validateRules(service, rules = {}, ethicalConstraints) {
  const validation = {
    passed: true,
    score: 100,
    issues: [],
    warnings: []
  };

  try {
    if (rules.pointRules) {
      for (const [action, points] of Object.entries(rules.pointRules)) {
        if (points > service.ethicalConstraints.maxDailyPoints) {
          validation.passed = false;
          validation.score -= 10;
          validation.issues.push(`Point value too high for ${action}: ${points}`);
        }
      }
    }

    if (rules.achievements) {
      const achievementDifficulty = analyzeAchievementDifficulty(rules.achievements);
      if (achievementDifficulty.tooEasy > 0) {
        validation.score -= 5;
        validation.warnings.push(`${achievementDifficulty.tooEasy} achievements may be too easy`);
      }
      if (achievementDifficulty.tooHard > 0) {
        validation.score -= 10;
        validation.warnings.push(`${achievementDifficulty.tooHard} achievements may be too difficult`);
      }
    }

    const addictivePatterns = detectAddictivePatterns(rules);
    if (addictivePatterns.length > 0) {
      validation.passed = false;
      validation.score -= 25;
      validation.issues.push('Potentially addictive patterns detected');
      validation.issues.push(...addictivePatterns);
    }

    if (ethicalConstraints) {
      const customValidation = validateCustomConstraints(rules, ethicalConstraints);
      validation.passed = validation.passed && customValidation.passed;
      validation.score = Math.min(validation.score, validation.score - customValidation.scorePenalty);
      validation.issues.push(...customValidation.issues);
      validation.warnings.push(...customValidation.warnings);
    }

    return validation;
  } catch (error) {
    piiSafeLogger.error('Failed to validate gamification rules', { error: error.message, rules });
    return {
      passed: false,
      score: 0,
      issues: ['Validation failed due to error'],
      warnings: ['Could not complete ethical validation']
    };
  }
}
