// backend/controllers/onboardingController.mjs
import User from '../models/User.mjs';
import sequelize from '../database.mjs';
import { triggerSequence } from '../services/automationService.mjs';

/**
 * Onboarding Controller
 * =====================
 * Handles client onboarding questionnaire data and transforms it into
 * Master Prompt JSON (v3.0 schema) for AI-powered coaching.
 *
 * POST /api/onboarding - Creates/updates client with complete master prompt
 */

/**
 * Generate spirit name from preferences or auto-generate
 */
const generateSpiritName = (formData) => {
  // If client provided a preferred alias, use it
  if (formData.preferredAlias) {
    return formData.preferredAlias;
  }

  // Otherwise auto-generate based on goals/personality
  const celestialNames = [
    'Golden Hawk', 'Silver Crane', 'Thunder Phoenix', 'Mountain Bear',
    'Rising Eagle', 'Wise Owl', 'Stone Bison', 'Young Falcon',
    'Crimson Wolf', 'Emerald Dragon', 'Azure Lion', 'Amber Tiger',
    'Sapphire Fox', 'Ruby Leopard', 'Jade Panther', 'Pearl Lynx'
  ];

  // Use a random spirit name (in production, you might use a more sophisticated algorithm)
  return celestialNames[Math.floor(Math.random() * celestialNames.length)];
};

/**
 * Transform 85-question CLIENT-ONBOARDING-QUESTIONNAIRE.md data
 * into Master Prompt JSON (v3.0 schema)
 */
