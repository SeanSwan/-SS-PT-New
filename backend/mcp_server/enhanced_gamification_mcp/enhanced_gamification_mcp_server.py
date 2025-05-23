"""
Enhanced Gamification MCP Server
==============================

A Python-based MCP server that provides intelligent gamification functionality.
This server demonstrates proper MCP optimization techniques including:
- Continuous learning from user interactions
- Dynamic personalisation
- Statistical analysis
- Performance monitoring
"""

import os
import sys
import json
import uuid
import logging
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union, Literal
from dataclasses import dataclass
from collections import defaultdict
import sqlite3
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
import joblib

import uvicorn
from fastapi import FastAPI, HTTPException, Depends, Request, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import requests
import redis

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("enhanced_gamification_mcp")

# Configure backend API connection
BACKEND_API_URL = os.environ.get("BACKEND_API_URL", "http://localhost:5000/api")
API_TOKEN = os.environ.get("API_TOKEN", "")

# Configure Redis for caching (optional)
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")

# Create FastAPI app
app = FastAPI(title="Enhanced Gamification MCP Server")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Redis connection (with fallback)
redis_client = None
try:
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    redis_client.ping()
    logger.info("Redis connected successfully")
except Exception as redis_error:
    logger.warning(f"Redis connection failed: {redis_error}. Continuing without caching.")

# Initialize local SQLite database for machine learning features
db_path = os.environ.get("MCP_DB_PATH", "gamification_ml.db")
sqlite_conn = sqlite3.connect(db_path, check_same_thread=False)

# Create necessary tables
sqlite_conn.executescript("""
CREATE TABLE IF NOT EXISTS user_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    interaction_type TEXT NOT NULL,
    context TEXT,
    reward_given REAL,
    user_response TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS achievement_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    achievement_type TEXT NOT NULL,
    time_to_unlock REAL,
    engagement_score REAL,
    difficulty_level REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_segments (
    user_id TEXT PRIMARY KEY,
    segment_id INTEGER,
    characteristics TEXT,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS models (
    model_name TEXT PRIMARY KEY,
    model_data BLOB,
    version INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
""")
sqlite_conn.commit()

# Model classes

class UserEngagementProfile(BaseModel):
    """Detailed user engagement profile"""
    userId: str
    engagementScore: float = 0.0
    preferredChallengeTypes: List[str] = []
    optimalRewardFrequency: float = 0.5
    motivationalDrivers: Dict[str, float] = {}
    personalityType: str = "balanced"
    riskTolerance: float = 0.5
    socialEngagement: float = 0.5
    learningRate: float = 0.5

class PointTransaction(BaseModel):
    """Point transaction record"""
    userId: str
    points: int
    source: str
    category: str
    multiplier: float = 1.0
    context: Dict[str, Any] = {}
    timestamp: datetime = Field(default_factory=datetime.now)

class Achievement(BaseModel):
    """Achievement definition and status"""
    id: str
    name: str
    description: str
    points: int
    category: str
    difficulty: str = "medium"
    requirements: Dict[str, Any]
    icon: Optional[str] = None
    unlockedAt: Optional[datetime] = None
    progress: float = 0.0
    isUnlocked: bool = False

class Challenge(BaseModel):
    """Gamification challenge"""
    id: str
    name: str
    description: str
    type: str
    difficulty: str = "medium"
    duration: timedelta
    requirements: Dict[str, Any]
    rewards: Dict[str, Any]
    startDate: datetime
    endDate: datetime
    participants: List[str] = []
    isActive: bool = True

class PersonalizedRecommendation(BaseModel):
    """Personalized gamification recommendation"""
    userId: str
    type: str
    content: Dict[str, Any]
    confidence: float
    reasoning: str
    validUntil: datetime

# MCP Tool Input/Output Models

class AnalyzeUserEngagementInput(BaseModel):
    """Input for analyzing user engagement"""
    userId: str
    timeframe: str = "30d"  # 7d, 30d, 90d, all
    includeComparisons: bool = True

class AnalyzeUserEngagementOutput(BaseModel):
    """Output from user engagement analysis"""
    engagement: UserEngagementProfile
    insights: List[str]
    recommendations: List[PersonalizedRecommendation]
    comparisons: Optional[Dict[str, Any]] = None

class CreatePersonalizedChallengeInput(BaseModel):
    """Input for creating personalized challenges"""
    userId: str
    challengeType: Optional[str] = "workout"
    difficulty: Optional[str] = "auto"
    duration: Optional[str] = "week"
    socialComponent: bool = False

class CreatePersonalizedChallengeOutput(BaseModel):
    """Output from creating personalized challenges"""
    challenge: Challenge
    rationale: str
    expectedEngagement: float

class PredictUserMotivationInput(BaseModel):
    """Input for predicting user motivation"""
    userId: str
    proposedAction: str
    context: Dict[str, Any] = {}

class PredictUserMotivationOutput(BaseModel):
    """Output from motivation prediction"""
    motivationScore: float
    optimalReward: Dict[str, Any]
    recommendedApproach: str
    confidenceLevel: float

