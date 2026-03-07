/**
 * Form Analysis Constants
 * =======================
 * Score thresholds, color mappings, and landmark connection definitions
 * for the real-time form analysis system.
 */

// --- Score Thresholds ---

export const FORM_SCORE_THRESHOLDS = {
  EXCELLENT: 90,
  GOOD: 75,
  FAIR: 60,
  POOR: 40,
} as const;

export type ScoreGrade = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

export function getScoreGrade(score: number): ScoreGrade {
  if (score >= FORM_SCORE_THRESHOLDS.EXCELLENT) return 'excellent';
  if (score >= FORM_SCORE_THRESHOLDS.GOOD) return 'good';
  if (score >= FORM_SCORE_THRESHOLDS.FAIR) return 'fair';
  if (score >= FORM_SCORE_THRESHOLDS.POOR) return 'poor';
  return 'critical';
}

/** Returns theme-aware color for a given form score */
export function getScoreColor(score: number): string {
  const grade = getScoreGrade(score);
  switch (grade) {
    case 'excellent': return '#00FF88';   // Neon green
    case 'good':      return '#60C0F0';   // Swan Cyan (Ice Wing)
    case 'fair':      return '#FFB800';   // Amber warning
    case 'poor':      return '#FF6B35';   // Orange alert
    case 'critical':  return '#FF4757';   // Red danger
  }
}

// --- MediaPipe Pose Landmark Indices (BlazePose 33-point) ---

export const LANDMARK = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;

/** Skeleton connections for drawing — pairs of landmark indices */
export const SKELETON_CONNECTIONS: [number, number][] = [
  // Torso
  [LANDMARK.LEFT_SHOULDER, LANDMARK.RIGHT_SHOULDER],
  [LANDMARK.LEFT_HIP, LANDMARK.RIGHT_HIP],
  [LANDMARK.LEFT_SHOULDER, LANDMARK.LEFT_HIP],
  [LANDMARK.RIGHT_SHOULDER, LANDMARK.RIGHT_HIP],
  // Left arm
  [LANDMARK.LEFT_SHOULDER, LANDMARK.LEFT_ELBOW],
  [LANDMARK.LEFT_ELBOW, LANDMARK.LEFT_WRIST],
  // Right arm
  [LANDMARK.RIGHT_SHOULDER, LANDMARK.RIGHT_ELBOW],
  [LANDMARK.RIGHT_ELBOW, LANDMARK.RIGHT_WRIST],
  // Left leg
  [LANDMARK.LEFT_HIP, LANDMARK.LEFT_KNEE],
  [LANDMARK.LEFT_KNEE, LANDMARK.LEFT_ANKLE],
  [LANDMARK.LEFT_ANKLE, LANDMARK.LEFT_HEEL],
  [LANDMARK.LEFT_ANKLE, LANDMARK.LEFT_FOOT_INDEX],
  // Right leg
  [LANDMARK.RIGHT_HIP, LANDMARK.RIGHT_KNEE],
  [LANDMARK.RIGHT_KNEE, LANDMARK.RIGHT_ANKLE],
  [LANDMARK.RIGHT_ANKLE, LANDMARK.RIGHT_HEEL],
  [LANDMARK.RIGHT_ANKLE, LANDMARK.RIGHT_FOOT_INDEX],
];

/** Joint triplets for angle calculation: [proximal, joint, distal] */
export const ANGLE_JOINTS = {
  leftElbow:  [LANDMARK.LEFT_SHOULDER,  LANDMARK.LEFT_ELBOW,  LANDMARK.LEFT_WRIST]  as const,
  rightElbow: [LANDMARK.RIGHT_SHOULDER, LANDMARK.RIGHT_ELBOW, LANDMARK.RIGHT_WRIST] as const,
  leftKnee:   [LANDMARK.LEFT_HIP,       LANDMARK.LEFT_KNEE,   LANDMARK.LEFT_ANKLE]  as const,
  rightKnee:  [LANDMARK.RIGHT_HIP,      LANDMARK.RIGHT_KNEE,  LANDMARK.RIGHT_ANKLE] as const,
  leftHip:    [LANDMARK.LEFT_SHOULDER,   LANDMARK.LEFT_HIP,    LANDMARK.LEFT_KNEE]   as const,
  rightHip:   [LANDMARK.RIGHT_SHOULDER,  LANDMARK.RIGHT_HIP,   LANDMARK.RIGHT_KNEE]  as const,
  leftShoulder:  [LANDMARK.LEFT_ELBOW,  LANDMARK.LEFT_SHOULDER,  LANDMARK.LEFT_HIP]  as const,
  rightShoulder: [LANDMARK.RIGHT_ELBOW, LANDMARK.RIGHT_SHOULDER, LANDMARK.RIGHT_HIP] as const,
  leftAnkle:  [LANDMARK.LEFT_KNEE,  LANDMARK.LEFT_ANKLE,  LANDMARK.LEFT_FOOT_INDEX] as const,
  rightAnkle: [LANDMARK.RIGHT_KNEE, LANDMARK.RIGHT_ANKLE, LANDMARK.RIGHT_FOOT_INDEX] as const,
} as const;

// --- Overlay Colors (Gemini Directive 1: neon wireframe HUD) ---

export const OVERLAY_COLORS = {
  skeleton: {
    good: 'rgba(96, 192, 240, 0.9)',    // Swan Cyan
    warning: 'rgba(255, 184, 0, 0.9)',   // Amber
    danger: 'rgba(255, 71, 87, 0.9)',    // Red
  },
  joint: {
    good: '#60C0F0',
    warning: '#FFB800',
    danger: '#FF4757',
  },
  glow: {
    good: 'rgba(96, 192, 240, 0.4)',
    warning: 'rgba(255, 184, 0, 0.4)',
    danger: 'rgba(255, 71, 87, 0.4)',
  },
} as const;

// --- Analysis Config ---

export const ANALYSIS_CONFIG = {
  /** Target FPS for biomechanics calculations */
  BIOMECHANICS_FPS: 10,
  /** Minimum landmark visibility to consider valid */
  MIN_VISIBILITY: 0.5,
  /** Smoothing factor for angle calculations (0-1, higher = smoother) */
  ANGLE_SMOOTHING: 0.3,
  /** Auto-dismiss duration for feedback cues (ms) */
  FEEDBACK_DISMISS_MS: 3000,
  /** Rep detection: minimum angle change to trigger a rep (degrees) */
  REP_ANGLE_THRESHOLD: 30,
} as const;