const transformQuestionnaireToMasterPrompt = (formData, userId) => {
  // Extract all 85 data points from questionnaire
  const masterPrompt = {
    version: '3.0',

    // SECTION 1: CLIENT PROFILE (Questions 1-15)
    client: {
      name: formData.fullName, // Will be REDACTED before AI processing
      preferredName: formData.preferredName || formData.fullName,
      alias: formData.spiritName, // Privacy-preserving alias
      age: formData.age,
      gender: formData.gender,
      bloodType: formData.bloodType || 'Unknown',
      contact: {
        phone: formData.phone,
        email: formData.email,
        preferredTime: formData.bestTimeToReach
      }
    },

    // Physical measurements (Questions 11-15)
    measurements: {
      height: {
        feet: parseInt(formData.heightFeet),
        inches: parseInt(formData.heightInches)
      },
      currentWeight: parseFloat(formData.currentWeight),
      targetWeight: formData.targetWeight ? parseFloat(formData.targetWeight) : null,
      bodyFatPercentage: formData.bodyFatPercentage ? parseFloat(formData.bodyFatPercentage) : null,
      lastDexaScan: formData.lastDexaScanDate || null
    },

    // SECTION 2: FITNESS GOALS (Questions 16-22)
    goals: {
      primary: formData.primaryGoal,
      why: formData.whyGoalMatters,
      successLooksLike: formData.successIn6Months,
      timeline: formData.desiredTimeline,
      commitmentLevel: parseInt(formData.commitmentLevel),
      pastObstacles: formData.pastObstacles || '',
      supportNeeded: formData.supportNeeded || ''
    },

    // SECTION 3: HEALTH HISTORY (Questions 23-31)
    health: {
      medicalConditions: formData.medicalConditions || [],
      underDoctorCare: formData.underDoctorCare === 'yes',
      doctorCleared: formData.doctorCleared === 'yes',
      medications: formData.medications || [],
      supplements: formData.supplements || [],
      injuries: formData.pastInjuries || [],
      surgeries: formData.pastSurgeries || [],
      currentPain: formData.currentPain || []
    },

    // SECTION 4: NUTRITION & LIFESTYLE (Questions 32-48)
    nutrition: {
      currentDiet: formData.currentDietQuality,
      tracksFood: formData.tracksFood === 'yes',
      trackingApp: formData.trackingApp || null,
      dailyProtein: formData.dailyProtein ? parseFloat(formData.dailyProtein) : 0,
      targetProtein: formData.targetProtein ? parseFloat(formData.targetProtein) : 0,
      waterIntake: formData.waterIntake ? parseInt(formData.waterIntake) : 0,
      eatingSchedule: {
        breakfast: formData.breakfastTime || '',
        lunch: formData.lunchTime || '',
        dinner: formData.dinnerTime || '',
        snacks: formData.snacksPerDay ? parseInt(formData.snacksPerDay) : 0
      },
      bloodTypeDiet: formData.interestedInBloodTypeDiet === 'yes',
      dietaryPreferences: formData.dietaryPreferences || [],
      allergies: formData.foodAllergies || [],
      lovesFood: formData.foodsYouLove || [],
      hatesFood: formData.foodsYouHate || [],
      cooksAtHome: formData.cooksAtHome,
      mealPrepInterest: formData.mealPrepInterest === 'yes'
    },

    lifestyle: {
      sleepHours: formData.sleepHours ? parseFloat(formData.sleepHours) : 0,
      sleepQuality: formData.sleepQuality,
      stressLevel: parseInt(formData.stressLevel),
      stressSources: formData.stressSources || '',
      occupation: formData.occupation,
      workActivityLevel: formData.workActivityLevel,
      smokes: formData.smokes === 'yes',
      alcoholConsumption: formData.alcoholConsumption
    },

    // SECTION 5: TRAINING HISTORY (Questions 49-63)
    training: {
      fitnessLevel: formData.fitnessLevel,
      currentlyWorkingOut: formData.currentlyWorkingOut === 'yes',
      workoutsPerWeek: formData.workoutsPerWeek ? parseInt(formData.workoutsPerWeek) : 0,
      workoutTypes: formData.workoutTypes || '',
      pastExperience: formData.pastTrainingExperience || [],
      previousTrainer: formData.previousTrainer === 'yes',
      previousTrainerExperience: formData.previousTrainerExperience || '',
      gymLocation: formData.gymLocation,
      favoriteExercises: formData.favoriteExercises || [],
      dislikedExercises: formData.dislikedExercises || [],
      preferredStyle: formData.preferredTrainingStyle || [],
      sessionFrequency: parseInt(formData.sessionFrequency),
      sessionDuration: formData.sessionDuration
    },

    // SECTION 5.3: Baseline Fitness Tests (Questions 60-63)
    // These are typically filled in during Session 1, so they may be null initially
    baseline: {
      cardiovascular: {
        restingHeartRate: formData.restingHeartRate ? parseInt(formData.restingHeartRate) : null,
        bloodPressure: formData.bloodPressureSystolic ? {
          systolic: parseInt(formData.bloodPressureSystolic),
          diastolic: parseInt(formData.bloodPressureDiastolic)
        } : null
      },
      strength: {
        benchPress: formData.benchPress ? {
          weight: parseFloat(formData.benchPress.weight),
          reps: parseInt(formData.benchPress.reps)
        } : null,
        squat: formData.squat ? {
          weight: parseFloat(formData.squat.weight),
          reps: parseInt(formData.squat.reps)
        } : null,
        deadlift: formData.deadlift ? {
          weight: parseFloat(formData.deadlift.weight),
          reps: parseInt(formData.deadlift.reps)
        } : null,
        overheadPress: formData.overheadPress ? {
          weight: parseFloat(formData.overheadPress.weight),
          reps: parseInt(formData.overheadPress.reps)
        } : null,
        pullUps: formData.pullUps ? {
          reps: parseInt(formData.pullUps.reps),
          assisted: formData.pullUps.assisted === 'yes'
        } : null
      },
      rangeOfMotion: formData.rangeOfMotion || null,
      flexibility: formData.flexibility || null
    },

    // SECTION 6: AI-POWERED COACHING SETUP (Questions 64-70)
    aiCoaching: {
      dailyCheckIns: formData.dailyCheckIns === 'yes',
      checkInTime: formData.checkInTime || '',
      checkInMethod: formData.checkInMethod,
      aiHelp: formData.aiHelp || [],
      communicationStyle: formData.communicationStyle,
      motivationStyle: formData.motivationStyle,
      progressReportFrequency: formData.progressReportFrequency
    },

    // SECTION 7: VISUAL DIAGNOSTICS (Questions 71-74)
    visualDiagnostics: {
      comfortableWithPhotos: formData.comfortableWithPhotos === 'yes',
      painPhotos: formData.painPhotos === 'yes',
      wearable: formData.wearable || 'None',
      wearableIntegration: formData.wearableIntegration === 'yes'
    },

    // SECTION 8: INVESTMENT & COMMITMENT (Questions 75-79)
    package: {
      tier: formData.trainingTier, // 'Silver', 'Golden', or 'Rhodium'
      price: formData.sessionPrice ? parseFloat(formData.sessionPrice) : 0,
      sessionsPerWeek: parseInt(formData.sessionFrequency),
      commitment: formData.packageCommitment,
      paymentMethod: formData.paymentMethod
    },

    // SECTION 10: FINAL THOUGHTS (Questions 82-85)
    notes: {
      anythingElse: formData.anythingElse || '',
      mostExcitedAbout: formData.mostExcitedAbout || '',
      nervousAbout: formData.nervousAbout || '',
      questionsForTrainer: formData.questionsForTrainer || ''
    },

    // Trainer Assessment (Post-intake)
    trainerAssessment: {
      healthRisk: formData.healthRisk || 'Low',
      doctorClearanceNeeded: formData.doctorClearanceNeeded === 'yes',
      priorityAreas: formData.priorityAreas || '',
      recommendedFrequency: formData.recommendedFrequency ? parseInt(formData.recommendedFrequency) : null,
      recommendedTier: formData.recommendedTier || null
    },

    // Metadata
    metadata: {
      intakeDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD
      firstSessionDate: formData.firstSessionDate || null,
      createdBy: 'SwanStudios Personal Training System v3.0',
      lastUpdated: new Date().toISOString()
    }
  };

  return masterPrompt;
};

/**
 * POST /api/onboarding
 * Create or update a client with complete onboarding data
 */
