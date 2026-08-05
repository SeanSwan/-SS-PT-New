// backend/models/User.mjs
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';
import bcrypt from 'bcryptjs';
import logger from '../utils/logger.mjs';
import { normalizeClientTimeZoneUpdate } from '../services/clientTrainingDateService.mjs';

/**
 * Enhanced User Model
 * Supports clients, trainers, and admin roles with appropriate fields
 */
class User extends Model {
  /**
   * Compares a provided password with the stored hashed password.
   * @param {string} password - The plain text password.
   * @returns {Promise<boolean>} True if the password matches.
   */
  async checkPassword(password) {
    return bcrypt.compare(password, this.password);
  }
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    // Basic personal details
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: {
        msg: 'Email address already in use.',
      },
      validate: {
        isEmail: { msg: 'Must be a valid email address.' },
      },
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: {
        msg: 'Username already in use.',
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    // Contact information
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Profile photo
    photo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    bodyMapHeadPhoto: {
      // Slice 2 (A4): optional DEDICATED head photo for the pain-chart body
      // figure — the main profile photo may be a logo/pet/brand image that
      // makes no sense on a body map. Falls back to `photo` when null.
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Dedicated body-map head photo URL (falls back to photo)',
    },
    bannerPhoto: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Banner/cover photo URL for client profile'
    },
    bannerObjectPosition: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: '50% 50%',
      comment: 'CSS object-position percentage coordinates for manual banner crop alignment.',
    },
    bannerObjectFit: {
      type: DataTypes.STRING(12),
      allowNull: false,
      defaultValue: 'smart',
      comment: 'Banner composition mode: smart, cover, contain, fill, tile, or collage.',
    },
    bannerImageScale: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 1,
      comment: 'Manual banner photo zoom multiplier for the dashboard cover image.',
    },
    bannerFrameHeight: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 320,
      comment: 'Manual dashboard cover frame height in pixels.',
    },
    bannerCollagePhotos: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      comment: 'Safe uploaded image/video URLs used by collage banner mode.',
    },
    bannerCollageLayout: {
      type: DataTypes.STRING(24),
      allowNull: false,
      defaultValue: 'stream',
      comment: 'Dashboard collage presentation layout, including grid and carousel variants.',
    },
    bannerStickyCarousel: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether carousel banner layouts render a compact sticky strip while scrolling.',
    },
    bannerPresets: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      comment: 'Saved dashboard banner composition presets.',
    },
    // Role - now supports user, client, trainer, and admin
    role: {
      type: DataTypes.ENUM('user', 'client', 'trainer', 'admin'),
      allowNull: false,
      defaultValue: 'user',
    },
    
    // ========== CLIENT-SPECIFIC FIELDS ==========
    // Physical attributes
    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    gender: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    weight: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    height: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    // Fitness information
    fitnessGoal: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    trainingExperience: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    healthConcerns: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    emergencyContact: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // AI-Powered Personal Training Master Prompt
    masterPromptJson: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Complete client master prompt JSON (v3.0 schema) for AI-powered coaching'
    },
    spiritName: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Client spirit name for privacy (e.g., "Golden Hawk", "Silver Crane")'
    },
    // Purchased sessions
    availableSessions: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Number of pre-purchased sessions available'
    },
    // Subscription tier tracking
    subscriptionTier: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: 'free',
      comment: 'Current subscription tier: free, pro, elite'
    },
    aiMessagesUsedThisMonth: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'AI chat messages used in current month (no cap — anomaly detection only)'
    },
    aiGenerationsUsedThisMonth: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'AI workout generations used in current month (no cap — anomaly detection only)'
    },
    aiUsageResetDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Next date to reset monthly AI usage counters'
    },
    // Measurement schedule tracking
    lastFullMeasurementDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date of last full body measurement'
    },
    lastWeighInDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date of last weight-only check'
    },
    measurementIntervalDays: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 30,
      comment: 'Monthly cadence for full body measurements'
    },
    weighInIntervalDays: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 7,
      comment: 'Weekly cadence for weight-only checks'
    },

    // ========== TRAINER-SPECIFIC FIELDS ==========
    // Professional information
    specialties: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Trainer specialties/focus areas'
    },
    certifications: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Trainer certifications'
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Trainer biography for client view'
    },
    // Scheduling information
    availableDays: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'JSON string of days the trainer is typically available'
    },
    availableHours: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'JSON string of hours the trainer is typically available'
    },
    // Billing information
    hourlyRate: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Trainer hourly rate'
    },
    // Per-trainer default compensation (migration 20260714000003) — new
    // client-trainer assignments inherit these when the admin doesn't
    // specify compensation explicitly.
    defaultCompensationMode: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'revenue_share',
      validate: { isIn: [['revenue_share', 'per_session_flat']] },
      comment: 'Compensation mode new assignments inherit for this trainer'
    },
    defaultFlatSessionRate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: { min: 0 },
      comment: 'Flat $/completed-session rate inherited when mode is per_session_flat'
    },
    trainerType: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: null,
      validate: { isIn: [['affiliated', 'independent']] },
      comment: 'Trainer type: affiliated (SS employed, full access) | independent (own business, limited permissions)'
    },

    // ========== ADMIN-SPECIFIC FIELDS ==========
    // Administrative permissions
    permissions: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'JSON string of specific admin permissions'
    },
    
    // ========== COMMON FIELDS ==========
    // Account status
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether the user account is active'
    },
    accountDeactivatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the account was admin-deactivated for soft-delete retention.'
    },
    accountRetentionUntil: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the soft-deleted account becomes eligible for final cleanup review.'
    },
    forcePasswordChange: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Requires password change on next login (admin-created accounts)'
    },
    isOnboardingComplete: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether user completed onboarding questionnaire'
    },
    canGenerateWorkoutPlans: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'L5 (2026-05-02): per-client opt-in for self-service workout plan generation. Backend ALSO requires ENABLE_CLIENT_PLAN_SELFGEN env flag. Migration 20260502000000.'
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp of last login'
    },
    // Communication preferences
    emailNotifications: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true,
      comment: 'Whether to send email notifications'
    },
    smsNotifications: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true,
      comment: 'Whether to send SMS notifications'
    },
    notificationPreferences: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Per-user notification preferences (email/sms/push/quietHours)'
    },
    // Canonical client-local date context. Existing accounts receive the
    // documented account default until the client explicitly chooses a zone.
    timeZone: {
      type: DataTypes.STRING(64),
      allowNull: false,
      defaultValue: 'America/Los_Angeles',
      validate: {
        isIanaTimeZone(value) {
          normalizeClientTimeZoneUpdate(value);
        },
      },
      comment: 'Validated IANA time zone governing workout-plan dates',
    },
    timeZoneConfigured: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'True after the client explicitly saves their time zone',
    },
    // Misc user settings
    preferences: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'JSON string of user preferences'
    },
    
    // ========== GAMIFICATION FIELDS ==========
    points: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Spendable point balance (wallet). Decreases on spend/redeem — do NOT use for level/rank; use lifetimePointsEarned.'
    },
    lifetimePointsEarned: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Lifetime earned points (earn+bonus+adjustment, never spend/expire). Drives level/rank; never reduced by spending.'
    },
    leaderboardOptIn: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether the user appears on public leaderboards (existing users preserved as visible).'
    },
    level: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
      comment: 'Current level in the gamification system'
    },
    tier: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'bronze_forge',
      comment: 'Current tier in the Crystalline Swan gamification system'
    },
    selectedRankTitleKey: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'User-selected earned public rank title key for profile display'
    },
    streakDays: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Current consecutive days with activity'
    },
    lastActivityDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date of last recorded activity for streak calculation'
    },
    totalWorkouts: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Total number of workouts completed'
    },
    totalExercises: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Total number of exercises completed'
    },
    exercisesCompleted: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'JSON object tracking completed exercises by ID and count'
    },
    // Remove the problematic foreign key reference
    // badgesPrimary field removed
    
    // ========== CLIENT SOURCE TRACKING ==========
    // Tracks where the client comes from (AI Village consensus: STRING + Zod, not ENUM)
    clientSource: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'swanstudios',
      validate: {
        isIn: [['swanstudios', 'move_fitness', 'external']]
      },
      comment: 'Client origin: swanstudios (package holder), move_fitness (gym client), external (other)'
    },
    sessionBillingMode: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: 'paid_sessions',
      validate: {
        isIn: [['paid_sessions', 'no_session_required']]
      },
      comment: 'Per-account billing mode: paid_sessions deducts credits; no_session_required bypasses paid-session depletion'
    },

    // ========== ACCOUNT STATUS & CLAIM TOKEN (Crystalline Link Protocol) ==========
    accountStatus: {
      type: DataTypes.ENUM('stub', 'invited', 'active'),
      allowNull: false,
      defaultValue: 'active',
      comment: 'stub=admin-created no login, invited=claim token sent, active=can login'
    },
    claimTokenHash: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Bcrypt hash of SWAN-XXXX invite code for account claiming'
    },
    claimTokenExpires: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '30-day expiry for claim tokens'
    },

    // ========== PROFILE PRIVACY SETTINGS ==========
    // AI Village 9-Brain Consensus (2026-03-15): app-level privacy, not DB RLS
    profileVisibility: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'public',
      validate: {
        isIn: [['public', 'friends_only', 'private']]
      },
      comment: 'Profile visibility: public (anyone), friends_only (accepted friends), private (self only)'
    },
    showBadges: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether badges/achievements are visible on public profile'
    },
    showAchievements: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether achievement progress is visible on public profile'
    },
    showStats: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether workout stats are visible on public profile'
    },
    showWorkoutHistory: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether detailed workout history is visible (default off for privacy)'
    },
    showLevel: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether level and XP are visible on public profile'
    },

    // Per-chart visibility toggles (privacy-first: all default OFF)
    // Keys aligned with ProfileChartsSection chart registry + backend validation
    chartVisibility: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        workoutFrequency: false,
        weightProgression: false,
        muscleRadar: false,
        macroSplit: false,
        cardioEndurance: false,
        sessionFrequency: false,
        bodyFatTrend: false,
        muscleRecovery: false,
        rpeByExercise: false,
        exerciseRolodex: false,
        workoutHeatmap: false,
        goalProgress: false,
      },
      comment: 'Per-chart visibility on public profile (opt-in, all default false)'
    },

    // ========== STRIPE INTEGRATION FIELDS ==========
    // Stripe customer ID for payment processing
    stripeCustomerId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Stripe customer ID for payment processing and subscription management'
    },
    
    // Authentication fields
    refreshTokenHash: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    failedLoginAttempts: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    isLocked: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    lastLoginIP: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    registrationIP: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    lastActive: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    resetPasswordToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    resetPasswordExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    }
  },
  {
    sequelize,
    modelName: 'User',
    tableName: '"Users"',
    timestamps: true,
    paranoid: true // Soft deletes
  }
);

