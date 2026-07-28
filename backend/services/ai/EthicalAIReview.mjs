import axios from 'axios';
import { piiSafeLogger } from '../../utils/monitoring/piiSafeLogging.mjs';
import { mcpHealthManager } from '../../utils/monitoring/mcpHealthManager.mjs';

/**
 * P1: Ethical AI Review Process
 * Comprehensive ethical AI checks for all generated content
 * Aligned with Master Prompt v26 Ethical AI by Design principles
 */

/**
 * Scoring weights per review type. Each map MUST sum to 1.0 and MUST contain a key for every
 * check its review produces.
 *
 * WHY THIS IS SPLIT BY TYPE: there was a single weights map keyed for the workout checks only
 * (inclusivity / abilityAccommodation / positiveTone / biasDetection), but the nutrition review
 * emits different keys (bodyPositivity / culturalSensitivity / dietaryRestrictions). Three of
 * nutrition's four checks matched no weight and were silently dropped from the total, capping
 * every nutrition score at 0.25 x 90 = 23 against an 85 pass threshold — so nutrition ethical
 * review could never pass, for any input, and nothing said so.
 */
const WORKOUT_CHECK_WEIGHTS = Object.freeze({
  inclusivity: 0.25,
  abilityAccommodation: 0.25,
  positiveTone: 0.25,
  biasDetection: 0.25
});

const NUTRITION_CHECK_WEIGHTS = Object.freeze({
  inclusivity: 0.25,
  bodyPositivity: 0.25,
  culturalSensitivity: 0.25,
  dietaryRestrictions: 0.25
});

/**
 * Result for a check that has NOT been implemented yet.
 *
 * WHY `score: null` AND `passed: false`: the nutrition checks were stubs that returned
 * `{ passed: true, score: 90 }` without reading their arguments. A plan containing peanut butter
 * reviewed for a client with a declared peanut allergy raised zero issues and scored 90. Any
 * future correction to the weights map would have flipped that from a loud failure into a
 * SILENT PASS — manufacturing a "reviewed, score 90" record for a review that never happened.
 *
 * The invariant this enforces: an unimplemented safety check must be structurally incapable of
 * reporting a pass. `null` cannot be summed into a score, and `implemented: false` forces the
 * enclosing review to report itself incomplete.
 */
const notImplementedCheck = (checkName) => ({
  implemented: false,
  passed: false,
  score: null,
  issues: [`${checkName} is not implemented — this check did not run and produced no signal`],
  recommendations: [`Implement ${checkName} before any caller relies on this review to gate content`]
});

class EthicalAIReview {
  constructor() {
    // Ethical guidelines configuration
    this.ethicalGuidelines = {
      inclusivity: {
        weight: 0.25,
        criteria: [
          'Accommodates all body types and abilities',
          'Uses gender-neutral language where appropriate',
          'Considers diverse fitness levels',
          'Avoids discriminatory assumptions',
          'Promotes adaptive exercises'
        ]
      },
      abilityAccommodation: {
        weight: 0.25,
        criteria: [
          'Provides modifications for physical limitations',
          'Considers wheelchair accessibility',
          'Offers seated exercise alternatives',
          'Addresses visual/hearing impairments',
          'Respects cognitive differences'
        ]
      },
      positiveTone: {
        weight: 0.25,
        criteria: [
          'Uses encouraging language',
          'Avoids body shaming',
          'Promotes self-acceptance',
          'Focuses on progress not perfection',
          'Celebrates small victories'
        ]
      },
      biasDetection: {
        weight: 0.25,
        criteria: [
          'No age-based assumptions',
          'No gender stereotypes',
          'No cultural bias',
          'No socioeconomic assumptions',
          'No ability-based discrimination'
        ]
      }
    };

    // Prohibited words and phrases
    this.prohibitedTerms = [
      // Body shaming terms
      'fat', 'skinny', 'ugly', 'gross', 'disgusting',
      // Ableist terms
      'lame', 'dumb', 'crazy', 'insane', 'retarded',
      // Gender stereotypes
      'men should', 'women should', 'girls cannot', 'boys do not',
      // Age discrimination
      'too old', 'too young', 'past your prime',
      // Cultural insensitivity
      'exotic', 'primitive', 'civilized'
    ];

    // Positive language patterns
    this.positivePatterns = [
      /\b(great|excellent|amazing|wonderful|fantastic)\b/i,
      /\b(progress|improvement|growth|development)\b/i,
      /\b(capable|strong|resilient|determined)\b/i,
      /\b(inclusive|accessible|adaptive|modified)\b/i,
      /\b(celebrate|achievement|success|milestone)\b/i
    ];

    // Initialize bias detection models
    this.biasDetectionModels = {
      sentiment: true,
      toxicity: true,
      fairness: true,
      inclusion: true
    };
  }

