"""
MCP tool for workout plan generation.
"""

import logging
from datetime import datetime, timedelta
from fastapi import HTTPException, status

from ..models import (
    GenerateWorkoutPlanInput,
    GenerateWorkoutPlanOutput
)
from ..utils import make_api_request

logger = logging.getLogger("workout_mcp_server.tools.plan_tool")

async def generate_workout_plan(input_data: GenerateWorkoutPlanInput) -> GenerateWorkoutPlanOutput:
    """
    Generate a personalized workout plan for a client.
    
    This tool creates a comprehensive workout plan based on the client's goals,
    preferences, and available equipment. It generates multiple workout days
    with appropriate exercises, set/rep schemes, and instructions.
    
    The generated plan can be used as a starting point for trainers or can be
    directly assigned to clients.
    """
    try:
        # Convert input to API format
        current_date = datetime.now().strftime("%Y-%m-%d")
        
        # Set default dates if not provided
        start_date = input_data.startDate or current_date
        end_date = input_data.endDate
        if not end_date:
            # Default to 8 weeks if not specified
            end_date_obj = datetime.strptime(start_date, "%Y-%m-%d") + timedelta(weeks=8)
            end_date = end_date_obj.strftime("%Y-%m-%d")
        
        # Prepare the plan structure
        plan_data = {
            "name": input_data.name,
            "description": input_data.description,
            "trainerId": input_data.trainerId,
            "clientId": input_data.clientId,
            "goal": input_data.goal,
            "startDate": start_date,
            "endDate": end_date,
            "status": "active",
            "days": []
        }
        
        # First, get client progress data to customize the plan
        progress_response = await make_api_request(
            "GET", 
            f"/client-progress/{input_data.clientId}"
        )
        client_progress = progress_response.get("progress", {})
        
        # Then, get exercise recommendations based on goals and equipment
        exercise_params = {
            "goal": input_data.goal,
            "difficulty": input_data.difficulty,
            "equipment": input_data.equipment,
            "muscleGroups": input_data.focusAreas,
            "limit": 30,  # Get a good selection to choose from
            "optPhase": input_data.optPhase
        }
        
        exercises_response = await make_api_request(
            "GET", 
            f"/exercises/recommended/{input_data.clientId}", 
            data=exercise_params
        )
        
        recommended_exercises = exercises_response.get("exercises", [])
        
        if not recommended_exercises:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No suitable exercises found with the given criteria"
            )
        
        # Group exercises by category
        exercise_categories = {}
        for exercise in recommended_exercises:
            category = exercise.get("category", "other")
            if category not in exercise_categories:
                exercise_categories[category] = []
            exercise_categories[category].append(exercise)
        
        # Create workout days based on daysPerWeek
        day_types = []
        if input_data.daysPerWeek == 3:
            # 3-day split (e.g., full body x3)
            day_types = ["full_body", "full_body", "full_body"]
        elif input_data.daysPerWeek == 4:
            # 4-day split (e.g., upper/lower split)
            day_types = ["upper_body", "lower_body", "upper_body", "lower_body"]
        elif input_data.daysPerWeek == 5:
            # 5-day split (e.g., push/pull/legs)
            day_types = ["push", "pull", "legs", "push", "pull"]
        elif input_data.daysPerWeek == 6:
            # 6-day PPL split
            day_types = ["push", "pull", "legs", "push", "pull", "legs"]
        else:
            # Default to full body workouts
            day_types = ["full_body"] * input_data.daysPerWeek
        
        # Generate days
        for i, day_type in enumerate(day_types):
            day_number = i + 1
            day = {
                "dayNumber": day_number,
                "name": f"{day_type.replace('_', ' ').title()} Day {day_number}",
                "focus": day_type,
                "dayType": "training",
                "optPhase": input_data.optPhase,
                "sortOrder": day_number,
                "exercises": []
            }
            
            # Select exercises for this day type
            selected_exercises = []
            
            if day_type == "full_body":
                # For full body, select some exercises from each major category
                categories_to_include = ["strength", "cardio", "core"]
                for category in categories_to_include:
                    if category in exercise_categories:
                        # Take 2-3 exercises from each category
                        exercises_to_include = exercise_categories[category][:3]
                        selected_exercises.extend(exercises_to_include)
            elif day_type == "upper_body":
                # For upper body, focus on upper body exercises
                relevant_categories = ["chest", "back", "shoulders", "arms"]
                for category in relevant_categories:
                    if category in exercise_categories:
                        exercises_to_include = exercise_categories[category][:2]
                        selected_exercises.extend(exercises_to_include)
            elif day_type == "lower_body":
                # For lower body, focus on lower body exercises
                relevant_categories = ["legs", "glutes", "calves"]
                for category in relevant_categories:
                    if category in exercise_categories:
                        exercises_to_include = exercise_categories[category][:2]
                        selected_exercises.extend(exercises_to_include)
            elif day_type == "push":
                # For push, focus on pushing movements
                relevant_categories = ["chest", "shoulders", "triceps"]
                for category in relevant_categories:
                    if category in exercise_categories:
                        exercises_to_include = exercise_categories[category][:2]
                        selected_exercises.extend(exercises_to_include)
            elif day_type == "pull":
                # For pull, focus on pulling movements
                relevant_categories = ["back", "biceps", "traps"]
                for category in relevant_categories:
                    if category in exercise_categories:
                        exercises_to_include = exercise_categories[category][:2]
                        selected_exercises.extend(exercises_to_include)
            elif day_type == "legs":
                # For legs, focus on leg exercises
                relevant_categories = ["legs", "glutes", "calves"]
                for category in relevant_categories:
                    if category in exercise_categories:
                        exercises_to_include = exercise_categories[category][:3]
                        selected_exercises.extend(exercises_to_include)
            
            # Always include some core exercises
            if "core" in exercise_categories:
                core_exercises = exercise_categories["core"][:2]
                selected_exercises.extend(core_exercises)
            
            # Limit to 6-8 exercises per day
            selected_exercises = selected_exercises[:8]
            
            # Add exercises to the day
            for j, exercise in enumerate(selected_exercises):
                # Determine appropriate set/rep scheme based on exercise type and goals
                set_scheme = "3x10"  # Default
                rep_goal = "10"
                rest_period = 60  # Default rest in seconds
                
                if input_data.goal == "strength":
                    set_scheme = "5x5"
                    rep_goal = "5"
                    rest_period = 120
                elif input_data.goal == "hypertrophy":
                    set_scheme = "4x8-12"
                    rep_goal = "8-12"
                    rest_period = 90
                elif input_data.goal == "endurance":
                    set_scheme = "3x15-20"
                    rep_goal = "15-20"
                    rest_period = 45
                
                # Customize based on exercise category
                category = exercise.get("category", "")
                if category == "cardio":
                    set_scheme = "1x15-30"
                    rep_goal = "15-30 min"
                    rest_period = 0
                
                # Add the exercise to the day
                day["exercises"].append({
                    "exerciseId": exercise["id"],
                    "orderInWorkout": j + 1,
                    "setScheme": set_scheme,
                    "repGoal": rep_goal,
                    "restPeriod": rest_period,
                    "notes": exercise.get("description", "")[:100] if exercise.get("description") else None
                })
            
            # Add the day to the plan
            plan_data["days"].append(day)
        
        # Make API request to create the plan
        response = await make_api_request(
            "POST", 
            "/workout/plans", 
            data=plan_data
        )
        
        # Process response
        plan = response.get("plan", {})
        
        return GenerateWorkoutPlanOutput(
            plan=plan,
            message=f"Generated a {input_data.daysPerWeek}-day workout plan with a focus on {input_data.goal or 'general fitness'}."
        )
    except HTTPException as e:
        # Re-raise HTTP exceptions
        raise e
    except Exception as e:
        logger.error(f"Error in GenerateWorkoutPlan: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate workout plan: {str(e)}"
        )