class OptimizeRewardSystemInput(BaseModel):
    """Input for optimizing reward systems"""
    userIds: List[str] = []
    systemType: str = "global"  # global, segment, individual
    objective: str = "engagement"  # engagement, retention, satisfaction

class OptimizeRewardSystemOutput(BaseModel):
    """Output from reward system optimization"""
    recommendations: Dict[str, Any]
    expectedImprovement: float
    implementationSteps: List[str]
    monitoring: Dict[str, Any]

# Achievement Learning System

class AchievementLearningSystem:
    """ML system for optimizing achievement design"""
    
    def __init__(self):
        self.model_path = "achievement_model.joblib"
        self.scaler_path = "achievement_scaler.joblib"
        self.load_or_create_model()
    
    def load_or_create_model(self):
        """Load existing model or create new one"""
        try:
            self.model = joblib.load(self.model_path)
            self.scaler = joblib.load(self.scaler_path)
            logger.info("Loaded existing achievement model")
        except:
            # Create new model
            self.model = KMeans(n_clusters=5, random_state=42)
            self.scaler = StandardScaler()
            logger.info("Created new achievement model")
    
    def extract_features(self, user_data: Dict) -> np.ndarray:
        """Extract features from user data"""
        features = []
        
        # Basic features
        features.append(user_data.get('totalWorkouts', 0))
        features.append(user_data.get('averageIntensity', 0))
        features.append(user_data.get('streakDays', 0))
        features.append(user_data.get('pointsEarned', 0))
        
        # Time-based features
        features.append(user_data.get('daysSinceJoined', 0))
        features.append(user_data.get('avgWorkoutsPerWeek', 0))
        
        # Engagement features
        features.append(user_data.get('socialInteractions', 0))
        features.append(user_data.get('challengesCompleted', 0))
        
        return np.array(features).reshape(1, -1)
    
    def predict_optimal_achievement(self, user_data: Dict) -> Dict[str, Any]:
        """Predict optimal achievement for user"""
        features = self.extract_features(user_data)
        
        # Scale features
        features_scaled = self.scaler.transform(features)
        
        # Predict cluster
        cluster = self.model.predict(features_scaled)[0]
        
        # Return achievement recommendation based on cluster
        achievement_templates = {
            0: {  # Beginners
                "type": "consistency",
                "difficulty": "easy",
                "duration": "week",
                "focus": "habit_building"
            },
            1: {  # Intermediate regular users
                "type": "progression",
                "difficulty": "medium",
                "duration": "month",
                "focus": "improvement"
            },
            2: {  # Advanced consistent users
                "type": "challenge",
                "difficulty": "hard",
                "duration": "month",
                "focus": "mastery"
            },
            3: {  # Social-oriented users
                "type": "social",
                "difficulty": "medium",
                "duration": "week",
                "focus": "community"
            },
            4: {  # Challenge seekers
                "type": "competition",
                "difficulty": "hard",
                "duration": "week",
                "focus": "performance"
            }
        }
        
        return achievement_templates.get(cluster, achievement_templates[0])
    
    def learn_from_interaction(self, user_id: str, interaction_data: Dict):
        """Learn from user interaction with achievement"""
        # Store interaction in database
        cursor = sqlite_conn.cursor()
        cursor.execute("""
            INSERT INTO user_interactions (user_id, interaction_type, context, reward_given, user_response)
            VALUES (?, ?, ?, ?, ?)
        """, (
            user_id,
            interaction_data.get('type', ''),
            json.dumps(interaction_data.get('context', {})),
            interaction_data.get('reward', 0),
            interaction_data.get('response', '')
        ))
        sqlite_conn.commit()
        
        # Trigger model retraining if enough new data
        self.check_and_retrain()
    
    def check_and_retrain(self):
        """Check if model needs retraining and do it"""
        cursor = sqlite_conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM user_interactions")
        interaction_count = cursor.fetchone()[0]
        
        # Retrain every 100 interactions
        if interaction_count % 100 == 0:
            logger.info("Triggering model retraining...")
            self.retrain_model()
    
    def retrain_model(self):
        """Retrain the model with new data"""
        # Get all interaction data
        cursor = sqlite_conn.cursor()
        cursor.execute("""
            SELECT user_id, interaction_type, context, reward_given, user_response, timestamp
            FROM user_interactions
            ORDER BY timestamp DESC
            LIMIT 1000
        """)
        
        data = cursor.fetchall()
        
        if len(data) < 10:
            logger.info("Not enough data for retraining")
            return
        
        # Process data for training
        features_list = []
        labels_list = []
        
        for row in data:
            user_id, interaction_type, context, reward, response, timestamp = row
            
            # Extract features from context
            context_data = json.loads(context) if context else {}
            features = self.extract_features(context_data).flatten()
            features_list.append(features)
            
            # Create label based on user response
            label = 1 if response in ['positive', 'completed', 'engaged'] else 0
            labels_list.append(label)
        
        if features_list:
            X = np.array(features_list)
            y = np.array(labels_list)
            
            # Fit scaler and model
            X_scaled = self.scaler.fit_transform(X)
            self.model.fit(X_scaled)
            
            # Save updated model
            joblib.dump(self.model, self.model_path)
            joblib.dump(self.scaler, self.scaler_path)
            
            logger.info("Model retrained successfully")

