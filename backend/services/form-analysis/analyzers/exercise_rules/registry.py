"""
Exercise rule engine registry.

Maps exercise names (and common aliases) to their rule engine instances.
Covers 75+ exercises across all NASM movement patterns:
  - Squat patterns (7 variants)
  - Hip hinge / deadlift patterns (8 variants)
  - Lunge / single-leg (6 variants)
  - Horizontal push (7 variants)
  - Vertical push (4 variants)
  - Horizontal pull (6 variants)
  - Vertical pull (4 variants)
  - Core / anti-movement (10 exercises)
  - Upper body isolation (10 exercises)
  - Lower body isolation (3 exercises)
  - Stability ball exercises (7 exercises)
  - Resistance band exercises (7 exercises)
  - Cable machine exercises (8 exercises)
  - Bodyweight calisthenics (12 exercises)
"""

from .base import ExerciseRuleEngine

# ── Squat patterns ─────────────────────────────────────────────────
from .squat import (
    SquatRules,
    GobletSquatRules,
    FrontSquatRules,
    OverheadSquatRules,
    SumoSquatRules,
    SplitSquatRules,
)

# ── Deadlift / hip hinge ──────────────────────────────────────────
from .deadlift import DeadliftRules, SumoDeadliftRules
from .hip_hinge import (
    RomanianDeadliftRules,
    GoodMorningRules,
    KettlebellSwingRules,
    HipThrustRules,
    GluteBridgeRules,
)

# ── Lunge / single-leg ────────────────────────────────────────────
from .lunge import (
    ForwardLungeRules,
    ReverseLungeRules,
    WalkingLungeRules,
    LateralLungeRules,
    BulgarianSplitSquatRules,
    StepUpRules,
)

# ── Push-up / horizontal push ─────────────────────────────────────
from .pushup import PushupRules
from .press import (
    BenchPressRules,
    InclinePressRules,
    DipsRules,
)

# ── Vertical push ─────────────────────────────────────────────────
from .press import (
    OverheadPressRules,
    PushPressRules,
    DumbbellShoulderPressRules,
)

# ── Pull ───────────────────────────────────────────────────────────
from .pull import (
    BentOverRowRules,
    SingleArmRowRules,
    PullUpRules,
    ChinUpRules,
    LatPulldownRules,
    CableRowRules,
    FacePullRules,
)

# ── Core ───────────────────────────────────────────────────────────
from .core import (
    PlankRules,
    SidePlankRules,
    DeadBugRules,
    CrunchRules,
    RussianTwistRules,
    MountainClimberRules,
    LegRaiseRules,
)

# ── Isolation ──────────────────────────────────────────────────────
from .isolation import (
    BicepCurlRules,
    HammerCurlRules,
    TricepExtensionRules,
    TricepPushdownRules,
    LateralRaiseRules,
    FrontRaiseRules,
    RearDeltFlyRules,
    CalfRaiseRules,
    LegExtensionRules,
    LegCurlRules,
    ChestFlyRules,
    ShrugRules,
)

# ── Stability ball ─────────────────────────────────────────────────
from .stability_ball import (
    StabilityBallCrunchRules,
    StabilityBallHamstringCurlRules,
    StabilityBallPushUpRules,
    StabilityBallBackExtensionRules,
    StabilityBallPlankRules,
    StabilityBallSquatRules,
)

# ── Resistance band ────────────────────────────────────────────────
from .band import (
    BandedSquatRules,
    BandPullApartRules,
    BandedGluteKickbackRules,
    BandedLateralWalkRules,
    BandedHipThrustRules,
    BandedRowRules,
)

# ── Cable machine ──────────────────────────────────────────────────
from .cable import (
    CableCrossoverRules,
    CableWoodchopRules,
    CableKickbackRules,
    CableLateralRaiseRules,
    CableCurlRules,
    CableTricepExtensionRules,
    CablePullThroughRules,
)

