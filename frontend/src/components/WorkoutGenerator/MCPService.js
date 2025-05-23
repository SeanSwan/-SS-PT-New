/**
 * MCP Workout Generation Service
 * 
 * A service that leverages MCP (Model Context Protocol) to:
 * - Generate personalized workout plans based on client data
 * - Analyze client metrics, progress, and history
 * - Create tailored exercise recommendations
 * - Support the AI integration vision from the Master Prompt
 */

import axios from 'axios';

// Get API base URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const MCP_SERVER_URL = import.meta.env.VITE_MCP_SERVER_URL || `${API_BASE_URL}/api/mcp`;

// Create axios instance for MCP Server
const mcpApi = axios.create({
  baseURL: MCP_SERVER_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout for longer model operations
});

// Add request interceptor to include auth token
mcpApi.interceptor = mcpApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request setup error:', error);
    return Promise.reject(error);
  }
);

// Enhanced error handling for MCP API responses
mcpApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with a non-2xx status
      console.error('MCP API Error:', error.response.status, error.response.data);
      
      // Add more detailed information to the error
      error.mcpError = {
        status: error.response.status,
        message: error.response.data.message || 'Unknown error',
        details: error.response.data.details || {},
      };
    } else if (error.request) {
      // Request was made but no response received
      console.error('MCP API No Response:', error.request);
      error.mcpError = {
        status: 0,
        message: 'No response from MCP server',
        details: { timeout: error.message.includes('timeout') },
      };
    } else {
      // Error during request setup
      console.error('MCP API Setup Error:', error.message);
      error.mcpError = {
        status: 0,
        message: 'Error setting up MCP request',
        details: { message: error.message },
      };
    }
    
    return Promise.reject(error);
  }
);

/**
 * MCP Service for AI-powered workout generation
 */
