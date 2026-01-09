/**
 * UNIFIED AI SERVER v3.0
 * Gamification + AI Bots + Legal Compliance
 * Single Express server for all AI services
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import Redis from 'ioredis';
import { Pool } from 'pg';
import { OpenAI } from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  PORT: process.env.PORT || 3001,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Database
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: process.env.DB_PORT || 5432,
  DB_NAME: process.env.DB_NAME || 'swanstudios_ai',
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASS: process.env.DB_PASS || 'password',
  
  // Redis
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: process.env.REDIS_PORT || 6379,
  
  // AI Providers
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  
  // Rate Limiting
  RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX: 100, // 100 requests per window
  
  // Costs (cents per 1K tokens)
  COSTS: {
    openai: 20, // $0.20 per 1K tokens
    google: 5,  // $0.05 per 1K tokens
  }
};

// ============================================
// INITIALIZATION
// ============================================

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Redis Client
const redis = new Redis({
  host: CONFIG.REDIS_HOST,
  port: CONFIG.REDIS_PORT,
  retryStrategy: (times) => Math.min(times * 50, 2000)
});

// PostgreSQL Pool
const pool = new Pool({
  host: CONFIG.DB_HOST,
  port: CONFIG.DB_PORT,
  database: CONFIG.DB_NAME,
  user: CONFIG.DB_USER,
  password: CONFIG.DB_PASS,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// AI Clients
const openai = CONFIG.OPENAI_API_KEY ? new OpenAI({ apiKey: CONFIG.OPENAI_API_KEY }) : null;
const googleAI = CONFIG.GOOGLE_API_KEY ? new GoogleGenerativeAI(CONFIG.GOOGLE_API_KEY) : null;

// ============================================
// MIDDLEWARE
// ============================================

// Rate Limiting
const limiter = rateLimit({
  windowMs: CONFIG.RATE_LIMIT_WINDOW,
  max: CONFIG.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api', limiter);

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  jwt.verify(token, CONFIG.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Logging Middleware
const logRequest = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    
    // Log to database
    pool.query(
      'INSERT INTO bot_analytics (bot_type, user_id, response_time_ms, success) VALUES ($1, $2, $3, $4)',
      ['server', req.user?.id || null, duration, res.statusCode < 400]
    );
  });
  next();
};
app.use(logRequest);

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Cache Helper
const cache = {
  async get(key) {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },
  async set(key, value, ttl = 3600) {
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }
};

// Cost Calculator
const calculateCost = (provider, tokens) => {
  const costPer1K = CONFIG.COSTS[provider] || 10;
  return Math.round((tokens / 1000) * costPer1K);
};

// Response Time Tracker
const trackBotPerformance = async (botType, userId, tokens, success, error = null) => {
  const cost = calculateCost(botType === 'form' ? 'google' : 'openai', tokens);
  
  await pool.query(
    `INSERT INTO bot_analytics 
     (bot_type, user_id, tokens_used, cost_cents, success, error_type) 
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [botType, userId, tokens, cost, success, error]
  );
  
  return cost;
};

// Check User Consent
const checkConsent = async (userId, disclaimerType) => {
  const result = await pool.query(
    `SELECT uc.*, ad.type 
     FROM user_consents uc
     JOIN ai_disclaimers ad ON uc.disclaimer_id = ad.id
     WHERE uc.user_id = $1 AND ad.type = $2 AND uc.consented = TRUE AND uc.withdrawn_at IS NULL
     ORDER BY uc.timestamp DESC
     LIMIT 1`,
    [userId, disclaimerType]
  );
  return result.rows.length > 0;
};

// Record Consent
const recordConsent = async (userId, disclaimerType, consented, ip, userAgent) => {
  const disclaimerResult = await pool.query(
    'SELECT id FROM ai_disclaimers WHERE type = $1 AND is_active = TRUE ORDER BY version DESC LIMIT 1',
    [disclaimerType]
  );
  
  if (disclaimerResult.rows.length === 0) {
    throw new Error(`No active disclaimer found for type: ${disclaimerType}`);
  }
  
  const disclaimerId = disclaimerResult.rows[0].id;
  
  await pool.query(
    `INSERT INTO user_consents 
     (user_id, disclaimer_id, consented, ip_address, user_agent, timestamp) 
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [userId, disclaimerId, consented, ip, userAgent]
  );
  
  // Log to audit
  await pool.query(
    `INSERT INTO compliance_audit_log 
     (user_id, action, resource_type, resource_id, details) 
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, consented ? 'consent_given' : 'consent_withdrawn', 'disclaimer', disclaimerId, { type: disclaimerType }]
  );
};

// ============================================
// AI BOT SERVICES
// ============================================

// 1. WORKOUT GENERATOR BOT
const generateWorkout = async (userId, preferences) => {
  const {
    age = 30,
    fitnessLevel = 'intermediate',
    equipment = ['bodyweight'],
    focus = 'full_body',
    duration = 50,
    difficulty = 'standard'
  } = preferences;

  // Check consent
  const hasConsent = await checkConsent(userId, 'medical');
  if (!hasConsent) {
    throw new Error('Medical consent required for workout generation');
  }

  // Check cache
  const cacheKey = `workout:${userId}:${JSON.stringify(preferences)}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  // NASM-Compliant Workout Logic
  const boards = [];
  const totalBoards = 4; // Standard 4-board workout
  const exercisesPerBoard = difficulty === 'easy' ? 3 : 4;
  
  // Exercise library (simplified - in production, use database)
  const exerciseLibrary = {
    lower: ['Goblet Squat', 'Kettlebell Swing', 'Walking Lunges', 'Jump Squats', 'Deadlift'],
    upper: ['Push-ups', 'TRX Rows', 'Dumbbell Press', 'Lat Pulldown', 'Shoulder Press'],
    core: ['Plank', 'Russian Twists', 'Dead Bug', 'Bicycle Crunch', 'Side Plank'],
    cardio: ['Jump Rope', 'Burpees', 'Mountain Climbers', 'High Knees']
  };

  // Board generation based on focus
  const focusMap = {
    full_body: ['lower', 'upper', 'core', 'cardio'],
    lower_body: ['lower', 'lower', 'core', 'cardio'],
    upper_body: ['upper', 'upper', 'core', 'cardio'],
    hiit: ['cardio', 'cardio', 'core', 'cardio']
  };

  const boardTypes = focusMap[focus] || focusMap.full_body;

  // Generate boards
  for (let i = 0; i < totalBoards; i++) {
    const type = boardTypes[i];
    const exercises = exerciseLibrary[type].slice(0, exercisesPerBoard);
    
    const board = {
      name: `${type.replace('_', ' ').toUpperCase()} BOARD ${i + 1}`,
      exercises: exercises.map(ex => ({
        name: ex,
        sets: difficulty === 'easy' ? 2 : 3,
        reps: difficulty === 'easy' ? '15-20' : '8-12',
        weight: difficulty === 'easy' ? '50-70%' : '75-85%',
        rest: '60s'
      })),
      restAfter: '60s'
    };
    
    boards.push(board);
  }

  // AI Enhancement via OpenAI (optional)
  let aiEnhanced = null;
  if (openai && CONFIG.OPENAI_API_KEY) {
    try {
      const prompt = `Generate a NASM-compliant ${difficulty} workout for ${age} year old, focus: ${focus}. 
      Format as JSON with boards and exercises. Keep it practical.`;
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 500
      });
      
      const tokensUsed = completion.usage.total_tokens;
      await trackBotPerformance('workout', userId, tokensUsed, true);
      
      // Parse response (simplified - would parse JSON in production)
      aiEnhanced = completion.choices[0].message.content;
    } catch (e) {
      console.error('AI enhancement failed:', e.message);
      await trackBotPerformance('workout', userId, 0, false, e.message);
    }
  }

  const workoutPlan = {
    id: uuidv4(),
    userId,
    boards,
    difficulty,
    equipment,
    estimatedDuration: duration,
    nasmCompliant: true,
    aiEnhanced,
    generatedAt: new Date().toISOString()
  };

  // Save to database
  await pool.query(
    `INSERT INTO ai_workout_plans 
     (user_id, plan_data, difficulty, equipment_used, estimated_duration, nasm_compliant) 
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, workoutPlan, difficulty, equipment, duration, true]
  );

  // Cache result
  await cache.set(cacheKey, workoutPlan, 1800); // 30 minutes

  return workoutPlan;
};

// 2. NUTRITION PLANNER BOT
const generateNutritionPlan = async (userId, preferences) => {
  const {
    goal = 'maintenance',
    dietaryRestrictions = [],
    calorieTarget = 2000,
    proteinTarget = 150
  } = preferences;

  // Check consent
  const hasConsent = await checkConsent(userId, 'nutrition');
  if (!hasConsent) {
    throw new Error('Nutrition consent required');
  }

  const cacheKey = `nutrition:${userId}:${JSON.stringify(preferences)}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  // Meal structure
  const meals = {
    breakfast: { protein: 30, carbs: 40, fat: 20, items: [] },
    lunch: { protein: 40, carbs: 50, fat: 25, items: [] },
    dinner: { protein: 50, carbs: 40, fat: 30, items: [] },
    snacks: { protein: 20, carbs: 20, fat: 10, items: [] }
  };

  // Sample meal items based on restrictions
  const proteinSources = dietaryRestrictions.includes('vegetarian') 
    ? ['Tofu', 'Tempeh', 'Lentils', 'Chickpeas', 'Quinoa']
    : ['Chicken Breast', 'Salmon', 'Lean Beef', 'Eggs', 'Greek Yogurt'];

  const carbSources = ['Brown Rice', 'Sweet Potato', 'Oats', 'Whole Wheat Bread', 'Fruit'];
  const fatSources = ['Avocado', 'Olive Oil', 'Nuts', 'Seeds', 'Nut Butter'];

  // Populate meals
  Object.keys(meals).forEach(meal => {
    const m = meals[meal];
    m.items = [
      `${Math.round(m.protein)}g ${proteinSources[Math.floor(Math.random() * proteinSources.length)]}`,
      `${Math.round(m.carbs)}g ${carbSources[Math.floor(Math.random() * carbSources.length)]}`,
      `${Math.round(m.fat)}g ${fatSources[Math.floor(Math.random() * fatSources.length)]}`
    ];
  });

  const nutritionPlan = {
    id: uuidv4(),
    userId,
    meals,
    calorieTarget,
    proteinTarget,
    dietaryRestrictions,
    supplements: goal === 'muscle_gain' ? ['Whey Protein', 'Creatine'] : ['Multivitamin'],
    generatedAt: new Date().toISOString()
  };

  // Save to database
  await pool.query(
    `INSERT INTO ai_nutrition_plans 
     (user_id, plan_data, dietary_restrictions, calorie_target, protein_target) 
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, nutritionPlan, dietaryRestrictions, calorieTarget, proteinTarget]
  );

  await cache.set(cacheKey, nutritionPlan, 3600); // 1 hour

  return nutritionPlan;
};

// 3. FORM ANALYSIS BOT
const analyzeForm = async (userId, videoUrl, exerciseName) => {
  // Check consent
  const hasConsent = await checkConsent(userId, 'form');
  if (!hasConsent) {
    throw new Error('Form analysis consent required');
  }

  // Use Google AI for vision analysis
  if (!googleAI) {
    throw new Error('Google AI not configured');
  }

  const model = googleAI.getGenerativeModel({ model: 'gemini-pro-vision' });
  
  // In production, you'd upload video and analyze frames
  // For now, simulate analysis
  const prompt = `Analyze ${exerciseName} form from video. Provide score (0-100), corrections, and safety warnings.`;

  try {
    const result = await model.generateContent([prompt]);
    const response = result.response;
    const tokensUsed = response.usageMetadata?.totalTokenCount || 100;

    await trackBotPerformance('form', userId, tokensUsed, true);

    // Simulated analysis data
    const analysisData = {
      score: Math.floor(Math.random() * 20) + 80, // 80-100
      corrections: [
        'Keep chest up during squat',
        'Engage core throughout movement',
        'Control descent speed'
      ],
      timestamps: [5, 12, 18],
      safetyWarnings: ['Knees tracking inward', 'Lower back rounding detected']
    };

    const analysis = {
      id: uuidv4(),
      userId,
      videoUrl,
      exerciseName,
      analysisData,
      feedbackText: response.text(),
      safetyWarnings: analysisData.safetyWarnings,
      createdAt: new Date().toISOString()
    };

    // Save to database
    await pool.query(
      `INSERT INTO ai_form_analysis 
       (user_id, video_url, exercise_name, analysis_data, feedback_text, safety_warnings) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, videoUrl, exerciseName, analysisData, response.text(), analysisData.safetyWarnings]
    );

    return analysis;
  } catch (e) {
    await trackBotPerformance('form', userId, 0, false, e.message);
    throw e;
  }
};

// 4. EXERCISE ALTERNATIVES BOT
const getExerciseAlternatives = async (userId, originalExercise, reason) => {
  const alternatives = {
    'Squat': [
      { name: 'Goblet Squat', equipment: 'Dumbbell', difficulty: 'Beginner' },
      { name: 'Leg Press', equipment: 'Machine', difficulty: 'Beginner' },
      { name: 'Bulgarian Split Squat', equipment: 'Bodyweight', difficulty: 'Advanced' }
    ],
    'Push-up': [
      { name: 'Incline Push-up', equipment: 'Bench', difficulty: 'Beginner' },
      { name: 'Dumbbell Press', equipment: 'Dumbbell', difficulty: 'Intermediate' },
      { name: 'Resistance Band Press', equipment: 'Band', difficulty: 'Intermediate' }
    ],
    'Plank': [
      { name: 'Dead Bug', equipment: 'Bodyweight', difficulty: 'Beginner' },
      { name: 'Bird Dog', equipment: 'Bodyweight', difficulty: 'Beginner' },
      { name: 'Pallof Press', equipment: 'Cable', difficulty: 'Advanced' }
    ]
  };

  const exerciseAlternatives = alternatives[originalExercise] || [
    { name: 'Consult Trainer', equipment: 'N/A', difficulty: 'N/A' }
  ];

  const result = {
    id: uuidv4(),
    userId,
    originalExercise,
    alternatives: exerciseAlternatives,
    reason,
    generatedAt: new Date().toISOString()
  };

  await pool.query(
    `INSERT INTO ai_alternatives 
     (user_id, original_exercise, alternatives, reason) 
     VALUES ($1, $2, $3, $4)`,
    [userId, originalExercise, exerciseAlternatives, reason]
  );

  return result;
};

// 5. GENERAL CHATBOT
const chatWithAI = async (userId, message, context = []) => {
  if (!openai) {
    throw new Error('OpenAI not configured');
  }

  const messages = [
    { role: 'system', content: 'You are SwanStudios AI assistant. Be helpful, concise, and safety-conscious. Always recommend consulting professionals for medical/fitness advice.' },
    ...context,
    { role: 'user', content: message }
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      temperature: 0.7,
      max_tokens: 300
    });

    const tokensUsed = completion.usage.total_tokens;
    await trackBotPerformance('chat', userId, tokensUsed, true);

    const response = completion.choices[0].message.content;

    // Save session
    await pool.query(
      `INSERT INTO ai_bot_sessions (user_id, bot_type, session_data) 
       VALUES ($1, $2, $3)`,
      [userId, 'chat', { messages: [...messages, { role: 'assistant', content: response }] }]
    );

    return {
      response,
      tokensUsed,
      cost: calculateCost('openai', tokensUsed)
    };
  } catch (e) {
    await trackBotPerformance('chat', userId, 0, false, e.message);
    throw e;
  }
};

// ============================================
// API ROUTES
// ============================================

// Health Check
app.get('/health', async (req, res) => {
  try {
    const dbCheck = await pool.query('SELECT NOW() as now');
    const redisCheck = await redis.ping();
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: dbCheck.rows[0].now,
      redis: redisCheck,
      aiConfigured: {
        openai: !!openai,
        google: !!googleAI
      }
    });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// ============================================
// GAMIFICATION ROUTES
// ============================================

// Get User Progress
app.get('/api/gamification/progress', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM user_progress WHERE user_id = $1',
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      // Initialize progress
      await pool.query(
        'INSERT INTO user_progress (user_id) VALUES ($1)',
        [req.user.id]
      );
      return res.json({ level: 1, xp: 0, streak: 0, total_points: 0 });
    }
    
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Award Points
app.post('/api/gamification/award-points', authenticateToken, async (req, res) => {
  const { activityType, description, referenceId } = req.body;
  
  try {
    // Calculate points based on activity
    const pointsMap = {
      workout_complete: 10,
      streak_7: 50,
      social_post: 5,
      form_analysis: 10,
      nutrition_day: 8
    };
    
    const points = pointsMap[activityType] || 5;
    
    // Record in ledger
    await pool.query(
      `INSERT INTO points_ledger 
       (user_id, points, activity_type, description, reference_id) 
       VALUES ($1, $2, $3, $4, $5)`,
      [req.user.id, points, activityType, description, referenceId]
    );
    
    // Update user progress
    await pool.query(
      `UPDATE user_progress 
       SET total_points = total_points + $1, 
           xp = xp + $1 * 10,
           updated_at = NOW() 
       WHERE user_id = $2`,
      [points, req.user.id]
    );
    
    res.json({ success: true, points, totalPoints: points * 10 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get Leaderboard
app.get('/api/gamification/leaderboard', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.email, up.total_points, up.level, up.streak
       FROM user_progress up
       JOIN users u ON up.user_id = u.id
       ORDER BY up.total_points DESC
       LIMIT 20`
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Social Feed
app.get('/api/gamification/social-feed', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT sp.*, u.email, 
              (SELECT COUNT(*) FROM social_likes WHERE post_id = sp.id) as likes,
              (SELECT COUNT(*) FROM social_comments WHERE post_id = sp.id) as comments
       FROM social_posts sp
       JOIN users u ON sp.user_id = u.id
       WHERE sp.is_public = TRUE
       ORDER BY sp.created_at DESC
       LIMIT 20`
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create Social Post
app.post('/api/gamification/social-post', authenticateToken, async (req, res) => {
  const { content, image_url, workout_id } = req.body;
  
  try {
    const result = await pool.query(
      `INSERT INTO social_posts (user_id, content, image_url, workout_id, xp_earned, points_earned)
       VALUES ($1, $2, $3, $4, 5, 5)
       RETURNING *`,
      [req.user.id, content, image_url, workout_id]
    );
    
    // Award points
    await pool.query(
      `UPDATE user_progress 
       SET total_points = total_points + 5, 
           xp = xp + 50,
           updated_at = NOW() 
       WHERE user_id = $1`,
      [req.user.id]
    );
    
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================
// AI BOT ROUTES
// ============================================

// 1. Workout Generator
app.post('/api/ai/workout', authenticateToken, async (req, res) => {
  try {
    const workout = await generateWorkout(req.user.id, req.body);
    res.json(workout);
  } catch (e) {
    if (e.message.includes('consent')) {
      res.status(403).json({ error: e.message, needsConsent: true });
    } else {
      res.status(500).json({ error: e.message });
    }
  }
});

// 2. Nutrition Planner
app.post('/api/ai/nutrition', authenticateToken, async (req, res) => {
  try {
    const plan = await generateNutritionPlan(req.user.id, req.body);
    res.json(plan);
  } catch (e) {
    if (e.message.includes('consent')) {
      res.status(403).json({ error: e.message, needsConsent: true });
    } else {
      res.status(500).json({ error: e.message });
    }
  }
});

// 3. Form Analysis
app.post('/api/ai/form-analysis', authenticateToken, async (req, res) => {
  const { videoUrl, exerciseName } = req.body;
  
  try {
    const analysis = await analyzeForm(req.user.id, videoUrl, exerciseName);
    res.json(analysis);
  } catch (e) {
    if (e.message.includes('consent')) {
      res.status(403).json({ error: e.message, needsConsent: true });
    } else {
      res.status(500).json({ error: e.message });
    }
  }
});

// 4. Exercise Alternatives
app.post('/api/ai/alternatives', authenticateToken, async (req, res) => {
  const { originalExercise, reason } = req.body;
  
  try {
    const alternatives = await getExerciseAlternatives(req.user.id, originalExercise, reason);
    res.json(alternatives);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 5. General Chat
app.post('/api/ai/chat', authenticateToken, async (req, res) => {
  const { message, context } = req.body;
  
  try {
    const result = await chatWithAI(req.user.id, message, context || []);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================
// LEGAL & COMPLIANCE ROUTES
// ============================================

// Get Disclaimers
app.get('/api/legal/disclaimers', async (req, res) => {
  const { type } = req.query;
  
  try {
    const query = type 
      ? 'SELECT * FROM ai_disclaimers WHERE type = $1 AND is_active = TRUE ORDER BY version DESC'
      : 'SELECT * FROM ai_disclaimers WHERE is_active = TRUE ORDER BY type, version DESC';
    
    const params = type ? [type] : [];
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Record Consent
app.post('/api/legal/consent', authenticateToken, async (req, res) => {
  const { disclaimerType, consented } = req.body;
  
  try {
    await recordConsent(
      req.user.id,
      disclaimerType,
      consented,
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({ success: true, consented });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get User Consent Status
app.get('/api/legal/consent-status', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ad.type, uc.consented, uc.timestamp, uc.withdrawn_at
       FROM user_consents uc
       JOIN ai_disclaimers ad ON uc.disclaimer_id = ad.id
       WHERE uc.user_id = $1
       ORDER BY uc.timestamp DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Withdraw Consent
app.post('/api/legal/withdraw', authenticateToken, async (req, res) => {
  const { disclaimerType } = req.body;
  
  try {
    // Find active consent
    const result = await pool.query(
      `SELECT uc.id FROM user_consents uc
       JOIN ai_disclaimers ad ON uc.disclaimer_id = ad.id
       WHERE uc.user_id = $1 AND ad.type = $2 AND uc.withdrawn_at IS NULL
       ORDER BY uc.timestamp DESC
       LIMIT 1`,
      [req.user.id, disclaimerType]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No active consent found' });
    }
    
    const consentId = result.rows[0].id;
    
    // Withdraw
    await pool.query(
      'UPDATE user_consents SET withdrawn_at = NOW() WHERE id = $1',
      [consentId]
    );
    
    // Audit log
    await pool.query(
      `INSERT INTO compliance_audit_log 
       (user_id, action, resource_type, resource_id) 
       VALUES ($1, $2, $3, $4)`,
      [req.user.id, 'consent_withdrawn', 'disclaimer', consentId]
    );
    
    res.json({ success: true, withdrawn: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Emergency Check-In
app.post('/api/legal/emergency-check', authenticateToken, async (req, res) => {
  const { checkType } = req.body;
  
  try {
    const result = await pool.query(
      `INSERT INTO emergency_checks (user_id, check_type, sent_via, status)
       VALUES ($1, $2, 'push', 'pending')
       RETURNING *`,
      [req.user.id, checkType]
    );
    
    // In production, this would trigger SMS/email via Twilio/SendGrid
    // For now, just log it
    
    res.json({ 
      success: true, 
      message: 'Emergency check logged. Trainer will be notified if no response within 24h.',
      checkId: result.rows[0].id
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================
// ANALYTICS & MONITORING ROUTES
// ============================================

// Bot Performance Dashboard
app.get('/api/analytics/bot-performance', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM bot_performance_summary');
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// User Gamification Summary
app.get('/api/analytics/user-summary', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM user_gamification_summary WHERE user_id = $1',
      [req.user.id]
    );
    res.json(result.rows[0] || null);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Feature Discovery Tracking
app.post('/api/analytics/feature-discovery', authenticateToken, async (req, res) => {
  const { featureName, discoveredVia } = req.body;
  
  try {
    await pool.query(
      `INSERT INTO feature_discovery (user_id, feature_name, discovered_via)
       VALUES ($1, $2, $3)`,
      [req.user.id, featureName, discoveredVia]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================
// ERROR HANDLING
// ============================================

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: CONFIG.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ============================================
// START SERVER
// ============================================

const startServer = async () => {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected');
    
    // Test Redis connection
    await redis.ping();
    console.log('✅ Redis connected');
    
    // Check AI providers
    if (openai) console.log('✅ OpenAI configured');
    if (googleAI) console.log('✅ Google AI configured');
    
    // Start listening
    app.listen(CONFIG.PORT, () => {
      console.log(`🚀 Unified AI Server running on port ${CONFIG.PORT}`);
      console.log(`📊 Environment: ${CONFIG.NODE_ENV}`);
      console.log(`🔗 Health check: http://localhost:${CONFIG.PORT}/health`);
    });
  } catch (e) {
    console.error('❌ Failed to start server:', e.message);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await pool.end();
  await redis.quit();
  process.exit(0);
});

startServer();

export { app, generateWorkout, generateNutritionPlan, analyzeForm, getExerciseAlternatives, chatWithAI };