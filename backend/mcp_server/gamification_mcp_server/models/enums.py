"""
Enum definitions for the gamification system.
"""

from enum import Enum, auto

class ActivityType(str, Enum):
    """Types of activities that can earn rewards."""
    WORKOUT = "workout"
    STRETCH = "stretch"
    FOAM_ROLL = "foam_roll"
    LOG_VITAMIN = "log_vitamin"
    LOG_GREENS = "log_greens"
    LOG_MEAL = "log_meal"
    HIT_PROTEIN_GOAL = "hit_protein_goal"
    POST_WORKOUT_NUTRITION = "post_workout_nutrition"
    KINDNESS_QUEST = "kindness_quest"
    DAILY_GOOD_DEED = "daily_good_deed"
    SHARE_EXPERIENCE = "share_experience"
    DAILY_LOGIN = "daily_login"
    COMPLETE_CHALLENGE = "complete_challenge"
    SET_COMPLETED = "set_completed"
    REP_COMPLETED = "rep_completed"

class RewardType(str, Enum):
    """Types of rewards that can be earned."""
    ENERGY_TOKEN = "energy_token"
    EXPERIENCE_POINT = "experience_point"
    ACHIEVEMENT = "achievement"
    STREAK_PROGRESS = "streak_progress"
    LEVEL_UP = "level_up"
    BOARD_MOVEMENT = "board_movement"

class GameboardSpaceType(str, Enum):
    """Types of spaces on the gamification board."""
    REWARD_CACHE = "reward_cache"
    CHALLENGE_OUTPOST = "challenge_outpost"
    RECOVERY_OASIS = "recovery_oasis"
    NUTRITION_NOOK = "nutrition_nook"
    SUPPLEMENT_STOP = "supplement_stop"
    COMMUNITY_CORNER = "community_corner"
    MILESTONE_MARKER = "milestone_marker"
    TRAINER_TIP = "trainer_tip" 
    LANDMARK = "landmark"

class StreakType(str, Enum):
    """Types of streaks that can be tracked."""
    ACTIVITY = "activity"  # Any workout/stretch/foam roll
    STRETCH = "stretch"
    FOAM_ROLL = "foam_roll"
    VITAMIN = "vitamin"
    GREENS = "greens"
    PROTEIN_GOAL = "protein_goal"

class AchievementCategory(str, Enum):
    """Categories for achievements."""
    FITNESS = "fitness"
    RECOVERY = "recovery"
    NUTRITION = "nutrition"
    HABIT = "habit"
    COMMUNITY = "community"
