"""
Tools export.
"""

# Use absolute imports to avoid relative import issues
import sys
import os
from pathlib import Path

# Ensure the parent directory is in the Python path
current_dir = Path(__file__).parent.parent
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))

try:
    from tools.activity_tool import log_activity
    from tools.profile_tool import get_gamification_profile
    from tools.achievement_tool import get_user_achievements
    from tools.board_tool import get_board_position, roll_dice_and_move
    from tools.challenge_tool import get_user_challenges, join_challenge
    from tools.kindness_tool import get_available_kindness_quests
except ImportError as e:
    # If absolute imports fail, try relative imports as fallback
    try:
        from .activity_tool import log_activity
        from .profile_tool import get_gamification_profile
        from .achievement_tool import get_user_achievements
        from .board_tool import get_board_position, roll_dice_and_move
        from .challenge_tool import get_user_challenges, join_challenge
        from .kindness_tool import get_available_kindness_quests
    except ImportError as e2:
        print(f"Error importing gamification tools: {e} / {e2}")
        # Create placeholder functions if imports fail
        async def log_activity(input_data):
            return {"error": "Activity logging tool not available"}
        async def get_gamification_profile(input_data):
            return {"error": "Gamification profile tool not available"}
        async def get_user_achievements(input_data):
            return {"error": "User achievements tool not available"}
        async def get_board_position(input_data):
            return {"error": "Board position tool not available"}
        async def roll_dice_and_move(input_data):
            return {"error": "Roll dice tool not available"}
        async def get_user_challenges(input_data):
            return {"error": "User challenges tool not available"}
        async def join_challenge(input_data):
            return {"error": "Join challenge tool not available"}
        async def get_available_kindness_quests(input_data):
            return {"error": "Kindness quests tool not available"}

__all__ = [
    'log_activity',
    'get_gamification_profile',
    'get_user_achievements',
    'get_board_position',
    'roll_dice_and_move',
    'get_user_challenges',
    'join_challenge',
    'get_available_kindness_quests'
]