# ── Bodyweight calisthenics ────────────────────────────────────────
from .calisthenics import (
    BurpeeRules,
    JumpSquatRules,
    BoxJumpRules,
    PistolSquatRules,
    PikePushUpRules,
    WallSitRules,
    HollowBodyHoldRules,
    SupermanRules,
    InvertedRowRules,
    BearCrawlRules,
)


# ═══════════════════════════════════════════════════════════════════
# MASTER REGISTRY
# Keys are canonical names + common aliases (all lowercase).
# ═══════════════════════════════════════════════════════════════════

EXERCISE_ENGINES: dict[str, ExerciseRuleEngine] = {
    # ── Squat patterns (7) ──────────────────────────────────────────
    "squat": SquatRules(),
    "back_squat": SquatRules(),
    "bodyweight_squat": SquatRules(),
    "air_squat": SquatRules(),
    "goblet_squat": GobletSquatRules(),
    "front_squat": FrontSquatRules(),
    "overhead_squat": OverheadSquatRules(),
    "ohs": OverheadSquatRules(),
    "sumo_squat": SumoSquatRules(),
    "split_squat": SplitSquatRules(),

    # ── Deadlift / hip hinge (8) ────────────────────────────────────
    "deadlift": DeadliftRules(),
    "conventional_deadlift": DeadliftRules(),
    "sumo_deadlift": SumoDeadliftRules(),
    "romanian_deadlift": RomanianDeadliftRules(),
    "rdl": RomanianDeadliftRules(),
    "stiff_leg_deadlift": RomanianDeadliftRules(),
    "good_morning": GoodMorningRules(),
    "kettlebell_swing": KettlebellSwingRules(),
    "kb_swing": KettlebellSwingRules(),
    "hip_thrust": HipThrustRules(),
    "barbell_hip_thrust": HipThrustRules(),
    "glute_bridge": GluteBridgeRules(),

    # ── Lunge / single-leg (6) ──────────────────────────────────────
    "lunge": ForwardLungeRules(),
    "forward_lunge": ForwardLungeRules(),
    "reverse_lunge": ReverseLungeRules(),
    "walking_lunge": WalkingLungeRules(),
    "lateral_lunge": LateralLungeRules(),
    "side_lunge": LateralLungeRules(),
    "bulgarian_split_squat": BulgarianSplitSquatRules(),
    "bss": BulgarianSplitSquatRules(),
    "rear_foot_elevated_split_squat": BulgarianSplitSquatRules(),
    "step_up": StepUpRules(),

    # ── Horizontal push (7) ─────────────────────────────────────────
    "pushup": PushupRules(),
    "push_up": PushupRules(),
    "push-up": PushupRules(),
    "bench_press": BenchPressRules(),
    "flat_bench_press": BenchPressRules(),
    "barbell_bench_press": BenchPressRules(),
    "dumbbell_bench_press": BenchPressRules(),
    "incline_press": InclinePressRules(),
    "incline_bench_press": InclinePressRules(),
    "dips": DipsRules(),
    "tricep_dips": DipsRules(),
    "chest_dips": DipsRules(),

    # ── Vertical push (4) ──────────────────────────────────────────
    "overhead_press": OverheadPressRules(),
    "ohp": OverheadPressRules(),
    "military_press": OverheadPressRules(),
    "barbell_press": OverheadPressRules(),
    "shoulder_press": OverheadPressRules(),
    "push_press": PushPressRules(),
    "dumbbell_shoulder_press": DumbbellShoulderPressRules(),
    "db_shoulder_press": DumbbellShoulderPressRules(),
    "arnold_press": DumbbellShoulderPressRules(),

    # ── Horizontal pull (6) ─────────────────────────────────────────
    "bent_over_row": BentOverRowRules(),
    "barbell_row": BentOverRowRules(),
    "pendlay_row": BentOverRowRules(),
    "dumbbell_row": SingleArmRowRules(),
    "single_arm_row": SingleArmRowRules(),
    "one_arm_row": SingleArmRowRules(),
    "cable_row": CableRowRules(),
    "seated_row": CableRowRules(),
    "seated_cable_row": CableRowRules(),
    "face_pull": FacePullRules(),

    # ── Vertical pull (4) ──────────────────────────────────────────
    "pull_up": PullUpRules(),
    "pullup": PullUpRules(),
    "pull-up": PullUpRules(),
    "chin_up": ChinUpRules(),
    "chinup": ChinUpRules(),
    "chin-up": ChinUpRules(),
    "lat_pulldown": LatPulldownRules(),
    "lat_pull_down": LatPulldownRules(),

    # ── Core / anti-movement (10) ──────────────────────────────────
    "plank": PlankRules(),
    "forearm_plank": PlankRules(),
    "high_plank": PlankRules(),
    "side_plank": SidePlankRules(),
    "dead_bug": DeadBugRules(),
    "deadbug": DeadBugRules(),
    "crunch": CrunchRules(),
    "sit_up": CrunchRules(),
    "situp": CrunchRules(),
    "russian_twist": RussianTwistRules(),
    "mountain_climber": MountainClimberRules(),
    "mountain_climbers": MountainClimberRules(),
    "leg_raise": LegRaiseRules(),
    "hanging_leg_raise": LegRaiseRules(),
    "lying_leg_raise": LegRaiseRules(),

    # ── Upper body isolation (10) ──────────────────────────────────
    "bicep_curl": BicepCurlRules(),
    "bicep_curls": BicepCurlRules(),
    "dumbbell_curl": BicepCurlRules(),
    "barbell_curl": BicepCurlRules(),
    "hammer_curl": HammerCurlRules(),
    "tricep_extension": TricepExtensionRules(),
    "skull_crusher": TricepExtensionRules(),
    "overhead_tricep_extension": TricepExtensionRules(),
    "tricep_pushdown": TricepPushdownRules(),
    "lateral_raise": LateralRaiseRules(),
    "side_raise": LateralRaiseRules(),
    "dumbbell_lateral_raise": LateralRaiseRules(),
    "front_raise": FrontRaiseRules(),
    "dumbbell_front_raise": FrontRaiseRules(),
    "rear_delt_fly": RearDeltFlyRules(),
    "reverse_fly": RearDeltFlyRules(),
    "rear_delt_raise": RearDeltFlyRules(),
    "chest_fly": ChestFlyRules(),
    "dumbbell_fly": ChestFlyRules(),
    "pec_fly": ChestFlyRules(),
    "shrug": ShrugRules(),
    "barbell_shrug": ShrugRules(),
    "dumbbell_shrug": ShrugRules(),

    # ── Lower body isolation (3) ──────────────────────────────────
    "calf_raise": CalfRaiseRules(),
    "standing_calf_raise": CalfRaiseRules(),
    "seated_calf_raise": CalfRaiseRules(),
    "leg_extension": LegExtensionRules(),
    "leg_curl": LegCurlRules(),
    "hamstring_curl": LegCurlRules(),
    "lying_leg_curl": LegCurlRules(),
    "seated_leg_curl": LegCurlRules(),

    # ── Stability ball (7) ─────────────────────────────────────────
    "stability_ball_crunch": StabilityBallCrunchRules(),
    "swiss_ball_crunch": StabilityBallCrunchRules(),
    "stability_ball_hamstring_curl": StabilityBallHamstringCurlRules(),
    "swiss_ball_hamstring_curl": StabilityBallHamstringCurlRules(),
    "stability_ball_pushup": StabilityBallPushUpRules(),
    "swiss_ball_pushup": StabilityBallPushUpRules(),
    "stability_ball_back_extension": StabilityBallBackExtensionRules(),
    "stability_ball_plank": StabilityBallPlankRules(),
    "swiss_ball_plank": StabilityBallPlankRules(),
    "wall_ball_squat": StabilityBallSquatRules(),
    "wall_squat": StabilityBallSquatRules(),

    # ── Resistance band (7) ────────────────────────────────────────
    "banded_squat": BandedSquatRules(),
    "band_squat": BandedSquatRules(),
    "band_pull_apart": BandPullApartRules(),
    "banded_pull_apart": BandPullApartRules(),
    "banded_glute_kickback": BandedGluteKickbackRules(),
    "band_kickback": BandedGluteKickbackRules(),
    "banded_lateral_walk": BandedLateralWalkRules(),
    "monster_walk": BandedLateralWalkRules(),
    "crab_walk": BandedLateralWalkRules(),
    "banded_hip_thrust": BandedHipThrustRules(),
    "banded_row": BandedRowRules(),
    "band_row": BandedRowRules(),

    # ── Cable machine (8) ──────────────────────────────────────────
    "cable_crossover": CableCrossoverRules(),
    "cable_fly": CableCrossoverRules(),
    "cable_woodchop": CableWoodchopRules(),
    "wood_chop": CableWoodchopRules(),
    "cable_kickback": CableKickbackRules(),
    "cable_glute_kickback": CableKickbackRules(),
    "cable_lateral_raise": CableLateralRaiseRules(),
    "cable_curl": CableCurlRules(),
    "cable_bicep_curl": CableCurlRules(),
    "cable_tricep_extension": CableTricepExtensionRules(),
    "cable_pushdown": CableTricepExtensionRules(),
    "cable_pull_through": CablePullThroughRules(),

    # ── Bodyweight calisthenics (12) ────────────────────────────────
    "burpee": BurpeeRules(),
    "burpees": BurpeeRules(),
    "jump_squat": JumpSquatRules(),
    "squat_jump": JumpSquatRules(),
    "box_jump": BoxJumpRules(),
    "pistol_squat": PistolSquatRules(),
    "single_leg_squat": PistolSquatRules(),
    "pike_pushup": PikePushUpRules(),
    "pike_push_up": PikePushUpRules(),
    "wall_sit": WallSitRules(),
    "hollow_body_hold": HollowBodyHoldRules(),
    "hollow_hold": HollowBodyHoldRules(),
    "superman": SupermanRules(),
    "superman_hold": SupermanRules(),
    "back_extension": SupermanRules(),
    "inverted_row": InvertedRowRules(),
    "bodyweight_row": InvertedRowRules(),
    "australian_pullup": InvertedRowRules(),
    "bear_crawl": BearCrawlRules(),
}