  /**
   * Review workout generation for ethical compliance
   * @param {Object} workoutPlan - Generated workout plan
   * @param {Object} clientProfile - Client profile information
   * @param {Object} options - Review options
   */
  async reviewWorkoutGeneration(workoutPlan, clientProfile, options = {}) {
    try {
      piiSafeLogger.trackAIGeneration('workout_generation', clientProfile.userId, {
        reviewStarted: true,
        timestamp: Date.now()
      });

      const checks = {
        inclusivity: await this.checkInclusion(workoutPlan, clientProfile),
        abilityAccommodation: await this.verifyAccessibility(workoutPlan, clientProfile.limitations),
        positiveTone: await this.analyzeTonePositivity(workoutPlan),
        biasDetection: await this.scanForBias(workoutPlan, clientProfile.demographics),
        overallScore: 0,
        passed: false,
        recommendations: [],
        ethicalCompliance: {
          wcagCompliant: false,
          inclusiveLanguage: false,
          biasFreeSince: 0,
          positivityScore: 0
        }
      };

      // Calculate overall score
      checks.overallScore = this.calculateEthicalScore(checks, WORKOUT_CHECK_WEIGHTS);

      // Symmetric with the nutrition review: a check whose key drifts away from the weight map
      // would otherwise be dropped from the score in silence — which is exactly how the nutrition
      // scoring bug stayed hidden. Detect it here too so the same class cannot recur on this path.
      const unrunChecks = this.collectUnrunChecks(checks, WORKOUT_CHECK_WEIGHTS);
      checks.reviewComplete = unrunChecks.length === 0;
      checks.unrunChecks = unrunChecks;
      checks.passed = checks.reviewComplete && checks.overallScore >= 85; // 85% ethical threshold

      if (!checks.reviewComplete) {
        checks.incompleteReason =
          `Workout ethical review did not run ${unrunChecks.length} of its checks ` +
          `(${unrunChecks.join(', ')}). This result is NOT an ethical clearance.`;
        piiSafeLogger.warn('Workout ethical review incomplete — checks did not run', {
          workoutId: workoutPlan?.id ?? null,
          unrunChecks,
          overallScore: checks.overallScore
        });
      }

      // Flag for human review if needed
      if (!checks.passed || checks.overallScore < 90) {
        await this.flagForHumanReview(workoutPlan, checks, clientProfile);
      }

      // Add ethical guidelines to AI prompt enhancement
      checks.ethicalPromptAddition = this.getEthicalPromptAddition();

      // Log ethical review completion
      piiSafeLogger.trackAIGeneration('workout_generation', clientProfile.userId, {
        ethicalReview: checks,
        passed: checks.passed,
        score: checks.overallScore,
        timestamp: Date.now()
      });

      return checks;
    } catch (error) {
      // Optional chaining is load-bearing here for the same reason as the nutrition handler:
      // an unguarded dereference made this error path throw on null input.
      piiSafeLogger.error('Ethical AI review failed', {
        error: error.message,
        workoutId: workoutPlan?.id ?? null,
        userId: clientProfile?.userId ?? null
      });
      
      // Return safe defaults on error
      return {
        inclusivity: { passed: false, score: 0 },
        abilityAccommodation: { passed: false, score: 0 },
        positiveTone: { passed: false, score: 0 },
        biasDetection: { passed: false, score: 0 },
        overallScore: 0,
        passed: false,
        error: error.message,
        recommendations: ['Manual review required due to system error']
      };
    }
  }

