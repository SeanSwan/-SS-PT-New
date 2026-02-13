/**
 * DailyWorkoutForm Model - NASM Professional Workout Tracking System
 * ===================================================================
 * Master Prompt v43 aligned - Professional trainer workflow management
 * 
 * This model represents the complete NASM-compliant workout form that trainers
 * fill out for each client session. It serves as the bridge between the physical
 * training session and the digital tracking/gamification systems.
 * 
 * Core Features:
 * ✅ NASM-compliant exercise logging with form ratings
 * ✅ Automatic session deduction from client accounts
 * ✅ MCP server integration for gamification processing
 * ✅ JSONB storage for complex exercise/set data structures
 * ✅ Transactional safety for session billing
 * ✅ Trainer-client assignment validation
 * ✅ Professional audit trail for liability protection
 * 
 * Workflow Integration:
 * 1. Trainer logs workout using WorkoutLogger component
 * 2. Form data saved with session deduction (atomic transaction)
 * 3. MCP servers process data for gamification points
 * 4. Client progress charts updated via WebSocket
 * 5. Admin analytics populated for business intelligence
 * 
 * Data Structure:
 * - formData contains complete NASM exercise form data
 * - Includes sets, reps, weight, RPE, form ratings, pain levels
 * - Links to WorkoutSession for workout analytics
 * - Enables trainer performance tracking and client progress
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

/**
 * NASM Form Data Structure (for reference)
 * This is the expected structure stored in the formData JSONB field:
 * 
 * {
 *   exercises: [
 *     {
 *       exerciseId: string,
 *       exerciseName: string,
 *       sets: [
 *         {
 *           setNumber: number,
 *           weight: number,
 *           reps: number,
 *           rpe: number (1-10),
 *           tempo: string,
 *           restTime: number,
 *           formQuality: number (1-5),
 *           notes: string
 *         }
 *       ],
 *       formRating: number (1-5),
 *       painLevel: number (0-10),
 *       performanceNotes: string
 *     }
 *   ],
 *   sessionNotes: string,
 *   overallIntensity: number (1-10),
 *   submittedBy: number (trainerId),
 *   submittedAt: Date
 * }
 */

/**
 * DailyWorkoutForm Model Class
 * Manages professional NASM workout form submissions
 */
class DailyWorkoutForm extends Model {
  /**
   * Check if this form has been processed by MCP servers
   * @returns {boolean} True if MCP processing is complete
   */
  isMcpProcessed() {
    return this.mcpProcessed === true;
  }

  /**
   * Check if session has been deducted from client account
   * @returns {boolean} True if session billing is complete
   */
  isSessionDeducted() {
    return this.sessionDeducted === true;
  }

  /**
   * Get exercise count from form data
   * @returns {number} Number of exercises logged in this session
   */
  getExerciseCount() {
    if (!this.formData || !this.formData.exercises) return 0;
    return this.formData.exercises.length;
  }

  /**
   * Get total sets from form data
   * @returns {number} Total number of sets performed
   */
  getTotalSets() {
    if (!this.formData || !this.formData.exercises) return 0;
    return this.formData.exercises.reduce((total, exercise) => {
      return total + (exercise.sets ? exercise.sets.length : 0);
    }, 0);
  }

  /**
   * Get total volume (weight x reps) from form data
   * @returns {number} Total volume lifted in this session
   */
  getTotalVolume() {
    if (!this.formData || !this.formData.exercises) return 0;
    return this.formData.exercises.reduce((total, exercise) => {
      if (!exercise.sets) return total;
      return total + exercise.sets.reduce((exerciseTotal, set) => {
        return exerciseTotal + ((set.weight || 0) * (set.reps || 0));
      }, 0);
    }, 0);
  }

  /**
   * Get average form rating from all exercises
   * @returns {number} Average form rating (1-5 scale)
   */
  getAverageFormRating() {
    if (!this.formData || !this.formData.exercises) return 0;
    const exercisesWithRatings = this.formData.exercises.filter(ex => ex.formRating);
    if (exercisesWithRatings.length === 0) return 0;
    
    const total = exercisesWithRatings.reduce((sum, ex) => sum + ex.formRating, 0);
    return Math.round((total / exercisesWithRatings.length) * 10) / 10; // Round to 1 decimal
  }

  /**
   * Get form summary for admin dashboard and client progress
   * @returns {Object} Comprehensive form summary
   */
  getFormSummary() {
    return {
      id: this.id,
      clientId: this.clientId,
      trainerId: this.trainerId,
      date: this.date,
      exerciseCount: this.getExerciseCount(),
      totalSets: this.getTotalSets(),
      totalVolume: this.getTotalVolume(),
      averageFormRating: this.getAverageFormRating(),
      overallIntensity: this.formData?.overallIntensity || 0,
      pointsEarned: this.totalPointsEarned,
      sessionDeducted: this.sessionDeducted,
      mcpProcessed: this.mcpProcessed,
      submittedAt: this.submittedAt
    };
  }
}