export const createClientOnboarding = async (req, res) => {
  try {
    const formData = req.body;

    // Validate required fields
    if (!formData.fullName || !formData.email || !formData.primaryGoal) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: fullName, email, primaryGoal'
      });
    }

    // Generate spirit name for privacy
    const spiritName = generateSpiritName(formData);

    // Transform questionnaire data to Master Prompt JSON
    const masterPromptJson = transformQuestionnaireToMasterPrompt(formData, null);

    // Add the generated spirit name to the master prompt
    masterPromptJson.client.alias = spiritName;

    // Check if user already exists
    let user = await User.findOne({ where: { email: formData.email } });

    if (user) {
      // Update existing user
      await user.update({
        firstName: formData.fullName.split(' ')[0],
        lastName: formData.fullName.split(' ').slice(1).join(' '),
        phone: formData.phone,
        role: 'client',
        masterPromptJson: masterPromptJson,
        spiritName: spiritName,
        // Update other client-specific fields
        dateOfBirth: formData.dateOfBirth || null,
        gender: formData.gender,
        weight: formData.currentWeight,
        height: formData.heightFeet * 12 + formData.heightInches, // Convert to inches
        fitnessGoal: formData.primaryGoal
      });

      // Also update/create PII record
      const clientId = `PT-${String(user.id).padStart(5, '0')}`;
      await sequelize.query(`
        INSERT INTO clients_pii (client_id, real_name, spirit_name, status, start_date, privacy_level, "createdAt", "updatedAt")
        VALUES (:clientId, :realName, :spiritName, 'active', CURRENT_DATE, 'standard', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (client_id) DO UPDATE SET
          real_name = EXCLUDED.real_name,
          spirit_name = EXCLUDED.spirit_name,
          "updatedAt" = CURRENT_TIMESTAMP
      `, {
        replacements: {
          clientId: clientId,
          realName: formData.fullName,
          spiritName: spiritName
        }
      });

      return res.status(200).json({
        success: true,
        message: 'Client onboarding updated successfully',
        data: {
          userId: user.id,
          clientId: `PT-${String(user.id).padStart(5, '0')}`,
          spiritName: spiritName,
          email: user.email,
          masterPromptCreated: true
        }
      });
    } else {
      // Create new user
      // Generate a temporary password (client will reset on first login)
      const tempPassword = `Temp${Math.random().toString(36).slice(-8)}!`;

      user = await User.create({
        firstName: formData.fullName.split(' ')[0],
        lastName: formData.fullName.split(' ').slice(1).join(' '),
        email: formData.email,
        username: formData.email.split('@')[0], // Use email prefix as username
        password: tempPassword,
        phone: formData.phone,
        role: 'client',
        masterPromptJson: masterPromptJson,
        spiritName: spiritName,
        // Client-specific fields
        dateOfBirth: formData.dateOfBirth || null,
        gender: formData.gender,
        weight: formData.currentWeight,
        height: formData.heightFeet * 12 + formData.heightInches, // Convert to inches
        fitnessGoal: formData.primaryGoal,
        isActive: true
      });

      // Create PII record
      const clientId = `PT-${String(user.id).padStart(5, '0')}`;
      await sequelize.query(`
        INSERT INTO clients_pii (client_id, real_name, spirit_name, status, start_date, current_program, privacy_level, created_by, "createdAt", "updatedAt")
        VALUES (:clientId, :realName, :spiritName, 'active', CURRENT_DATE, :currentProgram, 'standard', :createdBy, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, {
        replacements: {
          clientId: clientId,
          realName: formData.fullName,
          spiritName: spiritName,
          currentProgram: formData.primaryGoal,
          createdBy: req.user?.id || null
        }
      });

      try {
        await triggerSequence('client_created', user.id, {
          clientName: formData.fullName
        });
      } catch (sequenceError) {
        console.error('[Onboarding Controller] Automation trigger failed:', sequenceError);
      }

      return res.status(201).json({
        success: true,
        message: 'Client onboarding created successfully',
        data: {
          userId: user.id,
          clientId: `PT-${String(user.id).padStart(5, '0')}`,
          spiritName: spiritName,
          email: user.email,
          tempPassword: tempPassword, // Send this via secure channel (email)
          masterPromptCreated: true
        }
      });
    }
  } catch (error) {
    console.error('[Onboarding Controller] Error creating client onboarding:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process onboarding',
      details: error.message
    });
  }
};

/**
 * GET /api/onboarding/:userId
 * Retrieve a client's master prompt JSON
 */
export const getClientMasterPrompt = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId, {
      attributes: ['id', 'firstName', 'lastName', 'email', 'spiritName', 'masterPromptJson', 'role']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (user.role !== 'client') {
      return res.status(400).json({
        success: false,
        error: 'User is not a client'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        userId: user.id,
        spiritName: user.spiritName,
        email: user.email,
        masterPrompt: user.masterPromptJson
      }
    });
  } catch (error) {
    console.error('[Onboarding Controller] Error fetching master prompt:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch master prompt',
      details: error.message
    });
  }
};

export default {
  createClientOnboarding,
  getClientMasterPrompt
};
