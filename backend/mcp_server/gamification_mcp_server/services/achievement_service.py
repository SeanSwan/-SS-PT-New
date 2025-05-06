"""
Service for managing achievements.
"""

import logging
from typing import List, Optional

from ..models import Achievement, AchievementCategory

logger = logging.getLogger("gamification_mcp_server.achievement_service")

def get_achievements(category: Optional[AchievementCategory] = None) -> List[Achievement]:
    """
    Get all achievements, optionally filtered by category.
    
    Args:
        category: Optional category filter
        
    Returns:
        List of Achievement objects
    """
    # This would normally be retrieved from a database
    # For demonstration, we're defining a sample subset of achievements
    all_achievements = [
        Achievement(
            id="workout_warrior_bronze",
            name="Workout Warrior Bronze",
            description="Complete 10 workouts",
            category=AchievementCategory.FITNESS,
            requirement="workoutsCompleted",
            requiredValue=10,
            rewardEt=20,
            rewardXp=100
        ),
        Achievement(
            id="workout_warrior_silver",
            name="Workout Warrior Silver",
            description="Complete 50 workouts",
            category=AchievementCategory.FITNESS,
            requirement="workoutsCompleted",
            requiredValue=50,
            rewardEt=50,
            rewardXp=250
        ),
        Achievement(
            id="workout_warrior_gold",
            name="Workout Warrior Gold",
            description="Complete 100 workouts",
            category=AchievementCategory.FITNESS,
            requirement="workoutsCompleted",
            requiredValue=100,
            rewardEt=100,
            rewardXp=500
        ),
        Achievement(
            id="flexibility_fan_bronze",
            name="Flexibility Fan Bronze",
            description="Complete 10 stretching sessions",
            category=AchievementCategory.RECOVERY,
            requirement="stretchesCompleted",
            requiredValue=10,
            rewardEt=20,
            rewardXp=100
        ),
        Achievement(
            id="recovery_ritualist_bronze",
            name="Recovery Ritualist Bronze",
            description="Complete 10 foam rolling sessions",
            category=AchievementCategory.RECOVERY,
            requirement="foamRollsCompleted",
            requiredValue=10,
            rewardEt=20,
            rewardXp=100
        ),
        Achievement(
            id="vitamin_virtuoso_bronze",
            name="Vitamin Virtuoso Bronze",
            description="Log vitamins 10 times",
            category=AchievementCategory.NUTRITION,
            requirement="vitaminsLogged",
            requiredValue=10,
            rewardEt=20,
            rewardXp=100
        ),
        Achievement(
            id="greens_guru_bronze",
            name="Greens Guru Bronze",
            description="Log greens 10 times",
            category=AchievementCategory.NUTRITION,
            requirement="greensLogged",
            requiredValue=10,
            rewardEt=20,
            rewardXp=100
        ),
        Achievement(
            id="protein_pro_bronze",
            name="Protein Pro Bronze",
            description="Hit your protein goal 10 times",
            category=AchievementCategory.NUTRITION,
            requirement="proteinGoalsHit",
            requiredValue=10,
            rewardEt=20,
            rewardXp=100
        ),
        Achievement(
            id="community_champion_bronze",
            name="Community Champion Bronze",
            description="Complete 5 kindness quests",
            category=AchievementCategory.COMMUNITY,
            requirement="kindnessQuestsCompleted",
            requiredValue=5,
            rewardEt=20,
            rewardXp=100
        ),
        Achievement(
            id="streak_sensei_bronze",
            name="Streak Sensei Bronze",
            description="Maintain a 7-day activity streak",
            category=AchievementCategory.HABIT,
            requirement="streaks.activity",
            requiredValue=7,
            rewardEt=30,
            rewardXp=150
        ),
        Achievement(
            id="balanced_warrior_bronze",
            name="Balanced Warrior Bronze",
            description="Reach level 5 in three different categories",
            category=AchievementCategory.HABIT,
            requirement="balancedLevels",
            requiredValue=3,
            rewardEt=50,
            rewardXp=200
        )
    ]
    
    # Filter by category if provided
    if category:
        return [a for a in all_achievements if a.category == category]
    
    return all_achievements