// Sequelize/PostgreSQL cannot cast '' to DATE/DATEONLY/FLOAT/INTEGER/etc.
// The frontend (OptimizedSignupModal and similar forms) initializes optional
// fields as '' rather than null, and the resulting cast failure escapes
// Sequelize as SequelizeDatabaseError, which then escapes the controller's
// catch block and 500s the endpoint.
//
// Incident 2026-04-30: blank dateOfBirth / weight / height in
// OptimizedSignupModal triggered 500 from authController.register's outer
// catch. Fix is at the model layer so every entry point benefits (register,
// profile update, admin user-create, etc.) — not just the one controller.
const TYPED_FIELD_KINDS_REQUIRING_NULL_NORMALIZATION = new Set([
  'DATE',
  'DATEONLY',
  'TIME',
  'FLOAT',
  'DOUBLE',
  'INTEGER',
  'BIGINT',
  'DECIMAL',
  'BOOLEAN',
]);

/**
 * Normalize empty-string values to null for nullable typed fields.
 * Pure function exported for unit testing without Sequelize instantiation.
 * @param {Object} userLike - object with field values (may be a Sequelize
 *                            instance or a plain object)
 * @param {Object} rawAttributes - Sequelize rawAttributes definition
 *                                 (each entry: { type: { key }, allowNull, ... })
 */
