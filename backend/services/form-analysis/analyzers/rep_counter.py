"""
Rep detection via cyclic joint angle pattern analysis.

Detects repetitions by tracking a primary joint angle through
its full range of motion cycle: top -> bottom -> top = 1 rep.
Also detects fatigue (score degradation across reps).
"""

from dataclasses import dataclass, field

from .exercise_rules.base import ExerciseRuleEngine


@dataclass
class Rep:
    """A single detected repetition."""
    rep_number: int
    start_frame: int
    bottom_frame: int
    end_frame: int
    start_time: float = 0.0
    bottom_time: float = 0.0
    end_time: float = 0.0
    min_angle: float = 180.0  # deepest point
    max_angle: float = 0.0    # top of rep
    score: float = 100.0
    cues: list = field(default_factory=list)
    eccentric_duration: float = 0.0  # seconds: top to bottom
    concentric_duration: float = 0.0  # seconds: bottom to top


@dataclass
class RepCountResult:
    """Full rep counting result for a video."""
    total_reps: int
    reps: list[Rep]
    avg_score: float
    fatigue_detected: bool
    fatigue_onset_rep: int | None  # rep where score drops >15% from first rep
    tempo_analysis: dict  # avg eccentric/concentric times


class RepCounter:
    """Detect reps from a sequence of joint angle values."""

    def __init__(self, rule_engine: ExerciseRuleEngine):
        self.rule_engine = rule_engine
        self.bottom_threshold = rule_engine.rep_bottom_threshold
        self.top_threshold = rule_engine.rep_top_threshold
        self.angle_key = rule_engine.rep_angle_key

    def count_reps(
        self,
        frames: list[dict],
        all_angles: list[dict],
        all_landmarks: list[list[dict]],
    ) -> RepCountResult:
        """Count reps from frame sequence.

        Args:
            frames: List of frame metadata dicts (frame_index, timestamp_sec, etc.)
            all_angles: Per-frame joint angle dicts
            all_landmarks: Per-frame landmark lists

        Returns:
            RepCountResult with detected reps, scores, and fatigue analysis
        """
        if not all_angles:
            return RepCountResult(
                total_reps=0, reps=[], avg_score=0,
                fatigue_detected=False, fatigue_onset_rep=None,
                tempo_analysis={},
            )

        # Get the primary angle for each frame (average L/R if available)
        angle_values = []
        for angles in all_angles:
            left_key = f"left_{self.angle_key.replace('left_', '')}"
            right_key = f"right_{self.angle_key.replace('left_', '').replace('right_', '')}"

            left_val = angles.get(left_key, angles.get(self.angle_key, 180))
            right_val = angles.get(right_key, left_val)
            angle_values.append((left_val + right_val) / 2)

        # State machine: IDLE -> DESCENDING -> AT_BOTTOM -> ASCENDING -> complete
        state = "IDLE"
        reps: list[Rep] = []
        current_rep_start = 0
        current_rep_bottom = 0
        current_min_angle = 180.0

        for i, angle in enumerate(angle_values):
            if state == "IDLE":
                if angle > self.top_threshold:
                    state = "AT_TOP"
                    current_rep_start = i

            elif state == "AT_TOP":
                if angle < self.bottom_threshold:
                    state = "DESCENDING"
                    current_rep_bottom = i
                    current_min_angle = angle

            elif state == "DESCENDING":
                if angle < current_min_angle:
                    current_min_angle = angle
                    current_rep_bottom = i
                if angle > self.top_threshold:
                    # Rep complete: went down and came back up
                    rep = self._build_rep(
                        rep_number=len(reps) + 1,
                        start=current_rep_start,
                        bottom=current_rep_bottom,
                        end=i,
                        min_angle=current_min_angle,
                        max_angle=angle,
                        frames=frames,
                        angles=all_angles,
                        landmarks=all_landmarks,
                    )
                    reps.append(rep)

                    # Reset for next rep
                    state = "AT_TOP"
                    current_rep_start = i
                    current_min_angle = 180.0

        # Fatigue detection
        fatigue_detected = False
        fatigue_onset_rep = None
        if len(reps) >= 3:
            first_score = reps[0].score
            for rep in reps[1:]:
                if first_score > 0 and (first_score - rep.score) / first_score > 0.15:
                    fatigue_detected = True
                    fatigue_onset_rep = rep.rep_number
                    break

        # Tempo analysis
        ecc_times = [r.eccentric_duration for r in reps if r.eccentric_duration > 0]
        con_times = [r.concentric_duration for r in reps if r.concentric_duration > 0]
        tempo_analysis = {
            "avg_eccentric_sec": round(sum(ecc_times) / len(ecc_times), 2) if ecc_times else 0,
            "avg_concentric_sec": round(sum(con_times) / len(con_times), 2) if con_times else 0,
            "tempo_ratio": round(
                (sum(ecc_times) / len(ecc_times)) / (sum(con_times) / len(con_times) + 0.001), 2
            ) if ecc_times and con_times else 0,
        }

        scores = [r.score for r in reps]
        avg_score = round(sum(scores) / len(scores), 1) if scores else 0

        return RepCountResult(
            total_reps=len(reps),
            reps=reps,
            avg_score=avg_score,
            fatigue_detected=fatigue_detected,
            fatigue_onset_rep=fatigue_onset_rep,
            tempo_analysis=tempo_analysis,
        )

    def _build_rep(
        self,
        rep_number: int,
        start: int,
        bottom: int,
        end: int,
        min_angle: float,
        max_angle: float,
        frames: list[dict],
        angles: list[dict],
        landmarks: list[list[dict]],
    ) -> Rep:
        """Build a Rep object with score from frame range."""
        # Evaluate rules at bottom of rep (worst form) and midpoints
        check_indices = [bottom]
        if bottom - start > 2:
            check_indices.append(start + (bottom - start) // 2)
        if end - bottom > 2:
            check_indices.append(bottom + (end - bottom) // 2)

        all_cues = []
        frame_scores = []
        for idx in check_indices:
            if idx < len(angles) and idx < len(landmarks):
                cues = self.rule_engine.evaluate(angles[idx], landmarks[idx])
                all_cues.extend(cues)
                frame_scores.append(self.rule_engine.calculate_frame_score(cues))

        score = round(sum(frame_scores) / len(frame_scores), 1) if frame_scores else 100.0

        # Timing
        start_time = frames[start]["timestamp_sec"] if start < len(frames) else 0
        bottom_time = frames[bottom]["timestamp_sec"] if bottom < len(frames) else 0
        end_time = frames[end]["timestamp_sec"] if end < len(frames) else 0

        # Deduplicate cue messages
        seen = set()
        unique_cues = []
        for c in all_cues:
            key = (c.rule_name, c.severity)
            if key not in seen:
                seen.add(key)
                unique_cues.append({"rule": c.rule_name, "message": c.message, "severity": c.severity})

        return Rep(
            rep_number=rep_number,
            start_frame=start,
            bottom_frame=bottom,
            end_frame=end,
            start_time=start_time,
            bottom_time=bottom_time,
            end_time=end_time,
            min_angle=round(min_angle, 1),
            max_angle=round(max_angle, 1),
            score=score,
            cues=unique_cues,
            eccentric_duration=round(bottom_time - start_time, 2),
            concentric_duration=round(end_time - bottom_time, 2),
        )
