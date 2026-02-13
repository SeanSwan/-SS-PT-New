"""
Service for managing kindness quests.
"""

import logging
import random
from typing import List

from ..models import KindnessQuest

logger = logging.getLogger("gamification_mcp_server.kindness_service")

def get_kindness_quests(count: int = 3) -> List[KindnessQuest]:
    """
    Get a specified number of random kindness quests.
    
    Args:
        count: Number of quests to return
        
    Returns:
        List of KindnessQuest objects
    """
    # This would normally come from a database
    # For demonstration, we're defining a sample set of quests
    all_quests = [
        KindnessQuest(
            id="check_on_neighbor",
            name="Neighborly Check-In",
            description="Take a moment to check in on a neighbor, especially an elderly one or someone who lives alone.",
            difficulty="easy",
            rewardEt=15,
            rewardXp=40,
            verifiable=False
        ),
        KindnessQuest(
            id="compliment_stranger",
            name="Stranger Compliment",
            description="Give a genuine compliment to a stranger you encounter today.",
            difficulty="easy",
            rewardEt=10,
            rewardXp=30,
            verifiable=False
        ),
        KindnessQuest(
            id="active_listening",
            name="Active Listening",
            description="Spend 10 minutes practicing active listening with someone - give them your full attention, no interruptions.",
            difficulty="medium",
            rewardEt=20,
            rewardXp=50,
            verifiable=False
        ),
        KindnessQuest(
            id="help_with_groceries",
            name="Grocery Helper",
            description="Help someone with their groceries, whether it's carrying them to their car or helping them reach something at the store.",
            difficulty="medium",
            rewardEt=25,
            rewardXp=60,
            verifiable=True,
            verificationMethod="photo"
        ),
        KindnessQuest(
            id="volunteer_hour",
            name="Volunteer Hour",
            description="Spend one hour volunteering for a local organization that helps those in need.",
            difficulty="hard",
            rewardEt=50,
            rewardXp=100,
            verifiable=True,
            verificationMethod="org_name"
        ),
        KindnessQuest(
            id="thank_you_note",
            name="Gratitude Note",
            description="Write and deliver a thank you note to someone who has positively impacted your life recently.",
            difficulty="medium",
            rewardEt=20,
            rewardXp=45,
            verifiable=False
        ),
        KindnessQuest(
            id="donate_items",
            name="Donation Drive",
            description="Donate clothing, books, or household items you no longer need to a local charity.",
            difficulty="medium",
            rewardEt=30,
            rewardXp=70,
            verifiable=True,
            verificationMethod="photo"
        ),
        KindnessQuest(
            id="pick_up_litter",
            name="Environment Cleanup",
            description="Spend 15 minutes picking up litter in your neighborhood or local park.",
            difficulty="medium",
            rewardEt=25,
            rewardXp=60,
            verifiable=True,
            verificationMethod="photo"
        ),
        KindnessQuest(
            id="share_knowledge",
            name="Knowledge Sharing",
            description="Teach someone a skill or share knowledge that could help them in their life or career.",
            difficulty="hard",
            rewardEt=35,
            rewardXp=80,
            verifiable=False
        ),
        KindnessQuest(
            id="leave_positive_review",
            name="Positive Review",
            description="Leave a positive review for a small business or service person who did a good job.",
            difficulty="easy",
            rewardEt=15,
            rewardXp=35,
            verifiable=False
        )
    ]
    
    # Randomly select the requested number of quests
    if count < len(all_quests):
        selected_quests = random.sample(all_quests, count)
    else:
        selected_quests = all_quests
    
    return selected_quests