DailyWorkoutForm.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Unique identifier for each workout form submission'
    },
    sessionId: {
      type: DataTypes.UUID,
      allowNull: true, // Can be null initially, linked after WorkoutSession creation
      field: 'session_id', // Map camelCase to snake_case
      references: { 
        model: 'workout_sessions', // Table name in snake_case
        key: 'id' 
      },
      comment: 'Link to the associated WorkoutSession record'
    },
    clientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'client_id', // Map camelCase to snake_case
      references: { 
        model: 'users', // Table name in snake_case
        key: 'id' 
      },
      comment: 'ID of the client who performed this workout'
    },
    trainerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'trainer_id', // Map camelCase to snake_case
      references: { 
        model: 'users', // Table name in snake_case
        key: 'id' 
      },
      comment: 'ID of the trainer who logged this workout'
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Date when the workout session occurred'
    },
    formData: {
      type: DataTypes.JSONB, // PostgreSQL JSONB for efficient querying
      allowNull: false,
      field: 'form_data', // Map camelCase to snake_case
      comment: 'Complete NASM form data including exercises, sets, ratings, and notes'
    },
    sessionDeducted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      field: 'session_deducted', // Map camelCase to snake_case
      comment: 'Whether this form submission resulted in session deduction from client'
    },
    totalPointsEarned: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      field: 'total_points_earned', // Map camelCase to snake_case
      comment: 'Gamification points earned from this workout (set by MCP server)'
    },
    mcpProcessed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      field: 'mcp_processed', // Map camelCase to snake_case
      comment: 'Whether this form has been processed by MCP servers for gamification'
    },
    submittedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
      field: 'submitted_at', // Map camelCase to snake_case
      comment: 'Timestamp when the form was submitted by the trainer'
    },
    // Audit and processing fields
    processingStartedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'processing_started_at', // Map camelCase to snake_case
      comment: 'Timestamp when MCP processing began'
    },
    processingCompletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'processing_completed_at', // Map camelCase to snake_case
      comment: 'Timestamp when MCP processing completed successfully'
    },
    processingErrors: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'processing_errors', // Map camelCase to snake_case
      comment: 'Any errors encountered during MCP processing'
    },
    // Form validation and quality metrics
    formVersion: {
      type: DataTypes.STRING,
      defaultValue: '1.0',
      allowNull: false,
      field: 'form_version', // Map camelCase to snake_case
      comment: 'Version of the NASM form structure used'
    },
    estimatedDuration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'estimated_duration', // Map camelCase to snake_case
      comment: 'Estimated workout duration in minutes (calculated from form data)'
    },
    trainerNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'trainer_notes',
      comment: 'Trainer notes visible to client (homework, focus areas)'
    },
    clientSummary: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'client_summary',
      comment: 'Client-ready workout summary (auto-generated or manual)'
    }
  },
  {
    sequelize,
    modelName: 'DailyWorkoutForm',
    tableName: 'daily_workout_forms',
    timestamps: true, // Enables createdAt and updatedAt
    paranoid: false, // Hard deletes only (forms are permanent records)
    indexes: [
      // Optimize for common queries
      {
        name: 'idx_daily_workout_forms_client_id',
        fields: ['clientId']
      },
      {
        name: 'idx_daily_workout_forms_trainer_id',
        fields: ['trainerId']
      },
      {
        name: 'idx_daily_workout_forms_date',
        fields: ['date']
      },
      {
        name: 'idx_daily_workout_forms_session_id',
        fields: ['sessionId']
      },
      // Optimize for MCP processing queries
      {
        name: 'idx_daily_workout_forms_mcp_processed',
        fields: ['mcpProcessed']
      },
      {
        name: 'idx_daily_workout_forms_session_deducted',
        fields: ['sessionDeducted']
      },
      // Optimize for client progress queries (date range)
      {
        name: 'idx_daily_workout_forms_client_date',
        fields: ['clientId', 'date']
      },
      // Optimize for trainer performance queries
      {
        name: 'idx_daily_workout_forms_trainer_date',
        fields: ['trainerId', 'date']
      },
      // JSONB indexes for form data queries
      {
        name: 'idx_daily_workout_forms_form_data_gin',
        fields: ['formData'],
        using: 'gin' // GIN index for JSONB queries
      }
    ],
    // Model-level validations
    validate: {
      // Ensure client and trainer are different users
      clientTrainerDifferent() {
        if (this.clientId === this.trainerId) {
          throw new Error('Client and trainer must be different users');
        }
      },
      // Ensure date is not in the future
      dateNotFuture() {
        const today = new Date().toISOString().split('T')[0];
        if (this.date > today) {
          throw new Error('Workout date cannot be in the future');
        }
      },
      // Validate form data structure
      formDataStructure() {
        if (!this.formData || typeof this.formData !== 'object') {
          throw new Error('Form data must be a valid object');
        }
        if (!this.formData.exercises || !Array.isArray(this.formData.exercises)) {
          throw new Error('Form data must include exercises array');
        }
        if (this.formData.exercises.length === 0) {
          throw new Error('At least one exercise must be logged');
        }
      }
    },
    // Hooks for automatic processing
    hooks: {
      // Before creating a form, estimate duration
      beforeCreate: async (form, options) => {
        if (form.formData && form.formData.exercises) {
          const totalSets = form.getTotalSets();
          form.estimatedDuration = Math.min(totalSets * 3, 120); // 3 min per set, max 2 hours
        }
      },
      
      // After creating a form, trigger MCP processing
      afterCreate: async (form, options) => {
        // This will be handled by the route handler to avoid blocking
        console.log(`🎯 DailyWorkoutForm created: ${form.id} - ready for MCP processing`);
      }
    }
  }
);

export default DailyWorkoutForm;