export function normalizeEmptyTypedFields(userLike, rawAttributes) {
  if (!userLike || !rawAttributes) return;
  for (const [field, def] of Object.entries(rawAttributes)) {
    const kind = def?.type?.key;
    if (!kind) continue;
    if (!TYPED_FIELD_KINDS_REQUIRING_NULL_NORMALIZATION.has(kind)) continue;
    if (def.allowNull === false) continue;
    if (userLike[field] === '') {
      userLike[field] = null;
    }
  }
}

User.beforeValidate((user) => {
  normalizeEmptyTypedFields(user, User.rawAttributes);
});

// Hash password before creating a new user
User.beforeCreate(async (user) => {
  try {
    // Skip if password is null, empty, or already a bcrypt hash
    // Only hash if password exists and is not empty
    if (!user.password || user.password.length === 0) {
      return;
    }
    // Hash the password — user.changed() is not reliable in beforeCreate
    // so we always hash on creation
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
  } catch (err) {
    logger.error('Error in beforeCreate hook', { error: err.message, stack: err.stack });
    throw err;
  }
});

// Hash password before updating if it changed
User.beforeUpdate(async (user) => {
  try {
    // Only hash if password field was actually changed (prevents double-hashing)
    if (user.changed('password') && user.password && user.password.length > 0) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(user.password, salt);
    }
  } catch (err) {
    logger.error('Error in beforeUpdate hook', { error: err.message, stack: err.stack });
    throw err;
  }
});

export default User;