  /**
   * Check inclusivity of generated content
   * @param {Object} workoutPlan - Workout plan to check
   * @param {Object} clientProfile - Client profile
   */
  async checkInclusion(workoutPlan, clientProfile) {
    try {
      const content = this.extractTextContent(workoutPlan);
      let score = 100;
      const issues = [];
      const recommendations = [];

      // Check for inclusive language
      const inclusiveTerms = [
        'modified', 'adapted', 'accessible', 'alternative', 'option',
        'can be adjusted', 'suitable for all', 'regardless of ability'
      ];

      let inclusiveTermFound = false;
      for (const term of inclusiveTerms) {
        if (content.toLowerCase().includes(term)) {
          inclusiveTermFound = true;
          break;
        }
      }

      if (!inclusiveTermFound) {
        score -= 20;
        issues.push('Lacks inclusive language');
        recommendations.push('Add more inclusive terms and modifications');
      }

      // Check for body type inclusivity
      const bodyTypeReferences = content.match(/\b(all bodies|every body type|regardless of shape)\b/gi);
      if (!bodyTypeReferences) {
        score -= 15;
        issues.push('No explicit body type inclusivity');
        recommendations.push('Include references to body type diversity');
      }

      // Check for ability range acknowledgment
      if (clientProfile.limitations && clientProfile.limitations.length > 0) {
        const limitationKeywords = clientProfile.limitations.join('|');
        const limitationRegex = new RegExp(limitationKeywords, 'gi');
        if (!limitationRegex.test(content)) {
          score -= 25;
          issues.push('Does not address specified limitations');
          recommendations.push('Explicitly address user\'s limitations');
        }
      }

      return {
        passed: score >= 75,
        score: Math.max(0, score),
        issues,
        recommendations,
        details: {
          inclusiveLanguage: inclusiveTermFound,
          bodyTypeInclusive: bodyTypeReferences?.length > 0,
          addressesLimitations: clientProfile.limitations?.length === 0 || score > 75
        }
      };
    } catch (error) {
      piiSafeLogger.error('Inclusivity check failed', { error: error.message });
      return { passed: false, score: 0, error: error.message };
    }
  }

  /**
   * Verify accessibility compliance
   * @param {Object} workoutPlan - Workout plan to verify
   * @param {Array} limitations - User's physical limitations
   */
  async verifyAccessibility(workoutPlan, limitations = []) {
    try {
      const content = this.extractTextContent(workoutPlan);
      let score = 100;
      const issues = [];
      const recommendations = [];
      const accessibilityFeatures = {
        hasModifications: false,
        hasAlternatives: false,
        hasSeatedOptions: false,
        hasVisualDescriptions: false,
        hasSimpleInstructions: false
      };

      // Check for modification keywords
      const modificationKeywords = [
        'modification', 'alternative', 'seated version', 'chair option',
        'standing alternative', 'wall-assisted', 'supported', 'assisted'
      ];

      for (const keyword of modificationKeywords) {
        if (content.toLowerCase().includes(keyword)) {
          accessibilityFeatures.hasModifications = true;
          break;
        }
      }

      // Check for alternative exercises
      const alternativePatterns = [
        /alternative.*exercise/i,
        /instead.*try/i,
        /substitute.*with/i,
        /replace.*with/i
      ];

      for (const pattern of alternativePatterns) {
        if (pattern.test(content)) {
          accessibilityFeatures.hasAlternatives = true;
          break;
        }
      }

      // Check for seated options
      accessibilityFeatures.hasSeatedOptions = /seated|chair|sitting/i.test(content);

      // Check for visual descriptions
      accessibilityFeatures.hasVisualDescriptions = /describe|visualize|imagine|picture/i.test(content);

      // Check for simple instructions
      const sentences = content.split(/[.!?]+/);
      const complexSentences = sentences.filter(s => s.split(/\s+/).length > 20);
      accessibilityFeatures.hasSimpleInstructions = complexSentences.length / sentences.length < 0.3;

      // Score based on features
      if (!accessibilityFeatures.hasModifications) {
        score -= 25;
        issues.push('No exercise modifications provided');
        recommendations.push('Include modifications for different abilities');
      }

      if (!accessibilityFeatures.hasAlternatives) {
        score -= 20;
        issues.push('No alternative exercises offered');
        recommendations.push('Provide alternative exercises for each movement');
      }

      if (limitations.some(l => l.includes('wheelchair') || l.includes('mobility')) && !accessibilityFeatures.hasSeatedOptions) {
        score -= 30;
        issues.push('No seated options for mobility limitations');
        recommendations.push('Include seated exercise options');
      }

      if (!accessibilityFeatures.hasSimpleInstructions) {
        score -= 15;
        issues.push('Instructions are too complex');
        recommendations.push('Simplify exercise instructions');
      }

      return {
        passed: score >= 75,
        score: Math.max(0, score),
        issues,
        recommendations,
        features: accessibilityFeatures,
        wcagCompliant: score >= 80
      };
    } catch (error) {
      piiSafeLogger.error('Accessibility verification failed', { error: error.message });
      return { passed: false, score: 0, error: error.message };
    }
  }

