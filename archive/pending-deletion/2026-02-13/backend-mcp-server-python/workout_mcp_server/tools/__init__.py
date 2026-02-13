"""
Tool exports.
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
    from tools.recommendations_tool import get_workout_recommendations
    from tools.progress_tool import get_client_progress
    from tools.statistics_tool import get_workout_statistics
    from tools.session_tool import log_workout_session
    from tools.plan_tool import generate_workout_plan
except ImportError as e:
    # If absolute imports fail, try relative imports as fallback
    try:
        from .recommendations_tool import get_workout_recommendations
        from .progress_tool import get_client_progress
        from .statistics_tool import get_workout_statistics
        from .session_tool import log_workout_session
        from .plan_tool import generate_workout_plan
    except ImportError as e2:
        print(f"Error importing workout tools: {e} / {e2}")
        # Create placeholder functions if imports fail
        async def get_workout_recommendations(input_data):
            return {"error": "Workout recommendations tool not available"}
        async def get_client_progress(input_data):
            return {"error": "Client progress tool not available"}
        async def get_workout_statistics(input_data):
            return {"error": "Workout statistics tool not available"}
        async def log_workout_session(input_data):
            return {"error": "Workout session logging tool not available"}
        async def generate_workout_plan(input_data):
            return {"error": "Workout plan generation tool not available"}

__all__ = [
    'get_workout_recommendations',
    'get_client_progress',
    'get_workout_statistics',
    'log_workout_session',
    'generate_workout_plan'
]
