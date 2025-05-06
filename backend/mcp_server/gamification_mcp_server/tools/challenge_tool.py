"""
MCP Tools for challenge-related operations.
"""

import logging
from fastapi import HTTPException, status

from ..models import (
    GetChallengesInput,
    GetChallengesOutput,
    JoinChallengeInput,
    JoinChallengeOutput
)
from ..services import (
    get_or_create_gamification_profile,
    get_challenges,
    get_challenge_by_id
)

logger = logging.getLogger("gamification_mcp_server.tools.challenge_tool")

async def get_user_challenges(input_data: GetChallengesInput) -> GetChallengesOutput:
    """
    Get available challenges.
    
    This tool retrieves all currently available challenges that the user
    can participate in. It also indicates which challenges the user
    has already joined or completed.
    """
    try:
        # Get all challenges (filtered by active status if requested)
        challenges = get_challenges(input_data.active)
        
        # Get user's participation status if userId provided
        participating_in = []
        completed_challenges = []
        
        if input_data.userId:
            # This would normally be retrieved from the database
            # For demonstration, we'll return example data for a specific user
            if input_data.userId == "example-user":
                participating_in = ["protein_power_up", "mindful_movement"]
                completed_challenges = ["community_kindness_blitz"]
            else:
                # For real implementation, query the database
                pass
            
        return GetChallengesOutput(
            challenges=challenges,
            participatingIn=participating_in,
            completedChallenges=completed_challenges,
            message=f"Found {len(challenges)} active challenges."
        )
        
    except Exception as e:
        logger.error(f"Error in GetChallenges: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get challenges: {str(e)}"
        )

async def join_challenge(input_data: JoinChallengeInput) -> JoinChallengeOutput:
    """
    Join a challenge.
    
    This tool allows a user to join a specific challenge, adding them
    to the participants list and setting up progress tracking.
    """
    try:
        # Get user profile
        profile = await get_or_create_gamification_profile(input_data.userId)
        
        # Get the challenge
        challenge = get_challenge_by_id(input_data.challengeId)
        
        if not challenge:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Challenge with ID {input_data.challengeId} not found"
            )
        
        # Add user to participants (this would normally update a database)
        if input_data.userId not in challenge.participants:
            challenge.participants.append(input_data.userId)
        
        # In a real implementation, save the updated challenge to the database
        
        return JoinChallengeOutput(
            success=True,
            challenge=challenge,
            message=f"Successfully joined the '{challenge.name}' challenge!"
        )
        
    except HTTPException as e:
        # Re-raise HTTP exceptions
        raise e
    except Exception as e:
        logger.error(f"Error in JoinChallenge: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to join challenge: {str(e)}"
        )