const MCPService = {
  /**
   * Generate a personalized workout plan for a client
   * @param {Object} clientData - Client profile, history, and preferences
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} - Generated workout plan
   */
  generateWorkoutPlan: async (clientData, options = {}) => {
    try {
      // Default options
      const defaultOptions = {
        modelName: 'claude-3-5-sonnet',  // Default model
        temperature: 0.7,                // Moderate creativity
        maxTokens: 4000,                 // Reasonable response length
        purpose: 'client_workout_plan',  // For logging/tracking
      };
      
      // Merge with user options
      const finalOptions = { ...defaultOptions, ...options };
      
      // Construct the MCP context with client data
      const mcpContext = {
        client: clientData,
        trainerPreferences: {
          focusAreas: options.focusAreas || [],
          intensity: options.intensity || 'moderate',
          sessionDuration: options.sessionDuration || 60,
          preferredExerciseTypes: options.preferredExerciseTypes || [],
        },
        workoutType: options.workoutType || 'full_body',
        timeFrame: options.timeFrame || 'weekly',
        excludeEquipment: options.excludeEquipment || [],
        includeEquipment: options.includeEquipment || [],
      };
      
      // MCP System Prompt for workout generation
      const systemPrompt = `You are an expert personal trainer with deep knowledge in exercise physiology, nutrition, and tailored workout programming. 
Your task is to create a personalized workout plan that addresses the client's specific needs, goals, and limitations while incorporating the trainer's preferences and methodology.

IMPORTANT CONSIDERATIONS:
1. Prioritize postural assessment findings and address any imbalances or weak spots
2. Consider the client's exercise history, preferences, and any injuries
3. Focus on progressive overload and sustainable improvements
4. Include detailed instructions for each exercise
5. Structure the workout to fit within the specified session duration
6. Always include proper warm-up and cool-down protocols
7. Provide specific rep/set/weight recommendations based on the client's level
8. Include rest periods, stretching, and hydration guidance
9. Use equipment that is available to the client
10. Adapt exercises for the client's fitness level

FORMAT YOUR RESPONSE IN THE FOLLOWING STRUCTURE:
1. WORKOUT PLAN OVERVIEW: Brief summary of the plan's focus, goals, and structure
2. CLIENT ASSESSMENT SUMMARY: Key insights from their profile, postural assessment, and history
3. WEEKLY SCHEDULE: Overview of workout days with focus areas
4. DETAILED DAILY WORKOUTS: For each day, include:
   - Warm-up routine (5-10 minutes)
   - Main workout with exercises, sets, reps, weights, rest periods
   - Cool-down and stretching (5-10 minutes)
   - Total duration
5. PROGRESSION PLAN: How to advance the workout over time
6. NUTRITION RECOMMENDATIONS: General guidance aligned with their goals
7. MONITORING METRICS: What to track to measure progress

Use technical language appropriate for fitness professionals but include clear instructions that the client can understand.`;

      // Human message with specific request
      const humanMessage = `Please create a ${finalOptions.timeFrame || 'weekly'} ${finalOptions.workoutType || 'full_body'} workout plan for the client based on their data and the trainer's preferences. Focus especially on addressing their ${mcpContext.client.posturalAssessment?.weakPoints?.join(', ') || 'specific needs'}.`;
      
      // Make the API request to the MCP Server
      const response = await mcpApi.post('/generate', {
        modelName: finalOptions.modelName,
        temperature: finalOptions.temperature,
        maxTokens: finalOptions.maxTokens,
        systemPrompt: systemPrompt,
        humanMessage: humanMessage,
        mcpContext: mcpContext,
        purpose: finalOptions.purpose
      });
      
      return {
        workoutPlan: response.data.content,
        metadata: {
          generatedAt: new Date().toISOString(),
          modelUsed: finalOptions.modelName,
          clientId: clientData.id,
          options: finalOptions
        }
      };
    } catch (error) {
      console.error('Error generating workout plan:', error);
      throw error;
    }
  },
  
  /**
   * Analyze client progress and workout history to generate insights
   * @param {Object} clientData - Client profile and history
   * @returns {Promise<Object>} - Analysis results
   */
  analyzeClientProgress: async (clientData) => {
    try {
      // System prompt for analysis
      const systemPrompt = `You are an expert fitness analyst with deep knowledge in exercise science, data analysis, and athletic progression.
Your task is to analyze the client's workout history, progress data, and metrics to identify patterns, achievements, areas for improvement, and provide evidence-based recommendations.

ANALYSIS FRAMEWORK:
1. Progress Overview: Summarize key progress indicators and overall trajectory
2. Strength Analysis: Evaluate resistance training progression across major movement patterns
3. Cardiovascular Fitness: Assess endurance improvements
4. Body Composition: Analyze changes in metrics (if available)
5. Adherence & Consistency: Evaluate workout completion rates and consistency factors
6. Recovery Patterns: Identify any signs of overtraining or underrecovery
7. Movement Quality: Note any improvements or concerns in form and technique
8. Goal Alignment: Assess progress relative to stated goals
9. Limiting Factors: Identify key barriers to further progress
10. Strategic Recommendations: Data-driven suggestions for program adjustments

FORMAT YOUR RESPONSE AS A STRUCTURED ANALYSIS REPORT WITH CHARTS AND VISUALIZATIONS WHERE APPROPRIATE.`;

      // Human message with specific request
      const humanMessage = `Please analyze the workout history and progress data for ${clientData.firstName} ${clientData.lastName} to identify patterns, achievements, and areas for improvement. Provide specific, actionable recommendations based on the data.`;

      // Make the API request
      const response = await mcpApi.post('/analyze', {
        modelName: 'claude-3-5-sonnet',
        temperature: 0.3, // Lower temperature for analytical tasks
        maxTokens: 3000,
        systemPrompt: systemPrompt,
        humanMessage: humanMessage,
        mcpContext: { client: clientData },
        purpose: 'client_progress_analysis'
      });
      
      return {
        analysis: response.data.content,
        metadata: {
          generatedAt: new Date().toISOString(),
          modelUsed: 'claude-3-5-sonnet',
          clientId: clientData.id
        }
      };
    } catch (error) {
      console.error('Error analyzing client progress:', error);
      throw error;
    }
  },
  
  /**
   * Generate exercise alternatives based on equipment, limitations, or preferences
   * @param {Array} exercises - Current exercises
   * @param {Object} restrictions - Limitations, available equipment, etc.
   * @returns {Promise<Object>} - Alternative exercises
   */
  generateExerciseAlternatives: async (exercises, restrictions) => {
    try {
      // System prompt for alternatives
      const systemPrompt = `You are an expert exercise specialist who can identify optimal alternative exercises based on specific criteria.
Your task is to provide evidence-based substitutions for exercises that account for equipment availability, mobility limitations, skill level, and training environment.

FOR EACH ALTERNATIVE YOU SUGGEST:
1. Explain why it's an effective substitute (targeted muscles, movement pattern)
2. Provide detailed form instructions
3. Note any modifications needed for different fitness levels
4. Specify equipment requirements
5. Highlight advantages or disadvantages compared to the original exercise`;

      // Human message with specific request
      const humanMessage = `Please provide alternative exercises for the following ${exercises.length} exercise(s), taking into account these restrictions: ${Object.entries(restrictions).map(([key, value]) => `${key}: ${value}`).join(', ')}. For each alternative, provide a detailed explanation and instructions.`;

      // Make the API request
      const response = await mcpApi.post('/alternatives', {
        modelName: 'claude-3-5-sonnet',
        temperature: 0.5,
        maxTokens: 2000,
        systemPrompt: systemPrompt,
        humanMessage: humanMessage,
        mcpContext: { 
          exercises: exercises,
          restrictions: restrictions
        },
        purpose: 'exercise_alternatives'
      });
      
      return {
        alternatives: response.data.content,
        metadata: {
          generatedAt: new Date().toISOString(),
          modelUsed: 'claude-3-5-sonnet',
          originalExercises: exercises.map(e => e.name || e)
        }
      };
    } catch (error) {
      console.error('Error generating exercise alternatives:', error);
      throw error;
    }
  },
  
  /**
   * Generate nutrition recommendations to complement workout plan
   * @param {Object} clientData - Client profile and goals
   * @param {Object} workoutPlan - Current workout plan
   * @returns {Promise<Object>} - Nutrition recommendations
   */
  generateNutritionPlan: async (clientData, workoutPlan) => {
    try {
      // System prompt for nutrition plan
      const systemPrompt = `You are an expert nutrition consultant specializing in evidence-based nutrition strategies that support fitness goals.
Your task is to create personalized nutrition recommendations that align with a client's workout program, goals, preferences, and dietary restrictions.

YOUR NUTRITION PLAN SHOULD INCLUDE:
1. Caloric and Macronutrient Targets: Based on activity level, goals, and body composition
2. Meal Timing: Pre/post workout nutrition and general meal schedule
3. Food Quality Recommendations: Aligned with client's preferences (e.g., organic, no GMO, whole foods)
4. Hydration Strategy: Daily water targets and electrolyte considerations
5. Supplement Recommendations (if appropriate): Evidence-based options that support their goals
6. Sample Meal Plan: 1-day example that illustrates the recommendations
7. Food Preparation Tips: Practical advice for implementing the plan
8. Adaptation Strategy: How to adjust nutrition based on progress or plateaus

IMPORTANT: Focus on high-quality, whole foods aligned with the client's preferences regarding organic, non-GMO, and unprocessed options.`;

      // Human message with specific request
      const humanMessage = `Please create a nutrition plan for ${clientData.firstName} ${clientData.lastName} that complements their current workout plan and helps them achieve their fitness goals of ${clientData.goals?.join(', ') || 'overall fitness improvement'}. They have the following dietary preferences: ${clientData.dietaryPreferences?.join(', ') || 'no specific preferences noted'}.`;

      // Make the API request
      const response = await mcpApi.post('/nutrition', {
        modelName: 'claude-3-5-sonnet',
        temperature: 0.6,
        maxTokens: 3000,
        systemPrompt: systemPrompt,
        humanMessage: humanMessage,
        mcpContext: { 
          client: clientData,
          workoutPlan: workoutPlan
        },
        purpose: 'nutrition_plan'
      });
      
      return {
        nutritionPlan: response.data.content,
        metadata: {
          generatedAt: new Date().toISOString(),
          modelUsed: 'claude-3-5-sonnet',
          clientId: clientData.id
        }
      };
    } catch (error) {
      console.error('Error generating nutrition plan:', error);
      throw error;
    }
  },
  
  /**
   * Check if the MCP server is available and ready
   * @returns {Promise<boolean>} - True if server is available and ready
   */
  checkServerStatus: async () => {
    try {
      const response = await mcpApi.get('/status');
      return response.data.status === 'ready';
    } catch (error) {
      console.error('MCP server status check failed:', error);
      return false;
    }
  }
};

export default MCPService;
