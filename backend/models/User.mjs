// backend/models/User.simplified.mjs
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';
import bcrypt from 'bcryptjs';

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
    // Purchased sessions
    availableSessions: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Number of pre-purchased sessions available'
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
      comment: 'Total points earned in the gamification system'
    },
    level: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
      comment: 'Current level in the gamification system'
    },
    tier: {
      type: DataTypes.ENUM('bronze', 'silver', 'gold', 'platinum'),
      allowNull: true,
      defaultValue: 'bronze',
      comment: 'Current tier in the gamification system'
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

// Hash password before creating a new user
User.beforeCreate(async (user) => {
  try {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
  } catch (err) {
    console.error("Error in beforeCreate hook:", err);
    throw err;
  }
});

// Hash password before updating if it changed
User.beforeUpdate(async (user) => {
  try {
    // Only hash the password if it's changed AND is not already hashed
    // This prevents double-hashing when updating users with model-based scripts
    if (user.changed('password')) {
      // Simple check to detect if password is already hashed (bcrypt hashes start with $2a$, $2b$ or $2y$)
      if (!user.password.startsWith('$2')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
        console.log('Password hashed during update');
      } else {
        console.log('Password already hashed, skipping rehash');
      }
    }
  } catch (err) {
    console.error("Error in beforeUpdate hook:", err);
    throw err;
  }
});

export default User;