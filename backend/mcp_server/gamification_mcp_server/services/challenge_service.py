"""
Service for managing challenges.
"""

import logging
from datetime import datetime, timedelta
from typing import List, Optional

from ..models import Challenge, ActivityType

logger = logging.getLogger("gamification_mcp_server.challenge_service")

def get_challenges(active_only: bool = True) -> List[Challenge]:
    """
    Get all challenges, optionally filtered by active status.
    
    Args:
        active_only: Whether to return only active challenges
        
    Returns:
        List of Challenge objects
    """
    # This would normally come from a database
    # For demonstration, we're defining a sample set of challenges
    current_date = datetime.now()
    one_week_later = current_date + timedelta(days=7)
    
    all_challenges = [
        Challenge(
            id="total_wellness_week",
            name="Total Wellness Week",
            description="Complete daily targets for workouts, recovery, nutrition, and good deeds for 7 days.",
            startDate=current_date,
            endDate=one_week_later,
            targetValue=7,
            activityType=ActivityType.DAILY_LOGIN,
            rewardEt=50,
            rewardXp=200
        ),
        Challenge(
            id="protein_power_up",
            name="Protein Power-Up",
            description="Hit your daily protein goal 5 days in a row.",
            startDate=current_date,
            endDate=one_week_later,
            targetValue=5,
            activityType=ActivityType.HIT_PROTEIN_GOAL,
            rewardEt=30,
            rewardXp=150
        ),
        Challenge(
            id="mindful_movement",
            name="Mindful Movement",
            description="Accumulate 60 minutes of stretching or foam rolling.",
            startDate=current_date,
            endDate=one_week_later,
            targetValue=60,
            activityType=ActivityType.STRETCH,
            rewardEt=40,
            rewardXp=175
        ),
        Challenge(
            id="community_kindness_blitz",
            name="Community Kindness Blitz",
            description="Complete 3 Kindness Quests within the week.",
            startDate=current_date,
            endDate=one_week_later,
            targetValue=3,
            activityType=ActivityType.KINDNESS_QUEST,
            rewardEt=35,
            rewardXp=180
        )
    ]
    
    # Filter active challenges if requested
    if active_only:
        now = datetime.now()
        return [c for c in all_challenges if c.startDate <= now <= c.endDate]
    
    return all_challenges

def get_challenge_by_id(challenge_id: str) -> Optional[Challenge]:
    """
    Get a challenge by ID.
    
    Args:
        challenge_id: Challenge ID
        
    Returns:
        Challenge if found, None otherwise
    """
    challenges = get_challenges(active_only=False)
    for challenge in challenges:
        if challenge.id == challenge_id:
            return challenge
    
    return None
