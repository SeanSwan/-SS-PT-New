/**
 * useBiomechanics Hook
 * ====================
 * Calculates joint angles from MediaPipe landmarks, throttled to 10fps.
 * Provides angle data, rep counting, and form quality assessment.
 *
 * NASM-aligned: angles map to kinetic chain checkpoints
 * (ankle, knee, hip, shoulder, cervical spine).
 */
import { useCallback, useRef, useState } from 'react';
import { ANGLE_JOINTS, ANALYSIS_CONFIG, LANDMARK } from '../components/FormAnalysis/constants';

type NormalizedLandmark = { x: number; y: number; z: number; visibility?: number };

export interface JointAngles {
  leftElbow: number;
  rightElbow: number;
  leftKnee: number;
  rightKnee: number;
  leftHip: number;
  rightHip: number;
  leftShoulder: number;
  rightShoulder: number;
  leftAnkle: number;
  rightAnkle: number;
}

export interface BiomechanicsData {
  angles: JointAngles;
  /** Torso lean angle from vertical (0 = upright) */
  torsoLean: number;
  /** Knee valgus indicator: positive = valgus (knees caving in) */
  kneeValgus: { left: number; right: number };
  /** Shoulder level difference (positive = left higher) */
  shoulderTilt: number;
  /** Hip level difference (positive = left higher) */
  hipTilt: number;
}

export interface RepState {
  count: number;
  phase: 'idle' | 'descending' | 'ascending';
  /** Primary tracking joint for current exercise */
  trackingJoint: keyof JointAngles;
}

export interface UseBiomechanicsReturn {
  /** Process landmarks and update angles (throttled to 10fps) */
  processLandmarks: (landmarks: NormalizedLandmark[]) => BiomechanicsData | null;
  /** Current joint angles */
  angles: JointAngles | null;
  /** Current biomechanics data (includes angles + compensations) */
  biomechanics: BiomechanicsData | null;
  /** Rep counter state */
  repState: RepState;
  /** Reset rep counter */
  resetReps: () => void;
  /** Set which joint to track for reps */
  setTrackingJoint: (joint: keyof JointAngles) => void;
}

/** Calculate angle between three points in degrees */
function calculateAngle(a: NormalizedLandmark, b: NormalizedLandmark, c: NormalizedLandmark): number {
  const ba = { x: a.x - b.x, y: a.y - b.y };
  const bc = { x: c.x - b.x, y: c.y - b.y };
  const dot = ba.x * bc.x + ba.y * bc.y;
  const magBA = Math.sqrt(ba.x * ba.x + ba.y * ba.y);
  const magBC = Math.sqrt(bc.x * bc.x + bc.y * bc.y);
  if (magBA === 0 || magBC === 0) return 0;
  const cosAngle = Math.max(-1, Math.min(1, dot / (magBA * magBC)));
  return Math.acos(cosAngle) * (180 / Math.PI);
}

/** Smooth a value using exponential moving average */
function smooth(current: number, previous: number, factor: number): number {
  return previous * factor + current * (1 - factor);
}

const DEFAULT_ANGLES: JointAngles = {
  leftElbow: 180, rightElbow: 180,
  leftKnee: 180, rightKnee: 180,
  leftHip: 180, rightHip: 180,
  leftShoulder: 180, rightShoulder: 180,
  leftAnkle: 180, rightAnkle: 180,
};