  /**
   * Analyze tone positivity
   * @param {Object} workoutPlan - Workout plan to analyze
   */
  async analyzeTonePositivity(workoutPlan) {
    try {
      const content = this.extractTextContent(workoutPlan);
      let score = 100;
      const issues = [];
      const recommendations = [];

      // Check for prohibited terms
      for (const term of this.prohibitedTerms) {
        const regex = new RegExp(`\\b${term}\\b`, 'gi');
        if (regex.test(content)) {
          score -= 30;
          issues.push(`Contains potentially harmful term: "${term}"`);
          recommendations.push(`Remove or replace "${term}" with positive language`);
        }
      }

      // Check for positive patterns
      let positiveMatches = 0;
      for (const pattern of this.positivePatterns) {
        const matches = content.match(pattern);
        if (matches) {
          positiveMatches += matches.length;
        }
      }

      // Score based on positive language density
      const words = content.split(/\s+/).length;
      const positiveRatio = positiveMatches / words;
      
      if (positiveRatio < 0.02) { // Less than 2% positive words
        score -= 20;
        issues.push('Insufficient positive language');
        recommendations.push('Include more encouraging and motivational language');
      }

      // Check for motivational elements
      const motivationalPhrases = [
        'you can do this', 'great job', 'keep going', 'well done',
        'you\'re doing great', 'progress', 'achievement', 'success'
      ];

      let motivationalFound = false;
      for (const phrase of motivationalPhrases) {
        if (content.toLowerCase().includes(phrase)) {
          motivationalFound = true;
          break;
        }
      }

      if (!motivationalFound) {
        score -= 15;
        issues.push('Lacks motivational elements');
        recommendations.push('Add motivational phrases and encouragement');
      }

      // Check for self-acceptance messaging
      const selfAcceptanceTerms = [
        'listen to your body', 'at your own pace', 'honor your limits',
        'respect your body', 'self-compassion'
      ];

      let selfAcceptanceFound = false;
      for (const term of selfAcceptanceTerms) {
        if (content.toLowerCase().includes(term)) {
          selfAcceptanceFound = true;
          break;
        }
      }

      if (!selfAcceptanceFound) {
        score -= 10;
        issues.push('Limited self-acceptance messaging');
        recommendations.push('Include self-acceptance and body-positive language');
      }

      return {
        passed: score >= 80,
        score: Math.max(0, score),
        issues,
        recommendations,
        sentiment: {
          positiveRatio,
          motivationalPresent: motivationalFound,
          selfAcceptancePresent: selfAcceptanceFound,
          prohibitedTermsFound: this.prohibitedTerms.some(term => 
            new RegExp(`\\b${term}\\b`, 'gi').test(content)
          )
        }
      };
    } catch (error) {
      piiSafeLogger.error('Tone positivity analysis failed', { error: error.message });
      return { passed: false, score: 0, error: error.message };
    }
  }

