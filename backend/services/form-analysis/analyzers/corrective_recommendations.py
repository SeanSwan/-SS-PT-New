"""
Corrective exercise recommendation engine.

Based on NASM Corrective Exercise Specialist (CES) protocols:
1. Inhibit (foam roll overactive muscles)
2. Lengthen (static stretch overactive muscles)
3. Activate (isolated strengthening of underactive muscles)
4. Integrate (full-body movement pattern retraining)

Also incorporates:
- NASM PES (Performance Enhancement Specialist) progressions
- Squat University corrective protocols
"""

# ── NASM CES Corrective Exercise Continuum ──────────────────────────
# Each compensation maps to a 4-step corrective protocol

CORRECTIVE_PROTOCOLS: dict[str, dict] = {
    "knee_valgus": {
        "compensation": "Knee Valgus (medial knee collapse)",
        "overactive_muscles": [
            "Adductor complex",
            "TFL / IT band",
            "Lateral gastrocnemius",
            "Biceps femoris (short head)",
        ],
        "underactive_muscles": [
            "Gluteus medius",
            "Gluteus maximus",
            "VMO (vastus medialis oblique)",
            "Medial hamstring (semimembranosus, semitendinosus)",
        ],
        "inhibit": [
            {"exercise": "Foam roll adductors", "duration": "30-60 sec each side"},
            {"exercise": "Foam roll TFL / IT band", "duration": "30-60 sec each side"},
            {"exercise": "Foam roll lateral gastrocnemius", "duration": "30 sec each side"},
        ],
        "lengthen": [
            {"exercise": "Adductor stretch (side lunge hold)", "duration": "30 sec each side"},
            {"exercise": "TFL stretch (modified pigeon)", "duration": "30 sec each side"},
        ],
        "activate": [
            {"exercise": "Side-lying hip abduction", "sets_reps": "2x15 each side, slow tempo"},
            {"exercise": "Banded clamshells", "sets_reps": "2x15 each side"},
            {"exercise": "Single-leg glute bridge", "sets_reps": "2x12 each side"},
        ],
        "integrate": [
            {"exercise": "Banded bodyweight squat (band above knees)", "sets_reps": "2x10, push knees into band"},
            {"exercise": "Single-leg balance reach", "sets_reps": "2x8 each side"},
        ],
    },

    "anterior_lean": {
        "compensation": "Excessive Forward Lean",
        "overactive_muscles": [
            "Hip flexor complex (psoas, rectus femoris)",
            "Erector spinae (thoracolumbar)",
            "Abdominal external oblique",
        ],
        "underactive_muscles": [
            "Gluteus maximus",
            "Anterior core (transverse abdominis, internal oblique)",
            "Thoracic erector spinae",
        ],
        "inhibit": [
            {"exercise": "Foam roll hip flexors / quads", "duration": "30-60 sec each side"},
            {"exercise": "Foam roll thoracolumbar erectors", "duration": "30-60 sec"},
        ],
        "lengthen": [
            {"exercise": "Kneeling hip flexor stretch", "duration": "30 sec each side"},
            {"exercise": "Standing quad stretch", "duration": "30 sec each side"},
        ],
        "activate": [
            {"exercise": "Glute bridge with hold at top", "sets_reps": "2x15, 3-sec hold"},
            {"exercise": "Dead bug (anti-extension)", "sets_reps": "2x10 each side"},
            {"exercise": "Bird dog", "sets_reps": "2x10 each side"},
        ],
        "integrate": [
            {"exercise": "Goblet squat (weight as counterbalance)", "sets_reps": "2x10, slow eccentric"},
            {"exercise": "Cable pull-through", "sets_reps": "2x12"},
        ],
    },

    "heel_rise": {
        "compensation": "Heel Rise (limited ankle dorsiflexion)",
        "overactive_muscles": [
            "Gastrocnemius",
            "Soleus",
            "Peroneals",
        ],
        "underactive_muscles": [
            "Anterior tibialis",
        ],
        "inhibit": [
            {"exercise": "Foam roll calves (gastrocnemius and soleus)", "duration": "60 sec each side"},
            {"exercise": "Lacrosse ball under foot (plantar fascia)", "duration": "30 sec each side"},
        ],
        "lengthen": [
            {"exercise": "Wall ankle dorsiflexion stretch", "duration": "30 sec each side, knee over toe"},
            {"exercise": "Downward dog calf stretch", "duration": "30 sec, alternate pedaling"},
        ],
        "activate": [
            {"exercise": "Toe raises (anterior tibialis)", "sets_reps": "2x20"},
            {"exercise": "Banded ankle dorsiflexion", "sets_reps": "2x15 each side"},
        ],
        "integrate": [
            {"exercise": "Squat with heel elevations (plates under heels)", "sets_reps": "2x10, gradually reduce elevation"},
        ],
    },

    "hip_shift": {
        "compensation": "Lateral Hip Shift",
        "overactive_muscles": [
            "Adductors (shift side)",
            "TFL / IT band (shift side)",
            "Quadratus lumborum (opposite side)",
        ],
        "underactive_muscles": [
            "Gluteus medius (opposite side)",
            "Adductor complex (opposite side)",
            "Core lateral stabilizers",
        ],
        "inhibit": [
            {"exercise": "Foam roll adductors (shift side)", "duration": "30-60 sec"},
            {"exercise": "Foam roll TFL (shift side)", "duration": "30-60 sec"},
        ],
        "lengthen": [
            {"exercise": "Adductor stretch (shift side)", "duration": "30 sec"},
            {"exercise": "QL stretch (side bend, opposite side)", "duration": "30 sec"},
        ],
        "activate": [
            {"exercise": "Side-lying hip abduction (weak side)", "sets_reps": "2x15"},
            {"exercise": "Side plank (weak side)", "sets_reps": "2x20-30 sec"},
            {"exercise": "Single-leg glute bridge (weak side)", "sets_reps": "2x12"},
        ],
        "integrate": [
            {"exercise": "Lateral band walk", "sets_reps": "2x15 steps each direction"},
            {"exercise": "Single-leg squat to bench", "sets_reps": "2x8 each side"},
        ],
    },

    "back_rounding": {
        "compensation": "Lumbar Flexion Under Load (Back Rounding)",
        "overactive_muscles": [
            "Hamstrings (limiting hip ROM)",
            "Rectus abdominis (pulling spine into flexion)",
        ],
        "underactive_muscles": [
            "Erector spinae (lumbar)",
            "Multifidus",
            "Gluteus maximus",
            "Transverse abdominis",
        ],
        "inhibit": [
            {"exercise": "Foam roll hamstrings", "duration": "30-60 sec each side"},
        ],
        "lengthen": [
            {"exercise": "Seated hamstring stretch", "duration": "30 sec each side"},
            {"exercise": "90/90 hip stretch", "duration": "30 sec each side"},
        ],
        "activate": [
            {"exercise": "Prone back extension (superman hold)", "sets_reps": "2x10, 3-sec hold"},
            {"exercise": "Hip hinge with dowel on spine", "sets_reps": "2x12, maintain 3 contact points"},
            {"exercise": "Dead bug (anti-extension)", "sets_reps": "2x10 each side"},
        ],
        "integrate": [
            {"exercise": "Kettlebell deadlift (light, focus on form)", "sets_reps": "2x10"},
            {"exercise": "Good morning (bodyweight)", "sets_reps": "2x12"},
        ],
    },

    "shoulder_elevation": {
        "compensation": "Shoulder Elevation (Shrugging)",
        "overactive_muscles": [
            "Upper trapezius",
            "Levator scapulae",
            "Sternocleidomastoid",
        ],
        "underactive_muscles": [
            "Lower trapezius",
            "Serratus anterior",
            "Deep cervical flexors",
        ],
        "inhibit": [
            {"exercise": "Foam roll upper trapezius / levator scapulae", "duration": "30-60 sec each side"},
            {"exercise": "Lacrosse ball suboccipitals", "duration": "30 sec"},
        ],
        "lengthen": [
            {"exercise": "Upper trap stretch (ear to shoulder)", "duration": "30 sec each side"},
            {"exercise": "Levator scapulae stretch (look into armpit)", "duration": "30 sec each side"},
        ],
        "activate": [
            {"exercise": "Prone Y raise (lower trap)", "sets_reps": "2x12"},
            {"exercise": "Wall slide (scapular upward rotation)", "sets_reps": "2x10, slow"},
            {"exercise": "Chin tuck (deep cervical flexor activation)", "sets_reps": "2x10, 5-sec hold"},
        ],
        "integrate": [
            {"exercise": "Overhead press with cue 'shoulders down and back'", "sets_reps": "2x10, light load"},
        ],
    },

    "bilateral_asymmetry": {
        "compensation": "Bilateral Movement Asymmetry",
        "overactive_muscles": [
            "Dominant side may be compensating",
        ],
        "underactive_muscles": [
            "Weaker side primary movers",
        ],
        "inhibit": [
            {"exercise": "Foam roll both sides of affected joint", "duration": "30-60 sec each"},
        ],
        "lengthen": [
            {"exercise": "Stretch tighter side (identified by ROM comparison)", "duration": "30 sec"},
        ],
        "activate": [
            {"exercise": "Unilateral work on weaker side (1.5x volume)", "sets_reps": "Extra set on weak side"},
            {"exercise": "Single-leg or single-arm variations of affected movement", "sets_reps": "2x10 each, start with weak side"},
        ],
        "integrate": [
            {"exercise": "Bilateral movement with mirror feedback for symmetry", "sets_reps": "2x10"},
        ],
    },

    "hip_sag": {
        "compensation": "Hip Sag During Push-up / Plank (Anterior Pelvic Tilt)",
        "overactive_muscles": [
            "Hip flexors (psoas, rectus femoris)",
            "Erector spinae (lumbar)",
        ],
        "underactive_muscles": [
            "Transverse abdominis",
            "Internal oblique",
            "Gluteus maximus",
        ],
        "inhibit": [
            {"exercise": "Foam roll hip flexors", "duration": "30-60 sec each side"},
        ],
        "lengthen": [
            {"exercise": "Kneeling hip flexor stretch with posterior pelvic tilt", "duration": "30 sec each"},
        ],
        "activate": [
            {"exercise": "Plank with posterior pelvic tilt cue", "sets_reps": "3x20 sec, squeeze glutes"},
            {"exercise": "Dead bug", "sets_reps": "2x10 each side, slow"},
            {"exercise": "Glute bridge with hold", "sets_reps": "2x15, 3-sec hold"},
        ],
        "integrate": [
            {"exercise": "Push-up from knees with core focus", "sets_reps": "2x8, maintain neutral spine"},
        ],
    },
}


def get_recommendations(compensations: list[dict]) -> list[dict]:
    """Generate NASM CES corrective exercise recommendations from detected compensations.

    Args:
        compensations: List of compensation dicts from pattern_detector.merge_compensations()

    Returns:
        List of corrective protocol dicts, ordered by severity
    """
    recommendations = []
    seen_types = set()

    for comp in compensations:
        comp_type = comp["type"]
        if comp_type in seen_types:
            continue
        seen_types.add(comp_type)

        protocol = CORRECTIVE_PROTOCOLS.get(comp_type)
        if not protocol:
            continue

        recommendations.append({
            "for_compensation": comp_type,
            "severity": comp["severity"],
            "protocol_name": protocol["compensation"],
            "overactive_muscles": protocol["overactive_muscles"],
            "underactive_muscles": protocol["underactive_muscles"],
            "corrective_continuum": {
                "1_inhibit": protocol["inhibit"],
                "2_lengthen": protocol["lengthen"],
                "3_activate": protocol["activate"],
                "4_integrate": protocol["integrate"],
            },
        })

    return recommendations