export function useBiomechanics(): UseBiomechanicsReturn {
  const [angles, setAngles] = useState<JointAngles | null>(null);
  const [biomechanics, setBiomechanics] = useState<BiomechanicsData | null>(null);
  const [repState, setRepState] = useState<RepState>({
    count: 0,
    phase: 'idle',
    trackingJoint: 'leftKnee',
  });

  const prevAnglesRef = useRef<JointAngles>(DEFAULT_ANGLES);
  const lastProcessTimeRef = useRef(0);
  const repPhaseRef = useRef<'idle' | 'descending' | 'ascending'>('idle');
  const peakAngleRef = useRef(180);
  const valleyAngleRef = useRef(180);
  const trackingJointRef = useRef<keyof JointAngles>('leftKnee');

  const processLandmarks = useCallback(
    (landmarks: NormalizedLandmark[]): BiomechanicsData | null => {
      const now = performance.now();
      const interval = 1000 / ANALYSIS_CONFIG.BIOMECHANICS_FPS;
      if (now - lastProcessTimeRef.current < interval) return null;
      lastProcessTimeRef.current = now;

      if (landmarks.length < 33) return null;

      // Calculate all joint angles
      const rawAngles: JointAngles = {} as JointAngles;
      for (const [jointName, [a, b, c]] of Object.entries(ANGLE_JOINTS)) {
        const la = landmarks[a];
        const lb = landmarks[b];
        const lc = landmarks[c];
        const minVis = ANALYSIS_CONFIG.MIN_VISIBILITY;
        if ((la.visibility ?? 0) < minVis || (lb.visibility ?? 0) < minVis || (lc.visibility ?? 0) < minVis) {
          rawAngles[jointName as keyof JointAngles] = prevAnglesRef.current[jointName as keyof JointAngles];
          continue;
        }
        rawAngles[jointName as keyof JointAngles] = calculateAngle(la, lb, lc);
      }

      // Apply smoothing
      const smoothed: JointAngles = {} as JointAngles;
      for (const key of Object.keys(rawAngles) as (keyof JointAngles)[]) {
        smoothed[key] = smooth(rawAngles[key], prevAnglesRef.current[key], ANALYSIS_CONFIG.ANGLE_SMOOTHING);
      }
      prevAnglesRef.current = smoothed;

      // Torso lean: angle between shoulder midpoint, hip midpoint, and vertical
      const shoulderMid = {
        x: (landmarks[LANDMARK.LEFT_SHOULDER].x + landmarks[LANDMARK.RIGHT_SHOULDER].x) / 2,
        y: (landmarks[LANDMARK.LEFT_SHOULDER].y + landmarks[LANDMARK.RIGHT_SHOULDER].y) / 2,
      };
      const hipMid = {
        x: (landmarks[LANDMARK.LEFT_HIP].x + landmarks[LANDMARK.RIGHT_HIP].x) / 2,
        y: (landmarks[LANDMARK.LEFT_HIP].y + landmarks[LANDMARK.RIGHT_HIP].y) / 2,
      };
      const dx = shoulderMid.x - hipMid.x;
      const dy = shoulderMid.y - hipMid.y;
      const torsoLean = Math.atan2(dx, -dy) * (180 / Math.PI);

      // Knee valgus: compare knee X to ankle-hip line X
      const leftKneeValgus = landmarks[LANDMARK.LEFT_KNEE].x -
        (landmarks[LANDMARK.LEFT_HIP].x + landmarks[LANDMARK.LEFT_ANKLE].x) / 2;
      const rightKneeValgus = (landmarks[LANDMARK.RIGHT_HIP].x + landmarks[LANDMARK.RIGHT_ANKLE].x) / 2 -
        landmarks[LANDMARK.RIGHT_KNEE].x;

      // Shoulder/hip tilt
      const shoulderTilt = (landmarks[LANDMARK.LEFT_SHOULDER].y - landmarks[LANDMARK.RIGHT_SHOULDER].y) * 100;
      const hipTilt = (landmarks[LANDMARK.LEFT_HIP].y - landmarks[LANDMARK.RIGHT_HIP].y) * 100;

      const data: BiomechanicsData = {
        angles: smoothed,
        torsoLean,
        kneeValgus: { left: leftKneeValgus * 100, right: rightKneeValgus * 100 },
        shoulderTilt,
        hipTilt,
      };

      setAngles(smoothed);
      setBiomechanics(data);

      // Rep counting on the tracked joint
      const trackAngle = smoothed[trackingJointRef.current];
      updateRepState(trackAngle);

      return data;
    },
    []
  );

  const updateRepState = useCallback((angle: number) => {
    const threshold = ANALYSIS_CONFIG.REP_ANGLE_THRESHOLD;
    const phase = repPhaseRef.current;

    if (phase === 'idle') {
      peakAngleRef.current = angle;
      valleyAngleRef.current = angle;
      if (angle < peakAngleRef.current - threshold) {
        repPhaseRef.current = 'descending';
        setRepState(prev => ({ ...prev, phase: 'descending' }));
      }
    } else if (phase === 'descending') {
      valleyAngleRef.current = Math.min(valleyAngleRef.current, angle);
      if (angle > valleyAngleRef.current + threshold) {
        repPhaseRef.current = 'ascending';
        setRepState(prev => ({ ...prev, phase: 'ascending' }));
      }
    } else if (phase === 'ascending') {
      if (angle > peakAngleRef.current - 10) {
        // Rep completed
        repPhaseRef.current = 'idle';
        peakAngleRef.current = angle;
        valleyAngleRef.current = angle;
        setRepState(prev => ({ ...prev, count: prev.count + 1, phase: 'idle' }));
      }
    }
  }, []);

  const resetReps = useCallback(() => {
    repPhaseRef.current = 'idle';
    peakAngleRef.current = 180;
    valleyAngleRef.current = 180;
    setRepState(prev => ({ ...prev, count: 0, phase: 'idle' }));
  }, []);

  const setTrackingJoint = useCallback((joint: keyof JointAngles) => {
    trackingJointRef.current = joint;
    setRepState(prev => ({ ...prev, trackingJoint: joint }));
    resetReps();
  }, [resetReps]);

  return {
    processLandmarks,
    angles,
    biomechanics,
    repState,
    resetReps,
    setTrackingJoint,
  };
}