# Initialize learning system
achievement_learning = AchievementLearningSystem()

# Helper functions

async def get_user_data_from_backend(user_id: str) -> Dict[str, Any]:
    """Get user data from backend API"""
    try:
        # Get user basic info
        response = await make_api_request("GET", f"/users/{user_id}")
        user_data = response.get('user', {})
        
        # Get client progress
        progress_response = await make_api_request("GET", f"/client-progress/{user_id}")
        progress_data = progress_response.get('progress', {})
        
        # Get workout statistics
        workout_response = await make_api_request("POST", f"http://localhost:8000/tools/GetWorkoutStatistics", {
            "userId": user_id,
            "includeExerciseBreakdown": True,
            "includeMuscleGroupBreakdown": True
        })
        workout_stats = workout_response.get('statistics', {})
        
        # Combine all data
        combined_data = {
            **user_data,
            **progress_data,
            'workoutStats': workout_stats
        }
        
        return combined_data
    except Exception as e:
        logger.error(f"Error getting user data: {e}")
        return {}

async def make_api_request(method: str, path: str, data: Optional[Dict] = None) -> Dict:
    """Make request to backend API"""
    url = f"{BACKEND_API_URL}/{path.lstrip('/')}" if not path.startswith('http') else path
    headers = {'Content-Type': 'application/json'}
    
    if API_TOKEN:
        headers['Authorization'] = f"Bearer {API_TOKEN}"
    
    try:
        if method.upper() == "GET":
            response = requests.get(url, headers=headers, params=data or {})
        elif method.upper() == "POST":
            response = requests.post(url, headers=headers, json=data or {})
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logger.error(f"API request error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def analyze_user_patterns(user_data: Dict[str, Any]) -> Dict[str, Any]:
    """Analyze user behavior patterns"""
    patterns = {}
    
    # Workout patterns
    workout_stats = user_data.get('workoutStats', {})
    if workout_stats:
        patterns['workoutFrequency'] = workout_stats.get('averageWorkoutsPerWeek', 0)
        patterns['preferredTimeSlots'] = workout_stats.get('weekdayBreakdown', [])
        patterns['intensityTrend'] = workout_stats.get('averageIntensity', 0)
    
    # Achievement patterns
    achievements = user_data.get('achievements', [])
    if achievements:
        patterns['achievementRate'] = len(achievements) / max(user_data.get('daysSinceJoined', 1), 1)
        patterns['preferredAchievementTypes'] = analyze_achievement_preferences(achievements)
    
    # Social patterns
    patterns['socialEngagement'] = calculate_social_engagement_score(user_data)
    
    return patterns

def analyze_achievement_preferences(achievements: List[Dict]) -> List[str]:
    """Analyze what types of achievements user prefers"""
    categories = defaultdict(int)
    for achievement in achievements:
        categories[achievement.get('category', 'other')] += 1
    
    # Return top 3 categories
    return sorted(categories.items(), key=lambda x: x[1], reverse=True)[:3]

def calculate_social_engagement_score(user_data: Dict[str, Any]) -> float:
    """Calculate user's social engagement score"""
    score = 0.0
    
    # Check various social metrics
    social_metrics = {
        'friendCount': 0.2,
        'challengesWithFriends': 0.3,
        'socialWorkouts': 0.3,
        'groupChallenges': 0.2
    }
    
    for metric, weight in social_metrics.items():
        value = user_data.get(metric, 0)
        normalized_value = min(value / 10, 1.0)  # Normalize to 0-1
        score += normalized_value * weight
    
    return score

# MCP Routes

@app.post("/tools/AnalyzeUserEngagement", response_model=AnalyzeUserEngagementOutput)
async def analyze_user_engagement(input_data: AnalyzeUserEngagementInput):
    """
    Analyze user engagement patterns and provide insights.
    
    This tool uses machine learning to analyze user behavior,
    identify engagement patterns, and provide personalized recommendations.
    """
    try:
        # Get user data
        user_data = await get_user_data_from_backend(input_data.userId)
        
        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Analyze patterns
        patterns = analyze_user_patterns(user_data)
        
        # Calculate engagement score
        engagement_factors = {
            'workoutFrequency': patterns.get('workoutFrequency', 0) * 0.3,
            'achievementRate': patterns.get('achievementRate', 0) * 0.25,
            'socialEngagement': patterns.get('socialEngagement', 0) * 0.2,
            'streakConsistency': min(user_data.get('streakDays', 0) / 7, 1.0) * 0.25
        }
        
        overall_engagement = sum(engagement_factors.values())
        
        # Determine personality type and preferences
        personality_type = "balanced"
        if patterns.get('socialEngagement', 0) > 0.7:
            personality_type = "social"
        elif patterns.get('achievementRate', 0) > 0.5:
            personality_type = "achiever"
        elif patterns.get('workoutFrequency', 0) > 5:
            personality_type = "dedicated"
        
        # Create engagement profile
        engagement_profile = UserEngagementProfile(
            userId=input_data.userId,
            engagementScore=overall_engagement,
            preferredChallengeTypes=[cat[0] for cat in patterns.get('preferredAchievementTypes', [])],
            optimalRewardFrequency=calculate_optimal_reward_frequency(patterns),
            motivationalDrivers=extract_motivational_drivers(user_data),
            personalityType=personality_type,
            riskTolerance=calculate_risk_tolerance(user_data),
            socialEngagement=patterns.get('socialEngagement', 0),
            learningRate=calculate_learning_rate(user_data)
        )
        
        # Generate insights
        insights = generate_engagement_insights(engagement_profile, patterns)
        
        # Generate recommendations
        recommendations = await generate_recommendations(engagement_profile, user_data)
        
        # Get comparisons if requested
        comparisons = None
        if input_data.includeComparisons:
            comparisons = await get_peer_comparisons(input_data.userId, engagement_profile)
        
        return AnalyzeUserEngagementOutput(
            engagement=engagement_profile,
            insights=insights,
            recommendations=recommendations,
            comparisons=comparisons
        )
        
    except Exception as e:
        logger.error(f"Error in AnalyzeUserEngagement: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/tools/CreatePersonalizedChallenge", response_model=CreatePersonalizedChallengeOutput)
async def create_personalized_challenge(input_data: CreatePersonalizedChallengeInput):
    """
    Create a personalized challenge for a user.
    
    Uses machine learning to create challenges that match user preferences,
    skill level, and engagement patterns.
    """
    try:
        # Get user data and engagement profile
        user_data = await get_user_data_from_backend(input_data.userId)
        
        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get optimal achievement type from ML model
        achievement_template = achievement_learning.predict_optimal_achievement(user_data)
        
        # Override with user preferences if provided
        challenge_type = input_data.challengeType or achievement_template['type']
        difficulty = input_data.difficulty if input_data.difficulty != "auto" else achievement_template['difficulty']
        
        # Calculate duration
        duration_map = {
            "day": timedelta(days=1),
            "week": timedelta(weeks=1),
            "month": timedelta(days=30)
        }
        duration = duration_map.get(input_data.duration, timedelta(weeks=1))
        
        # Generate challenge based on type
        challenge = await generate_specific_challenge(
            challenge_type=challenge_type,
            difficulty=difficulty,
            duration=duration,
            user_data=user_data,
            social_component=input_data.socialComponent
        )
        
        # Calculate expected engagement
        expected_engagement = calculate_expected_engagement(challenge, user_data)
        
        # Generate rationale
        rationale = f"This {challenge_type} challenge was selected based on your {achievement_template['focus']} profile. " \
                   f"The {difficulty} difficulty level matches your current progress, and the {input_data.duration} duration " \
                   f"aligns with your typical engagement patterns."
        
        return CreatePersonalizedChallengeOutput(
            challenge=challenge,
            rationale=rationale,
            expectedEngagement=expected_engagement
        )
        
    except Exception as e:
        logger.error(f"Error in CreatePersonalizedChallenge: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/tools/PredictUserMotivation", response_model=PredictUserMotivationOutput)
async def predict_user_motivation(input_data: PredictUserMotivationInput):
    """
    Predict user motivation for a specific action.
    
    Uses behavioral patterns and preferences to predict how motivated
    a user will be by a proposed action or reward.
    """
    try:
        # Get user data
        user_data = await get_user_data_from_backend(input_data.userId)
        
        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Analyze the proposed action
        action_features = extract_action_features(input_data.proposedAction, input_data.context)
        
        # Get user preferences
        user_patterns = analyze_user_patterns(user_data)
        
        # Calculate motivation score based on multiple factors
        motivation_factors = {
            'actionAlignment': calculate_action_alignment(action_features, user_patterns),
            'timingFactor': calculate_timing_factor(input_data.context),
            'rewardFit': calculate_reward_fitness(action_features, user_data),
            'socialFactor': calculate_social_motivation_factor(action_features, user_data),
            'noveltySurprise': calculate_novelty_factor(action_features, user_data)
        }
        
        # Weighted motivation score
        weights = {
            'actionAlignment': 0.3,
            'timingFactor': 0.2,
            'rewardFit': 0.25,
            'socialFactor': 0.15,
            'noveltySurprise': 0.1
        }
        
        motivation_score = sum(factor * weights[name] for name, factor in motivation_factors.items())
        
        # Generate optimal reward
        optimal_reward = generate_optimal_reward(user_data, action_features, motivation_score)
        
        # Determine recommended approach
        approaches = {
            motivation_score >= 0.8: "Direct encouragement - user is highly motivated",
            motivation_score >= 0.6: "Gentle nudging with rewards",
            motivation_score >= 0.4: "Social proof and community involvement",
            motivation_score >= 0.2: "Break down into smaller steps",
            True: "Defer or redesign - low motivation predicted"
        }
        
        recommended_approach = next(approach for condition, approach in approaches.items() if condition)
        
        # Calculate confidence based on data quality and patterns
        confidence_level = calculate_prediction_confidence(user_data, motivation_factors)
        
        return PredictUserMotivationOutput(
            motivationScore=motivation_score,
            optimalReward=optimal_reward,
            recommendedApproach=recommended_approach,
            confidenceLevel=confidence_level
        )
        
    except Exception as e:
        logger.error(f"Error in PredictUserMotivation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/tools/OptimizeRewardSystem", response_model=OptimizeRewardSystemOutput)
async def optimize_reward_system(input_data: OptimizeRewardSystemInput):
    """
    Optimize the reward system based on user data and objectives.
    
    Analyzes patterns across multiple users to recommend improvements
    to the gamification and reward systems.
    """
    try:
        # Get user data for analysis
        users_data = []
        if input_data.userIds:
            for user_id in input_data.userIds:
                user_data = await get_user_data_from_backend(user_id)
                if user_data:
                    users_data.append(user_data)
        else:
            # Get sample of active users
            # This would normally be a proper query to your database
            pass
        
        if not users_data:
            raise HTTPException(status_code=400, detail="No user data available for optimization")
        
        # Analyze current reward system performance
        current_performance = analyze_current_rewards(users_data, input_data.objective)
        
        # Generate optimization recommendations
        recommendations = generate_reward_optimizations(
            users_data=users_data,
            system_type=input_data.systemType,
            objective=input_data.objective,
            current_performance=current_performance
        )
        
        # Calculate expected improvement
        expected_improvement = estimate_improvement(recommendations, current_performance)
        
        # Generate implementation steps
        implementation_steps = generate_implementation_plan(recommendations)
        
        # Create monitoring strategy
        monitoring = create_monitoring_strategy(recommendations, input_data.objective)
        
        return OptimizeRewardSystemOutput(
            recommendations=recommendations,
            expectedImprovement=expected_improvement,
            implementationSteps=implementation_steps,
            monitoring=monitoring
        )
        
    except Exception as e:
        logger.error(f"Error in OptimizeRewardSystem: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Background Tasks

@app.post("/internal/learn-from-interaction")
async def learn_from_interaction(background_tasks: BackgroundTasks, request: Request):
    """
    Internal endpoint for learning from user interactions.
    
    Should be called whenever a user interacts with gamification features.
    """
    try:
        data = await request.json()
        user_id = data.get('userId')
        interaction_data = data.get('interactionData', {})
        
        if not user_id:
            raise HTTPException(status_code=400, detail="userId is required")
        
        # Add learning task to background
        background_tasks.add_task(
            achievement_learning.learn_from_interaction,
            user_id,
            interaction_data
        )
        
        return {"status": "Learning task queued successfully"}
        
    except Exception as e:
        logger.error(f"Error in learn_from_interaction: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Utility functions (simplified implementations)

def calculate_optimal_reward_frequency(patterns: Dict) -> float:
    """Calculate optimal reward frequency for user"""
    base_frequency = 0.5
    
    # Adjust based on engagement patterns
    if patterns.get('workoutFrequency', 0) > 5:
        base_frequency *= 1.2  # More frequent for highly active users
    elif patterns.get('workoutFrequency', 0) < 2:
        base_frequency *= 0.8  # Less frequent for less active users
    
    return min(max(base_frequency, 0.1), 1.0)

def extract_motivational_drivers(user_data: Dict) -> Dict[str, float]:
    """Extract user's primary motivational drivers"""
    drivers = {
        'achievement': 0.0,
        'social': 0.0,
        'progress': 0.0,
        'competition': 0.0,
        'mastery': 0.0
    }
    
    # Calculate based on user behavior
    if user_data.get('achievements', []):
        drivers['achievement'] = len(user_data['achievements']) / 10
    
    if user_data.get('friendCount', 0) > 5:
        drivers['social'] = min(user_data['friendCount'] / 20, 1.0)
    
    # Add more sophisticated calculations here
    
    return drivers

def calculate_risk_tolerance(user_data: Dict) -> float:
    """Calculate user's risk tolerance"""
    # Simple implementation - would be more sophisticated in practice
    challenge_participation = user_data.get('challengesCompleted', 0)
    difficult_achievements = sum(1 for a in user_data.get('achievements', []) if a.get('difficulty') == 'hard')
    
    risk_tolerance = (challenge_participation + difficult_achievements * 2) / 20
    return min(max(risk_tolerance, 0.0), 1.0)

def calculate_learning_rate(user_data: Dict) -> float:
    """Calculate how quickly user learns/adapts"""
    # Simple implementation
    days_since_joined = user_data.get('daysSinceJoined', 1)
    improvements = user_data.get('skillImprovements', 0)
    
    learning_rate = improvements / max(days_since_joined / 30, 1)
    return min(max(learning_rate, 0.1), 1.0)

def generate_engagement_insights(profile: UserEngagementProfile, patterns: Dict) -> List[str]:
    """Generate actionable insights about user engagement"""
    insights = []
    
    if profile.engagementScore < 0.5:
        insights.append("User shows low engagement - consider simplifying challenges and increasing immediate rewards")
    
    if profile.personalityType == "social" and patterns.get('socialEngagement', 0) < 0.5:
        insights.append("User has social personality but low social engagement - recommend group challenges")
    
    if profile.riskTolerance > 0.7:
        insights.append("User has high risk tolerance - can handle challenging, competitive features")
    
    # Add more insights based on patterns
    
    return insights

async def generate_recommendations(profile: UserEngagementProfile, user_data: Dict) -> List[PersonalizedRecommendation]:
    """Generate personalized recommendations"""
    recommendations = []
    current_time = datetime.now()
    
    # Challenge recommendation
    if profile.engagementScore > 0.6:
        recommendations.append(PersonalizedRecommendation(
            userId=profile.userId,
            type="challenge",
            content={
                "challengeType": "progressive",
                "difficulty": "medium",
                "reward": "badge+points"
            },
            confidence=0.85,
            reasoning="High engagement score indicates readiness for new challenges",
            validUntil=current_time + timedelta(days=7)
        ))
    
    # Social recommendation
    if profile.personalityType == "social":
        recommendations.append(PersonalizedRecommendation(
            userId=profile.userId,
            type="social",
            content={
                "feature": "buddy_challenge",
                "invite_friends": True,
                "group_size": 3
            },
            confidence=0.9,
            reasoning="Social personality type indicates preference for group activities",
            validUntil=current_time + timedelta(days=3)
        ))
    
    return recommendations

async def get_peer_comparisons(user_id: str, profile: UserEngagementProfile) -> Dict[str, Any]:
    """Get peer comparison data"""
    # This would normally query similar users
    return {
        "percentile": 65,
        "similarUsers": 5,
        "comparison": {
            "workoutFrequency": "above_average",
            "socialEngagement": "average",
            "achievementRate": "below_average"
        }
    }

async def generate_specific_challenge(challenge_type: str, difficulty: str, duration: timedelta, 
                                    user_data: Dict, social_component: bool) -> Challenge:
    """Generate a specific challenge based on parameters"""
    challenge_id = str(uuid.uuid4())
    
    # Define base challenges by type
    challenge_templates = {
        "consistency": {
            "name": f"{difficulty.title()} Consistency Challenge",
            "description": "Maintain a regular workout schedule",
            "requirements": {
                "workoutsPerWeek": {"easy": 2, "medium": 3, "hard": 4}[difficulty],
                "consecutiveDays": {"easy": 3, "medium": 5, "hard": 7}[difficulty]
            },
            "rewards": {
                "points": {"easy": 100, "medium": 200, "hard": 300}[difficulty],
                "badge": f"consistency_{difficulty}"
            }
        },
        "progression": {
            "name": f"{difficulty.title()} Progress Challenge",
            "description": "Improve your performance metrics",
            "requirements": {
                "strengthIncrease": {"easy": 5, "medium": 10, "hard": 15}[difficulty],
                "durationImprovement": {"easy": 10, "medium": 20, "hard": 30}[difficulty]
            },
            "rewards": {
                "points": {"easy": 150, "medium": 250, "hard": 400}[difficulty],
                "badge": f"progress_{difficulty}"
            }
        },
        "social": {
            "name": f"{difficulty.title()} Team Challenge",
            "description": "Work together with others",
            "requirements": {
                "teamSize": {"easy": 2, "medium": 3, "hard": 5}[difficulty],
                "combinedWorkouts": {"easy": 10, "medium": 20, "hard": 30}[difficulty]
            },
            "rewards": {
                "points": {"easy": 200, "medium": 350, "hard": 500}[difficulty],
                "badge": f"team_{difficulty}",
                "team_bonus": True
            }
        }
    }
    
    template = challenge_templates.get(challenge_type, challenge_templates["consistency"])
    
    current_time = datetime.now()
    
    return Challenge(
        id=challenge_id,
        name=template["name"],
        description=template["description"],
        type=challenge_type,
        difficulty=difficulty,
        duration=duration,
        requirements=template["requirements"],
        rewards=template["rewards"],
        startDate=current_time,
        endDate=current_time + duration,
        participants=[user_data.get('id')] if not social_component else [],
        isActive=True
    )

def calculate_expected_engagement(challenge: Challenge, user_data: Dict) -> float:
    """Calculate expected engagement for a challenge"""
    base_engagement = 0.5
    
    # Adjust based on challenge type preference
    preferred_types = user_data.get('preferredChallengeTypes', [])
    if challenge.type in preferred_types:
        base_engagement += 0.2
    
    # Adjust based on difficulty vs user level
    user_level = user_data.get('level', 1)
    difficulty_match = calculate_difficulty_match(challenge.difficulty, user_level)
    base_engagement += difficulty_match * 0.3
    
    # Adjust based on social component
    if challenge.type == "social" and user_data.get('socialEngagement', 0) > 0.6:
        base_engagement += 0.15
    
    return min(max(base_engagement, 0.0), 1.0)

def calculate_difficulty_match(difficulty: str, user_level: int) -> float:
    """Calculate how well difficulty matches user level"""
    difficulty_map = {"easy": 1, "medium": 5, "hard": 10}
    challenge_level = difficulty_map[difficulty]
    
    # Perfect match is when challenge level is slightly above user level
    optimal_ratio = challenge_level / (user_level + 1)
    
    if 0.8 <= optimal_ratio <= 1.5:
        return 1.0
    elif 0.5 <= optimal_ratio <= 2.0:
        return 0.7
    else:
        return 0.3

def extract_action_features(action: str, context: Dict) -> Dict:
    """Extract features from a proposed action"""
    features = {
        "type": context.get('actionType', 'unknown'),
        "complexity": context.get('complexity', 0.5),
        "time_required": context.get('timeRequired', 30),
        "social_component": context.get('socialComponent', False),
        "reward_magnitude": context.get('rewardMagnitude', 0.5)
    }
    
    # Analyze action text for keywords
    action_lower = action.lower()
    if any(word in action_lower for word in ['workout', 'exercise', 'train']):
        features['category'] = 'fitness'
    elif any(word in action_lower for word in ['challenge', 'compete', 'beat']):
        features['category'] = 'competition'
    elif any(word in action_lower for word in ['share', 'friend', 'group']):
        features['category'] = 'social'
    else:
        features['category'] = 'general'
    
    return features

def calculate_action_alignment(action_features: Dict, user_patterns: Dict) -> float:
    """Calculate how well action aligns with user patterns"""
    alignment_score = 0.5
    
    # Check category alignment
    preferred_categories = user_patterns.get('preferredAchievementTypes', [])
    if action_features.get('category') in [cat[0] for cat in preferred_categories]:
        alignment_score += 0.3
    
    # Check social alignment
    if action_features.get('social_component') and user_patterns.get('socialEngagement', 0) > 0.6:
        alignment_score += 0.2
    
    return min(max(alignment_score, 0.0), 1.0)

def calculate_timing_factor(context: Dict) -> float:
    """Calculate timing factor for motivation"""
    # Simple implementation - consider time of day, day of week, etc.
    current_hour = datetime.now().hour
    optimal_hours = context.get('userOptimalHours', [9, 10, 11, 17, 18, 19])
    
    if current_hour in optimal_hours:
        return 1.0
    else:
        return 0.6

def calculate_reward_fitness(action_features: Dict, user_data: Dict) -> float:
    """Calculate how well rewards fit user preferences"""
    # This would analyze user's reward history and preferences
    return 0.75  # Simplified

def calculate_social_motivation_factor(action_features: Dict, user_data: Dict) -> float:
    """Calculate social motivation factor"""
    if not action_features.get('social_component'):
        return 0.5
    
    social_engagement = user_data.get('socialEngagement', 0)
    return social_engagement

def calculate_novelty_factor(action_features: Dict, user_data: Dict) -> float:
    """Calculate novelty/surprise factor"""
    # This would check if action is new or different from usual
    return 0.7  # Simplified

def generate_optimal_reward(user_data: Dict, action_features: Dict, motivation_score: float) -> Dict[str, Any]:
    """Generate optimal reward for the action"""
    base_points = 100
    
    # Adjust based on motivation score
    points = int(base_points * (1 + motivation_score))
    
    # Determine additional rewards
    rewards = {"points": points}
    
    if motivation_score > 0.7:
        rewards["badge"] = f"motivated_achiever_{action_features.get('category', 'general')}"
    
    if action_features.get('social_component'):
        rewards["social_points"] = points // 2
    
    return rewards

def calculate_prediction_confidence(user_data: Dict, motivation_factors: Dict) -> float:
    """Calculate confidence in prediction"""
    # Base confidence
    confidence = 0.5
    
    # Increase confidence based on data availability
    data_points = len(user_data.get('workoutHistory', []))
    confidence += min(data_points / 100, 0.3)
    
    # Increase confidence based on pattern consistency
    pattern_variance = calculate_pattern_variance(motivation_factors)
    confidence += (1 - pattern_variance) * 0.2
    
    return min(max(confidence, 0.1), 0.95)

def calculate_pattern_variance(factors: Dict) -> float:
    """Calculate variance in motivation factors"""
    values = list(factors.values())
    if not values:
        return 1.0
    
    mean_value = sum(values) / len(values)
    variance = sum((v - mean_value) ** 2 for v in values) / len(values)
    return min(variance, 1.0)

def analyze_current_rewards(users_data: List[Dict], objective: str) -> Dict:
    """Analyze current reward system performance"""
    performance = {
        "averageEngagement": 0.0,
        "retentionRate": 0.0,
        "satisfactionScore": 0.0,
        "usagePatterns": {},
        "inefficiencies": []
    }
    
    if not users_data:
        return performance
    
    # Calculate average engagement
    engagement_scores = [u.get('engagementScore', 0) for u in users_data]
    performance["averageEngagement"] = sum(engagement_scores) / len(engagement_scores)
    
    # Calculate retention (simplified)
    active_users = sum(1 for u in users_data if u.get('lastActivityDate'))
    performance["retentionRate"] = active_users / len(users_data)
    
    # Identify inefficiencies
    if performance["averageEngagement"] < 0.6:
        performance["inefficiencies"].append("Low overall engagement")
    
    if performance["retentionRate"] < 0.7:
        performance["inefficiencies"].append("Poor retention rate")
    
    return performance

def generate_reward_optimizations(users_data: List[Dict], system_type: str, 
                                objective: str, current_performance: Dict) -> Dict[str, Any]:
    """Generate optimization recommendations"""
    optimizations = {
        "pointAdjustments": {},
        "newRewardTypes": [],
        "frequencyChanges": {},
        "personalizationRules": [],
        "socialFeatures": []
    }
    
    # Analyze based on objective
    if objective == "engagement":
        if current_performance["averageEngagement"] < 0.6:
            optimizations["frequencyChanges"]["increase_immediate_rewards"] = 1.5
            optimizations["newRewardTypes"].append("micro_achievements")
    
    elif objective == "retention":
        if current_performance["retentionRate"] < 0.7:
            optimizations["socialFeatures"].append("buddy_system")
            optimizations["pointAdjustments"]["login_bonus"] = 50
    
    # Add system-specific optimizations
    if system_type == "individual":
        optimizations["personalizationRules"].append("difficulty_adaptation")
    elif system_type == "segment":
        optimizations["personalizationRules"].append("segment_based_rewards")
    
    return optimizations

def estimate_improvement(recommendations: Dict, current_performance: Dict) -> float:
    """Estimate expected improvement from recommendations"""
    # Simplified calculation
    base_improvement = 0.1
    
    # Add improvements based on recommendations
    if recommendations.get("frequencyChanges"):
        base_improvement += 0.15
    
    if recommendations.get("socialFeatures"):
        base_improvement += 0.1
    
    if recommendations.get("personalizationRules"):
        base_improvement += 0.2
    
    return min(base_improvement, 0.5)  # Cap at 50% improvement

def generate_implementation_plan(recommendations: Dict) -> List[str]:
    """Generate implementation steps"""
    steps = []
    
    if recommendations.get("pointAdjustments"):
        steps.append("Update point values in the database")
        steps.append("Deploy point adjustment changes")
    
    if recommendations.get("newRewardTypes"):
        steps.append("Design new reward types UI/UX")
        steps.append("Implement backend logic for new rewards")
        steps.append("Test new reward mechanics")
    
    if recommendations.get("socialFeatures"):
        steps.append("Plan social feature architecture")
        steps.append("Implement social feature backend")
        steps.append("Add social features to frontend")
    
    steps.append("Monitor metrics for 2 weeks")
    steps.append("Analyze results and adjust as needed")
    
    return steps

def create_monitoring_strategy(recommendations: Dict, objective: str) -> Dict[str, Any]:
    """Create monitoring strategy for optimization"""
    monitoring = {
        "metrics_to_track": [],
        "measurement_frequency": "daily",
        "success_criteria": {},
        "alerts": []
    }
    
    # Add metrics based on objective
    if objective == "engagement":
        monitoring["metrics_to_track"].extend([
            "daily_active_users",
            "average_session_duration",
            "feature_usage_rates"
        ])
        monitoring["success_criteria"]["engagement_increase"] = 0.15
    
    elif objective == "retention":
        monitoring["metrics_to_track"].extend([
            "weekly_retention_rate",
            "monthly_retention_rate",
            "churn_rate"
        ])
        monitoring["success_criteria"]["retention_increase"] = 0.1
    
    # Add alerts
    monitoring["alerts"] = [
        {
            "metric": "engagement_score",
            "condition": "< 0.5",
            "action": "trigger_intervention"
        },
        {
            "metric": "retention_rate",
            "condition": "< 0.7",
            "action": "adjust_rewards"
        }
    ]
    
    return monitoring

# Health check and server info

@app.get("/")
async def root():
    """MCP Server root endpoint."""
    return {
        "name": "Enhanced Gamification MCP Server",
        "version": "1.0.0",
        "description": "MCP server with machine learning capabilities for gamification optimization",
        "tools_endpoint": "/tools",
        "features": [
            "Machine Learning-based personalization",
            "Continuous learning from user interactions",
            "Advanced analytics and insights",
            "Dynamic challenge generation",
            "Reward system optimization"
        ]
    }

@app.get("/tools")
async def list_tools():
    """List all available MCP tools."""
    return {
        "tools": [
            {
                "name": "AnalyzeUserEngagement",
                "description": "Analyze user engagement patterns using ML.",
                "input_schema": AnalyzeUserEngagementInput.schema(),
                "output_schema": AnalyzeUserEngagementOutput.schema()
            },
            {
                "name": "CreatePersonalizedChallenge",
                "description": "Create challenges personalized to user preferences.",
                "input_schema": CreatePersonalizedChallengeInput.schema(),
                "output_schema": CreatePersonalizedChallengeOutput.schema()
            },
            {
                "name": "PredictUserMotivation",
                "description": "Predict user motivation for specific actions.",
                "input_schema": PredictUserMotivationInput.schema(),
                "output_schema": PredictUserMotivationOutput.schema()
            },
            {
                "name": "OptimizeRewardSystem",
                "description": "Optimize reward systems based on user data.",
                "input_schema": OptimizeRewardSystemInput.schema(),
                "output_schema": OptimizeRewardSystemOutput.schema()
            }
        ]
    }

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    # Check database connection
    try:
        cursor = sqlite_conn.cursor()
        cursor.execute("SELECT 1")
        db_status = "healthy"
    except:
        db_status = "unhealthy"
    
    # Check redis connection
    redis_status = "healthy" if redis_client else "not_connected"
    if redis_client:
        try:
            redis_client.ping()
        except:
            redis_status = "unhealthy"
    
    return {
        "status": "healthy",
        "database": db_status,
        "redis": redis_status,
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8002))  # Changed from 8001 to 8002
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
