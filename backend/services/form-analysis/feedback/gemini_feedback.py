"""
Gemini Flash feedback generation.

Generates personalized, context-aware coaching feedback from
structured movement analysis data. Uses the Gemini API.
"""

import json
import logging
import os

import httpx

from .prompts import GEMINI_COACHING_SYSTEM

logger = logging.getLogger(__name__)

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"


async def generate_coaching_feedback(analysis_data: dict) -> dict:
    """Generate personalized coaching feedback using Gemini Flash.

    Args:
        analysis_data: Dict containing:
            - exercise: str
            - total_reps: int
            - avg_score: float
            - rep_scores: list[float]
            - compensations: list[dict]
            - joint_angle_summary: dict
            - fatigue_detected: bool
            - fatigue_onset_rep: int | None
            - tempo_analysis: dict

    Returns:
        Dict with 'feedback' (str) and 'model' (str), or error info
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        logger.warning("GEMINI_API_KEY not set -- returning rule-based feedback only")
        return {
            "feedback": _fallback_feedback(analysis_data),
            "model": "rule-based-fallback",
            "error": None,
        }

    # Build the user message with structured data
    user_message = _build_user_message(analysis_data)

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": user_message}],
            }
        ],
        "systemInstruction": {
            "parts": [{"text": GEMINI_COACHING_SYSTEM}]
        },
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 400,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{GEMINI_API_URL}?key={api_key}",
                json=payload,
                headers={"Content-Type": "application/json"},
            )

            if response.status_code != 200:
                logger.error("Gemini API error %d: %s", response.status_code, response.text[:200])
                return {
                    "feedback": _fallback_feedback(analysis_data),
                    "model": "rule-based-fallback",
                    "error": f"Gemini API returned {response.status_code}",
                }

            data = response.json()
            text = data["candidates"][0]["content"]["parts"][0]["text"]

            logger.info("Gemini feedback generated (%d chars)", len(text))
            return {
                "feedback": text.strip(),
                "model": "gemini-2.5-flash",
                "error": None,
            }

    except httpx.TimeoutException:
        logger.warning("Gemini API timed out -- using fallback")
        return {
            "feedback": _fallback_feedback(analysis_data),
            "model": "rule-based-fallback",
            "error": "Gemini API timeout",
        }
    except Exception as e:
        logger.exception("Gemini feedback generation failed")
        return {
            "feedback": _fallback_feedback(analysis_data),
            "model": "rule-based-fallback",
            "error": str(e),
        }


def _build_user_message(data: dict) -> str:
    """Build structured message for Gemini from analysis data."""
    parts = [
        f"Exercise: {data.get('exercise', 'unknown')}",
        f"Total reps: {data.get('total_reps', 0)}",
        f"Average form score: {data.get('avg_score', 0)}/100",
    ]

    # Rep scores
    rep_scores = data.get("rep_scores", [])
    if rep_scores:
        parts.append(f"Per-rep scores: {', '.join(str(s) for s in rep_scores)}")

    # Fatigue
    if data.get("fatigue_detected"):
        parts.append(f"Fatigue detected starting at rep {data.get('fatigue_onset_rep', '?')}")

    # Tempo
    tempo = data.get("tempo_analysis", {})
    if tempo.get("avg_eccentric_sec"):
        parts.append(
            f"Tempo: {tempo['avg_eccentric_sec']}s eccentric / "
            f"{tempo.get('avg_concentric_sec', 0)}s concentric"
        )

    # Compensations
    comps = data.get("compensations", [])
    if comps:
        parts.append("\nDetected compensations:")
        for c in comps:
            parts.append(
                f"  - {c['type']} ({c['severity']}): {c.get('description', '')}"
                f" | Weak: {c.get('likely_weak_muscle', 'N/A')}"
                f" | Tight: {c.get('likely_tight_muscle', 'N/A')}"
            )

    # Key angles
    summary = data.get("joint_angle_summary", {})
    if summary:
        parts.append("\nKey joint angles (min/max/avg across reps):")
        for key, vals in summary.items():
            if isinstance(vals, dict):
                parts.append(f"  - {key}: min={vals.get('min')}, max={vals.get('max')}, avg={vals.get('avg')}")

    return "\n".join(parts)


def _fallback_feedback(data: dict) -> str:
    """Generate basic feedback without LLM when API is unavailable."""
    parts = []
    score = data.get("avg_score", 0)
    exercise = data.get("exercise", "exercise")
    reps = data.get("total_reps", 0)

    if score >= 85:
        parts.append(f"Strong set of {reps} {exercise} reps. Overall form score: {score}/100.")
    elif score >= 65:
        parts.append(f"Decent set of {reps} {exercise} reps (score: {score}/100). Some corrections needed.")
    else:
        parts.append(f"Form needs attention on this set of {reps} {exercise} reps (score: {score}/100).")

    comps = data.get("compensations", [])
    if comps:
        top_comp = comps[0]
        parts.append(f"Primary issue: {top_comp.get('description', top_comp['type'])}.")

    if data.get("fatigue_detected"):
        parts.append(f"Form degraded starting at rep {data.get('fatigue_onset_rep')} -- consider reducing reps or load.")

    return " ".join(parts)