  /**
   * Scan for bias in content
   * @param {Object} workoutPlan - Workout plan to scan
   * @param {Object} demographics - User demographics
   */
  async scanForBias(workoutPlan, demographics = {}) {
    try {
      const content = this.extractTextContent(workoutPlan);
      let score = 100;
      const issues = [];
      const recommendations = [];
      const biasTypes = {
        gender: false,
        age: false,
        ability: false,
        cultural: false,
        socioeconomic: false
      };

      // Gender bias detection
      const genderBiasPatterns = [
        /\b(men are|women are|girls are|boys are)\b/gi,
        /\b(men should|women should|girls should|boys should)\b/gi,
        /\b(men can't|women can't|girls cannot|boys can't)\b/gi
      ];

      for (const pattern of genderBiasPatterns) {
        if (pattern.test(content)) {
          biasTypes.gender = true;
          score -= 25;
          issues.push('Contains gender bias or stereotypes');
          recommendations.push('Use gender-neutral language and avoid stereotypes');
          break;
        }
      }

      // Age bias detection
      const ageBiasPatterns = [
        /\b(too old|too young|past your prime|over the hill)\b/gi,
        /\b(age is just|at your age|for your age)\b/gi
      ];

      for (const pattern of ageBiasPatterns) {
        if (pattern.test(content)) {
          biasTypes.age = true;
          score -= 20;
          issues.push('Contains age-related bias');
          recommendations.push('Remove age-based assumptions and limitations');
          break;
        }
      }

      // Ability bias detection
      const abilityBiasPatterns = [
        /\b(normal people|average person|typical)\b/gi,
        /\b(disabled|handicapped|invalid)\b/gi // Instead of "person with disability"
      ];

      for (const pattern of abilityBiasPatterns) {
        if (pattern.test(content)) {
          biasTypes.ability = true;
          score -= 30;
          issues.push('Contains ability bias or ableist language');
          recommendations.push('Use person-first language and avoid ableist terms');
          break;
        }
      }

      // Cultural bias detection
      const culturalBiasPatterns = [
        /\b(exotic|primitive|civilized|third world)\b/gi,
        /\b(eastern|western) medicine\b/gi
      ];

      for (const pattern of culturalBiasPatterns) {
        if (pattern.test(content)) {
          biasTypes.cultural = true;
          score -= 20;
          issues.push('Contains cultural bias or insensitive terms');
          recommendations.push('Use culturally sensitive language');
          break;
        }
      }

      // Socioeconomic bias detection
      const socioeconomicBiasPatterns = [
        /\b(expensive|cheap|low-end|high-end) equipment\b/gi,
        /\b(anyone can afford|costs nothing)\b/gi
      ];

      for (const pattern of socioeconomicBiasPatterns) {
        if (pattern.test(content)) {
          biasTypes.socioeconomic = true;
          score -= 15;
          issues.push('Contains socioeconomic assumptions');
          recommendations.push('Avoid assumptions about financial resources');
          break;
        }
      }

      // Check for assumption-free language
      const assumptionFreeLanguage = [
        'if comfortable', 'if able', 'as you feel able', 'when possible', 'if accessible'
      ];

      let assumptionFreeFound = false;
      for (const phrase of assumptionFreeLanguage) {
        if (content.toLowerCase().includes(phrase)) {
          assumptionFreeFound = true;
          break;
        }
      }

      if (!assumptionFreeFound) {
        score -= 10;
        issues.push('Lacks assumption-free language');
        recommendations.push('Include phrases that acknowledge individual differences');
      }

      return {
        passed: score >= 85,
        score: Math.max(0, score),
        issues,
        recommendations,
        biasTypes,
        demographicConsideration: {
          accountsForGender: !biasTypes.gender,
          accountsForAge: !biasTypes.age,
          accountsForAbility: !biasTypes.ability,
          culturallySensitive: !biasTypes.cultural,
          economicallyInclusive: !biasTypes.socioeconomic
        }
      };
    } catch (error) {
      piiSafeLogger.error('Bias detection failed', { error: error.message });
      return { passed: false, score: 0, error: error.message };
    }
  }

  /**
   * Calculate overall ethical score
   * @param {Object} checks - Individual check results
   */
  calculateEthicalScore(checks, weights = WORKOUT_CHECK_WEIGHTS) {
    let totalScore = 0;
    for (const [category, check] of Object.entries(checks)) {
      const weight = weights[category];
      // `!== undefined` (not truthiness): a legitimate 0.0 weight is falsy and was being skipped.
      if (weight === undefined || !check || typeof check !== 'object') continue;
      // An unimplemented check reports score `null` and must contribute NOTHING. It must never
      // be able to push the total toward the pass threshold.
      if (typeof check.score !== 'number') continue;
      totalScore += check.score * weight;
    }

    return Math.round(totalScore);
  }

  /**
   * List the checks in a result set that did not actually run.
   *
   * A check is "unrun" if it self-reports `implemented: false`, or if it carries a key the
   * weight map does not know about. The second case is the one that hid the nutrition bug: an
   * unknown key was silently dropped from the score with no signal that a check had vanished.
   *
   * @returns {string[]} check names that produced no trustworthy signal
   */
  collectUnrunChecks(checks, weights) {
    const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
    const unrun = [];

    for (const [category, check] of Object.entries(checks)) {
      if (!check || typeof check !== 'object' || Array.isArray(check)) continue;

      // Self-declared not-implemented always counts, weighted or not.
      if (check.implemented === false) { unrun.push(category); continue; }

      // Otherwise only CHECK RESULTS are eligible. A result carries its own `score` or `passed`;
      // sibling data blobs on the same object (e.g. workout `ethicalCompliance`, which holds
      // wcagCompliant/inclusiveLanguage/positivityScore) do not, and must not be mistaken for a
      // check that failed to run — that false positive would force `reviewComplete: false` and
      // block an otherwise-passing review. Caught by hostile review before ship.
      const looksLikeCheckResult = has(check, 'score') || has(check, 'passed');
      if (looksLikeCheckResult && weights[category] === undefined) unrun.push(category);
    }

    return unrun;
  }

  /**
   * Flag content for human review
   * @param {Object} workoutPlan - Workout plan to flag
   * @param {Object} checks - Ethical check results
   * @param {Object} clientProfile - Client profile
   */
  async flagForHumanReview(workoutPlan, checks, clientProfile) {
    try {
      // Create review record
      const reviewRecord = {
        workoutId: workoutPlan.id,
        userId: clientProfile.userId,
        ethicalChecks: checks,
        flaggedAt: new Date(),
        reviewStatus: 'pending',
        priority: checks.overallScore < 70 ? 'high' : 'medium',
        reviewType: 'ethical_compliance'
      };

      // Log the flag for review
      piiSafeLogger.trackAIGeneration('workout_generation', clientProfile.userId, {
        flaggedForReview: true,
        reason: 'ethical_compliance',
        score: checks.overallScore,
        priority: reviewRecord.priority
      });

      // In a real system, this would save to a review queue
      // For now, we'll log the requirement
      piiSafeLogger.warn('Content flagged for human review', {
        workoutId: workoutPlan.id,
        score: checks.overallScore,
        issues: Object.values(checks).flatMap(check => check.issues || [])
      });

      return reviewRecord;
    } catch (error) {
      piiSafeLogger.error('Failed to flag for human review', {
        error: error.message,
        workoutId: workoutPlan.id
      });
      return null;
    }
  }

  /**
   * Get ethical guidelines to embed in AI prompts
   */
  getEthicalPromptAddition() {
    return `
ETHICAL GUIDELINES - MANDATORY COMPLIANCE:
• CELEBRATE all body types and abilities
• Use encouraging, NEVER shaming language
• Accommodate physical limitations with dignity
• Avoid assumptions based on demographics
• Promote sustainable, healthy practices
• Include modifications for accessibility
• Use person-first, inclusive language
• Focus on progress, not perfection
• Respect individual differences and limitations
• Provide alternatives for all exercises

REQUIRED ELEMENTS:
- At least one modification per exercise
- Positive, encouraging tone throughout
- Inclusive language (e.g., "as you feel able", "if comfortable")
- No assumptions about gender, age, ability, or background
- Self-acceptance and body-positive messaging
`;
  }

  /**
   * Extract text content from workout plan
   * @param {Object} workoutPlan - Workout plan object
   */
  extractTextContent(workoutPlan) {
    let content = '';
    
    // Handle different workout plan structures
    if (typeof workoutPlan === 'string') {
      content = workoutPlan;
    } else if (workoutPlan.description) {
      content += workoutPlan.description + ' ';
    }
    
    if (workoutPlan.exercises && Array.isArray(workoutPlan.exercises)) {
      for (const exercise of workoutPlan.exercises) {
        if (exercise.name) content += exercise.name + ' ';
        if (exercise.description) content += exercise.description + ' ';
        if (exercise.instructions) content += exercise.instructions + ' ';
        if (exercise.modifications) content += exercise.modifications + ' ';
      }
    }
    
    if (workoutPlan.instructions) {
      content += workoutPlan.instructions + ' ';
    }
    
    if (workoutPlan.notes) {
      content += workoutPlan.notes + ' ';
    }
    
    return content.trim();
  }

  /**
   * Review nutrition plan for ethical compliance
   * @param {Object} nutritionPlan - Generated nutrition plan
   * @param {Object} clientProfile - Client profile information
   */
  async reviewNutritionGeneration(nutritionPlan, clientProfile) {
    try {
      // Similar ethical checks for nutrition content
      const checks = {
        inclusivity: await this.checkNutritionInclusion(nutritionPlan, clientProfile),
        bodyPositivity: await this.checkBodyPositivity(nutritionPlan),
        culturalSensitivity: await this.checkCulturalSensitivity(nutritionPlan, clientProfile),
        dietaryRestrictions: await this.verifyDietaryAccommodation(nutritionPlan, clientProfile),
        overallScore: 0,
        passed: false
      };

      checks.overallScore = this.calculateEthicalScore(checks, NUTRITION_CHECK_WEIGHTS);

      // A review is only "complete" when every check actually ran. `passed` requires BOTH a
      // complete review and a passing score — so no combination of stubbed checks can ever
      // produce `passed: true`. Callers that gate content on this must read `passed` alone;
      // `reviewComplete` and `unrunChecks` explain WHY a review did not pass, distinguishing
      // "reviewed and failed" from "never actually reviewed".
      const unrunChecks = this.collectUnrunChecks(checks, NUTRITION_CHECK_WEIGHTS);
      checks.reviewComplete = unrunChecks.length === 0;
      checks.unrunChecks = unrunChecks;
      checks.passed = checks.reviewComplete && checks.overallScore >= 85;

      if (!checks.reviewComplete) {
        checks.incompleteReason =
          `Nutrition ethical review did not run ${unrunChecks.length} of its checks ` +
          `(${unrunChecks.join(', ')}). This result is NOT an ethical clearance.`;
        piiSafeLogger.warn('Nutrition ethical review incomplete — checks not implemented', {
          planId: nutritionPlan?.id ?? null,
          unrunChecks,
          overallScore: checks.overallScore
        });
      }

      if (!checks.passed) {
        await this.flagForHumanReview(nutritionPlan, checks, clientProfile);
      }

      return checks;
    } catch (error) {
      // Optional chaining is load-bearing: this handler previously dereferenced `nutritionPlan.id`
      // and `clientProfile.userId` directly, so a null/undefined argument made the ERROR HANDLER
      // throw — the same "the failure path fails" defect this file was fixed for.
      piiSafeLogger.error('Nutrition ethical review failed', {
        error: error.message,
        planId: nutritionPlan?.id ?? null,
        userId: clientProfile?.userId ?? null
      });
      return { passed: false, error: error.message };
    }
  }

  /**
   * Check nutrition plan inclusion
   * @param {Object} nutritionPlan - Nutrition plan to check
   * @param {Object} clientProfile - Client profile
   */
  async checkNutritionInclusion(nutritionPlan, clientProfile) {
    // NOT IMPLEMENTED — would check dietary diversity / inclusion.
    return notImplementedCheck('checkNutritionInclusion');
  }

  /**
   * Check for body positivity in nutrition content
   * @param {Object} nutritionPlan - Nutrition plan to check
   */
  async checkBodyPositivity(nutritionPlan) {
    // NOT IMPLEMENTED — would detect diet-culture and restriction-mentality language.
    // This is the eating-disorder-safety check. Until it is implemented, it must never report a
    // pass: a false "body positivity: 90" on a restriction-promoting plan is the single most
    // damaging thing this file could claim.
    return notImplementedCheck('checkBodyPositivity');
  }

  /**
   * Check cultural sensitivity in nutrition recommendations
   * @param {Object} nutritionPlan - Nutrition plan to check
   * @param {Object} clientProfile - Client profile
   */
  async checkCulturalSensitivity(nutritionPlan, clientProfile) {
    // NOT IMPLEMENTED — would check cultural/religious food preferences and restrictions.
    return notImplementedCheck('checkCulturalSensitivity');
  }

  /**
   * Verify dietary restriction accommodation
   * @param {Object} nutritionPlan - Nutrition plan to verify
   * @param {Object} clientProfile - Client profile
   */
  async verifyDietaryAccommodation(nutritionPlan, clientProfile) {
    // NOT IMPLEMENTED — would verify declared allergies/intolerances/restrictions are honored.
    // This is the ALLERGEN check. It previously returned `{ passed: true, score: 90 }` without
    // reading either argument, so a plan containing an allergen a client had explicitly declared
    // was reported as accommodated. Implementing it for real is blocked on a first-class,
    // user-scoped dietary-identity model with a structured allergen taxonomy — today's
    // `ClientNutritionPlan.allergies` is free-text JSONB defaulting to `[]`, where "no allergies"
    // and "never asked" are the same value (see SWA-71). Until both exist, this reports honestly.
    return notImplementedCheck('verifyDietaryAccommodation');
  }
}

// Singleton instance
export const ethicalAIReview = new EthicalAIReview();

export default EthicalAIReview;
