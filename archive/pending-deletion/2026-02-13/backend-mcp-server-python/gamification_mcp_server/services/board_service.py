"""
Service for managing the gamification board.
"""

import random
import logging
from typing import List

from ..models import GameboardSpace, GameboardSpaceType, ActivityReward

logger = logging.getLogger("gamification_mcp_server.board_service")

def get_board_spaces() -> List[GameboardSpace]:
    """
    Get all board spaces.
    
    Returns:
        List of GameboardSpace objects
    """
    # This would normally come from a database
    # For demonstration, we're defining a sample board with fixed spaces
    board_spaces = [
        GameboardSpace(
            id=0,
            type=GameboardSpaceType.LANDMARK,
            name="Starting Village",
            description="Your journey begins here. The path of the Wholesome Warrior stretches before you.",
            rewardEt=5,
            rewardXp=10
        ),
        GameboardSpace(
            id=1,
            type=GameboardSpaceType.TRAINER_TIP,
            name="Training Grounds",
            description="A place to hone your skills.",
            tip="Remember to warm up before every workout session!"
        ),
        GameboardSpace(
            id=2,
            type=GameboardSpaceType.REWARD_CACHE,
            name="Energy Spring",
            description="A magical spring that rejuvenates weary travelers.",
            rewardEt=10,
            rewardXp=5
        ),
        GameboardSpace(
            id=3,
            type=GameboardSpaceType.NUTRITION_NOOK,
            name="Nutrition Garden",
            description="A garden full of nutritious foods to fuel your journey.",
            rewardEt=5,
            rewardXp=15
        ),
        GameboardSpace(
            id=4,
            type=GameboardSpaceType.CHALLENGE_OUTPOST,
            name="Strength Challenge",
            description="Test your strength against a mighty boulder.",
            challengeType="strength",
            challengeDescription="Complete 3 sets of push-ups today"
        ),
        GameboardSpace(
            id=5,
            type=GameboardSpaceType.RECOVERY_OASIS,
            name="Recovery Oasis",
            description="A peaceful place to rest and recover.",
            rewardEt=8,
            rewardXp=12
        ),
        GameboardSpace(
            id=6,
            type=GameboardSpaceType.SUPPLEMENT_STOP,
            name="Alchemist's Shop",
            description="A place to stock up on potions and elixirs.",
            rewardEt=5,
            rewardXp=5
        ),
        GameboardSpace(
            id=7,
            type=GameboardSpaceType.COMMUNITY_CORNER,
            name="Village Center",
            description="A gathering place for travelers to share stories.",
            rewardEt=8,
            rewardXp=15
        ),
        GameboardSpace(
            id=8,
            type=GameboardSpaceType.MILESTONE_MARKER,
            name="Level 5 Summit",
            description="A milestone marking your progress on the path.",
            rewardEt=20,
            rewardXp=50
        ),
        GameboardSpace(
            id=9,
            type=GameboardSpaceType.LANDMARK,
            name="Flexibility Forest",
            description="A forest where the trees bend but never break.",
            rewardEt=15,
            rewardXp=20
        )
    ]
    
    return board_spaces

def get_space_by_position(position: int) -> GameboardSpace:
    """
    Get a board space by position.
    
    Args:
        position: Board position
        
    Returns:
        GameboardSpace at the given position
    """
    board_spaces = get_board_spaces()
    position = position % len(board_spaces)  # Loop around if past the end
    return board_spaces[position]

def roll_dice(energy_tokens_spent: int = 1) -> int:
    """
    Roll a dice and calculate movement spaces.
    
    Args:
        energy_tokens_spent: Number of energy tokens spent on the roll
        
    Returns:
        Number of spaces to move
    """
    # Roll dice (1-6)
    dice_value = random.randint(1, 6)
    
    # Multiply by energy tokens spent (with a cap)
    movement = min(dice_value * energy_tokens_spent, 18)  # Cap at 18 spaces
    
    return movement, dice_value

def get_space_rewards(space: GameboardSpace) -> ActivityReward:
    """
    Get rewards for landing on a space.
    
    Args:
        space: The board space landed on
        
    Returns:
        ActivityReward for the space
    """
    return ActivityReward(
        energyTokens=space.rewardEt,
        experiencePoints=space.rewardXp,
        boardMovement=0  # Already handled by dice roll
    )
