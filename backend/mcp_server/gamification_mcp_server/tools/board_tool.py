"""
MCP Tools for board-related operations.
"""

import logging
from fastapi import HTTPException, status

from ..models import (
    GetBoardPositionInput,
    GetBoardPositionOutput,
    RollDiceInput,
    RollDiceOutput
)
from ..services import (
    get_or_create_gamification_profile,
    get_space_by_position,
    roll_dice,
    get_space_rewards,
    apply_rewards_to_profile,
    save_gamification_profile
)

logger = logging.getLogger("gamification_mcp_server.tools.board_tool")

async def get_board_position(input_data: GetBoardPositionInput) -> GetBoardPositionOutput:
    """
    Get a user's position on the gamification board.
    
    This tool retrieves the user's current position on the Wholesome Warrior's
    Path map and returns information about the current space they're on.
    """
    try:
        # Get profile
        profile = await get_or_create_gamification_profile(input_data.userId)
        
        # Get the current space
        current_space = get_space_by_position(profile.boardPosition)
        
        return GetBoardPositionOutput(
            position=profile.boardPosition,
            currentSpace=current_space,
            message=f"You are at {current_space.name}: {current_space.description}"
        )
        
    except Exception as e:
        logger.error(f"Error in GetBoardPosition: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get board position: {str(e)}"
        )

async def roll_dice_and_move(input_data: RollDiceInput) -> RollDiceOutput:
    """
    Roll dice to move on the gamification board.
    
    This tool allows the user to spend Energy Tokens (ET) to roll
    a dice and move on the Wholesome Warrior's Path map. It handles:
    - Deducting ET cost
    - Rolling the dice
    - Moving the player
    - Processing the space landed on (rewards, challenges, etc.)
    """
    try:
        # Get profile
        profile = await get_or_create_gamification_profile(input_data.userId)
        
        # Check if user has enough ET
        if profile.energyTokens < input_data.energyTokensToSpend:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Not enough Energy Tokens. Have {profile.energyTokens}, need {input_data.energyTokensToSpend}"
            )
        
        # Save old position
        old_position = profile.boardPosition
        
        # Roll dice and get movement
        movement, dice_value = roll_dice(input_data.energyTokensToSpend)
        
        # Deduct ET cost
        profile.energyTokens -= input_data.energyTokensToSpend
        
        # Update position
        profile.boardPosition += movement
        
        # Calculate new position (loop around if past the end)
        new_position = profile.boardPosition
        current_space = get_space_by_position(new_position)
        
        # Process space rewards
        rewards = get_space_rewards(current_space)
        
        # Apply space rewards to profile
        updated_profile = await apply_rewards_to_profile(profile, rewards)
        
        # Save updated profile
        await save_gamification_profile(updated_profile)
        
        # Build response message
        message = (
            f"Rolled a {dice_value}! Moved {movement} spaces to {current_space.name}. "
            f"Gained {rewards.energyTokens} ET and {rewards.experiencePoints} XP."
        )
        
        # Add tip if present
        if current_space.tip:
            message += f"\n\nTrainer Tip: {current_space.tip}"
        
        # Add challenge description if present
        if current_space.challengeDescription:
            message += f"\n\nChallenge: {current_space.challengeDescription}"
        
        return RollDiceOutput(
            diceValue=dice_value,
            newPosition=new_position,
            oldPosition=old_position,
            spaceVisited=current_space,
            rewards=rewards,
            profile=updated_profile,
            message=message
        )
        
    except HTTPException as e:
        # Re-raise HTTP exceptions
        raise e
    except Exception as e:
        logger.error(f"Error in RollDice: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to roll dice: {str(e)}"
        )
