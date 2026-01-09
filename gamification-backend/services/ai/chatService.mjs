/**
 * AI Chat Service
 * Provides conversational AI for fitness coaching
 */

import { CircuitBreaker } from '../circuitBreaker.mjs';
import { logger } from '../../utils/logger.mjs';

const chatBreaker = new CircuitBreaker({
  name: 'ai-chat',
  failureThreshold: 5,
  recoveryTimeout: 60000,
  halfOpenMaxRequests: 3
});

/**
 * Generate AI chat response for fitness coaching
 */
export async function generateChatResponse(messages, context = {}) {
  return chatBreaker.execute(async () => {
    logger.info('Generating AI chat response', { messageCount: messages.length, context });
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const lastMessage = messages[messages.length - 1];
    const response = {
      id: `chat_${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      context: context
    };
    
    // Simple intent detection
    const message = lastMessage.content.toLowerCase();
    
    if (message.includes('workout') || message.includes('exercise')) {
      response.content = generateWorkoutAdvice(message, context);
    } else if (message.includes('nutrition') || message.includes('diet') || message.includes('eat')) {
      response.content = generateNutritionAdvice(message, context);
    } else if (message.includes('form') || message.includes('technique')) {
      response.content = generateFormAdvice(message, context);
    } else if (message.includes('goal') || message.includes('progress')) {
      response.content = generateGoalAdvice(message, context);
    } else if (message.includes('motivation') || message.includes('encourage')) {
      response.content = generateMotivation(message, context);
    } else if (message.includes('rest') || message.includes('recovery')) {
      response.content = generateRecoveryAdvice(message, context);
    } else {
      response.content = generateGeneralAdvice(message, context);
    }
    
    return response;
  });
}

/**
 * Generate workout advice
 */
function generateWorkoutAdvice(message, context) {
  const tips = [
    "Focus on compound movements like squats, deadlifts, and presses for maximum efficiency.",
    "Progressive overload is key - aim to increase weight, reps, or sets each week.",
    "Warm up with 5-10 minutes of light cardio and dynamic stretching before lifting.",
    "Rest 60-90 seconds between sets for hypertrophy, 2-3 minutes for strength.",
    "Track your workouts to monitor progress and identify patterns."
  ];
  
  const specific = [
    "For upper body days, pair push and pull movements (e.g., bench press + rows).",
    "Lower body days should include both knee-dominant and hip-dominant exercises.",
    "Consider a 3-day full body split or 4-day upper/lower split.",
    "Add 1-2 accessory exercises per muscle group for balanced development."
  ];
  
  const contextAdd = context.user ? ` Based on your profile (${context.user.fitnessLevel} level), ` : '';
  
  return `${contextAdd}${tips[Math.floor(Math.random() * tips.length)]} ${specific[Math.floor(Math.random() * specific.length)]}`;
}

/**
 * Generate nutrition advice
 */
function generateNutritionAdvice(message, context) {
  const tips = [
    "Aim for 0.8-1g of protein per pound of body weight for muscle building.",
    "Time your carbs around workouts for energy and recovery.",
    "Don't fear healthy fats - they're essential for hormone production.",
    "Stay hydrated - aim for at least 3 liters of water daily.",
    "Whole foods should make up 80% of your diet, 20% can be flexible."
  ];
  
  const specific = [
    "Post-workout: 20-40g protein + 40-80g carbs within 2 hours.",
    "Pre-workout: Light meal 1-2 hours before with protein and carbs.",
    "Track your calories for 2 weeks to establish your maintenance level.",
    "Focus on fiber intake (25-35g daily) for digestive health."
  ];
  
  const contextAdd = context.user ? ` For your ${context.user.goal} goal, ` : '';
  
  return `${contextAdd}${tips[Math.floor(Math.random() * tips.length)]} ${specific[Math.floor(Math.random() * specific.length)]}`;
}

/**
 * Generate form advice
 */
function generateFormAdvice(message, context) {
  const tips = [
    "Keep your core braced and spine neutral during all lifts.",
    "Control the eccentric (lowering) phase - 2-3 seconds is ideal.",
    "Full range of motion is generally better than partial reps.",
    "Breathe out on the concentric (lifting) phase, in on eccentric.",
    "Film yourself occasionally to check form from different angles."
  ];
  
  const specific = [
    "Squat: Keep knees tracking over toes, chest up, weight in mid-foot.",
    "Deadlift: Keep bar close to body, engage lats, drive through heels.",
    "Bench: Retract shoulder blades, keep wrists straight, touch to chest.",
    "Overhead press: Keep core tight, don't arch back, press straight up."
  ];
  
  return `${tips[Math.floor(Math.random() * tips.length)]} ${specific[Math.floor(Math.random() * specific.length)]}`;
}

/**
 * Generate goal advice
 */
function generateGoalAdvice(message, context) {
  const tips = [
    "Set SMART goals: Specific, Measurable, Achievable, Relevant, Time-bound.",
    "Track both process goals (workouts completed) and outcome goals (weight lifted).",
    "Celebrate small wins - consistency over perfection.",
    "Reassess your goals every 4-6 weeks and adjust as needed.",
    "Share your goals with others for accountability."
  ];
  
  const contextAdd = context.user ? ` Your current goal is ${context.user.goal}. ` : '';
  
  return `${contextAdd}${tips[Math.floor(Math.random() * tips.length)]}`;
}

/**
 * Generate motivation
 */
function generateMotivation(message, context) {
  const motivators = [
    "Remember why you started. Every rep is a step toward your best self.",
    "Progress isn't always linear, but consistency always pays off.",
    "You've never regretted a workout. Future you will thank present you.",
    "Small steps add up to big changes. Keep going!",
    "The only bad workout is the one that didn't happen. You've got this!"
  ];
  
  const contextAdd = context.user ? ` You're doing great with ${context.user.workoutsThisWeek} workouts this week! ` : '';
  
  return `${contextAdd}${motivators[Math.floor(Math.random() * motivators.length)]}`;
}

/**
 * Generate recovery advice
 */
function generateRecoveryAdvice(message, context) {
  const tips = [
    "Aim for 7-9 hours of quality sleep per night for optimal recovery.",
    "Active recovery (light walks, stretching) can help reduce soreness.",
    "Deload weeks every 4-8 weeks help prevent burnout and overtraining.",
    "Listen to your body - extra rest is better than pushing through injury.",
    "Foam rolling and mobility work can improve recovery and performance."
  ];
  
  const contextAdd = context.user && context.user.recoveryDays ? ` You currently take ${context.user.recoveryDays} rest days per week. ` : '';
  
  return `${contextAdd}${tips[Math.floor(Math.random() * tips.length)]}`;
}

/**
 * Generate general advice
 */
function generateGeneralAdvice(message, context) {
  const responses = [
    "That's a great question! Let me help you with that.",
    "I'm here to support your fitness journey. What specifically would you like to know?",
    "Consistency is the foundation of all progress. Keep showing up!",
    "Every expert was once a beginner. You're building great habits.",
    "The best program is the one you can stick with consistently."
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
}

/**
 * Get conversation starters for new users
 */
export async function getConversationStarters(userId) {
  return chatBreaker.execute(async () => {
    logger.info('Getting conversation starters', { userId });
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    return [
      "What's your main fitness goal right now?",
      "How are you feeling about your recent workouts?",
      "Need help with a specific exercise today?",
      "Want to discuss nutrition strategies?",
      "How can I help you stay motivated?"
    ];
  });
}

/**
 * Get AI personality traits for consistent responses
 */
export async function getAIPersonality() {
  return {
    name: "Swan Coach",
    tone: "supportive",
    style: "encouraging",
    expertise: ["strength training", "nutrition", "recovery", "motivation"],
    disclaimer: "I'm an AI assistant. For medical concerns, consult a healthcare professional."
  };
}