def get_exercise_engine(exercise_name: str) -> ExerciseRuleEngine | None:
    """Get the rule engine for an exercise name (case-insensitive).

    Supports canonical names, common aliases, and fuzzy matching
    (spaces/hyphens converted to underscores).
    """
    normalized = exercise_name.lower().strip().replace(" ", "_").replace("-", "_")
    return EXERCISE_ENGINES.get(normalized)


def supported_exercises() -> list[str]:
    """Return deduplicated list of canonical exercise names."""
    # Use exercise_name from each engine instance to get canonical names
    seen = set()
    exercises = []
    for engine in EXERCISE_ENGINES.values():
        if engine.exercise_name not in seen:
            seen.add(engine.exercise_name)
            exercises.append(engine.exercise_name)
    return sorted(exercises)


def exercise_categories() -> dict[str, list[str]]:
    """Return exercises organized by movement category."""
    categories = {
        "squat_patterns": [],
        "hip_hinge_deadlift": [],
        "lunge_single_leg": [],
        "horizontal_push": [],
        "vertical_push": [],
        "horizontal_pull": [],
        "vertical_pull": [],
        "core": [],
        "upper_isolation": [],
        "lower_isolation": [],
        "stability_ball": [],
        "resistance_band": [],
        "cable_machine": [],
        "bodyweight_calisthenics": [],
    }

    cat_map = {
        "squat": "squat_patterns",
        "goblet_squat": "squat_patterns",
        "front_squat": "squat_patterns",
        "overhead_squat": "squat_patterns",
        "sumo_squat": "squat_patterns",
        "split_squat": "squat_patterns",
        "deadlift": "hip_hinge_deadlift",
        "sumo_deadlift": "hip_hinge_deadlift",
        "romanian_deadlift": "hip_hinge_deadlift",
        "good_morning": "hip_hinge_deadlift",
        "kettlebell_swing": "hip_hinge_deadlift",
        "hip_thrust": "hip_hinge_deadlift",
        "glute_bridge": "hip_hinge_deadlift",
        "forward_lunge": "lunge_single_leg",
        "reverse_lunge": "lunge_single_leg",
        "walking_lunge": "lunge_single_leg",
        "lateral_lunge": "lunge_single_leg",
        "bulgarian_split_squat": "lunge_single_leg",
        "step_up": "lunge_single_leg",
        "pushup": "horizontal_push",
        "bench_press": "horizontal_push",
        "incline_press": "horizontal_push",
        "dips": "horizontal_push",
        "overhead_press": "vertical_push",
        "push_press": "vertical_push",
        "dumbbell_shoulder_press": "vertical_push",
        "bent_over_row": "horizontal_pull",
        "single_arm_row": "horizontal_pull",
        "cable_row": "horizontal_pull",
        "face_pull": "horizontal_pull",
        "pull_up": "vertical_pull",
        "chin_up": "vertical_pull",
        "lat_pulldown": "vertical_pull",
        "plank": "core",
        "side_plank": "core",
        "dead_bug": "core",
        "crunch": "core",
        "russian_twist": "core",
        "mountain_climber": "core",
        "leg_raise": "core",
        "bicep_curl": "upper_isolation",
        "hammer_curl": "upper_isolation",
        "tricep_extension": "upper_isolation",
        "tricep_pushdown": "upper_isolation",
        "lateral_raise": "upper_isolation",
        "front_raise": "upper_isolation",
        "rear_delt_fly": "upper_isolation",
        "chest_fly": "upper_isolation",
        "shrug": "upper_isolation",
        "calf_raise": "lower_isolation",
        "leg_extension": "lower_isolation",
        "leg_curl": "lower_isolation",
        "stability_ball_crunch": "stability_ball",
        "stability_ball_hamstring_curl": "stability_ball",
        "stability_ball_pushup": "stability_ball",
        "stability_ball_back_extension": "stability_ball",
        "stability_ball_plank": "stability_ball",
        "wall_ball_squat": "stability_ball",
        "banded_squat": "resistance_band",
        "band_pull_apart": "resistance_band",
        "banded_glute_kickback": "resistance_band",
        "banded_lateral_walk": "resistance_band",
        "banded_hip_thrust": "resistance_band",
        "banded_row": "resistance_band",
        "cable_crossover": "cable_machine",
        "cable_woodchop": "cable_machine",
        "cable_kickback": "cable_machine",
        "cable_lateral_raise": "cable_machine",
        "cable_curl": "cable_machine",
        "cable_tricep_extension": "cable_machine",
        "cable_pull_through": "cable_machine",
        "burpee": "bodyweight_calisthenics",
        "jump_squat": "bodyweight_calisthenics",
        "box_jump": "bodyweight_calisthenics",
        "pistol_squat": "bodyweight_calisthenics",
        "pike_pushup": "bodyweight_calisthenics",
        "wall_sit": "bodyweight_calisthenics",
        "hollow_body_hold": "bodyweight_calisthenics",
        "superman": "bodyweight_calisthenics",
        "inverted_row": "bodyweight_calisthenics",
        "bear_crawl": "bodyweight_calisthenics",
    }

    for name, cat in cat_map.items():
        if cat in categories:
            categories[cat].append(name)

    return categories
