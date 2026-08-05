/**
 * Body Region Definitions
 * =======================
 * Defines all clickable body regions for the interactive pain/injury body map.
 * Each region has SVG coordinates for rendering on front and back anatomical views.
 *
 * Phase 12 — Pain/Injury Body Map (NASM CES + Squat University)
 */

export type BodyView = 'front' | 'back';
export type MuscleGroup = 'neck' | 'shoulder' | 'chest' | 'arm' | 'core' | 'hip' | 'leg' | 'back_muscles' | 'foot';

export interface BodyRegion {
  id: string;
  label: string;
  side: 'left' | 'right' | 'center';
  view: BodyView;
  muscleGroup: MuscleGroup;
  relatedJoints: string[];
  /** SVG polygon points or ellipse coords: [cx, cy, rx, ry] */
  svgCoords: { cx: number; cy: number; rx: number; ry: number };
  /** Anatomical muscle name for label overlay */
  muscleName?: string;
  /** Anatomical bone name for label overlay */
  boneName?: string;
  /** Offset for label text positioning relative to region center */
  labelOffset?: { dx: number; dy: number };
}

// ── Front View Regions ──────────────────────────────────────────────────

const FRONT_REGIONS: BodyRegion[] = [
  // Neck
  { id: 'neck_front', label: 'Neck (Front)', side: 'center', view: 'front', muscleGroup: 'neck', relatedJoints: ['cervical_spine'], svgCoords: { cx: 100, cy: 58, rx: 12, ry: 8 }, muscleName: 'Sternocleidomastoid', boneName: 'Cervical Vertebrae', labelOffset: { dx: 0, dy: -14 } },

  // Shoulders
  { id: 'left_shoulder', label: 'Left Shoulder', side: 'left', view: 'front', muscleGroup: 'shoulder', relatedJoints: ['glenohumeral', 'acromioclavicular'], svgCoords: { cx: 62, cy: 82, rx: 14, ry: 10 }, muscleName: 'Anterior Deltoid', boneName: 'Clavicle / Acromion', labelOffset: { dx: -20, dy: -8 } },
  { id: 'right_shoulder', label: 'Right Shoulder', side: 'right', view: 'front', muscleGroup: 'shoulder', relatedJoints: ['glenohumeral', 'acromioclavicular'], svgCoords: { cx: 138, cy: 82, rx: 14, ry: 10 }, muscleName: 'Anterior Deltoid', boneName: 'Clavicle / Acromion', labelOffset: { dx: 20, dy: -8 } },

  // Chest
  { id: 'chest_left', label: 'Left Chest', side: 'left', view: 'front', muscleGroup: 'chest', relatedJoints: ['sternoclavicular'], svgCoords: { cx: 80, cy: 100, rx: 16, ry: 12 }, muscleName: 'Pectoralis Major', boneName: 'Sternum / Ribs', labelOffset: { dx: -18, dy: 0 } },
  { id: 'chest_right', label: 'Right Chest', side: 'right', view: 'front', muscleGroup: 'chest', relatedJoints: ['sternoclavicular'], svgCoords: { cx: 120, cy: 100, rx: 16, ry: 12 }, muscleName: 'Pectoralis Major', boneName: 'Sternum / Ribs', labelOffset: { dx: 18, dy: 0 } },

  // Arms
  { id: 'left_bicep', label: 'Left Bicep', side: 'left', view: 'front', muscleGroup: 'arm', relatedJoints: ['elbow', 'shoulder'], svgCoords: { cx: 48, cy: 118, rx: 8, ry: 14 }, muscleName: 'Biceps Brachii', boneName: 'Humerus', labelOffset: { dx: -18, dy: 0 } },
  { id: 'right_bicep', label: 'Right Bicep', side: 'right', view: 'front', muscleGroup: 'arm', relatedJoints: ['elbow', 'shoulder'], svgCoords: { cx: 152, cy: 118, rx: 8, ry: 14 }, muscleName: 'Biceps Brachii', boneName: 'Humerus', labelOffset: { dx: 18, dy: 0 } },
  { id: 'left_elbow', label: 'Left Elbow', side: 'left', view: 'front', muscleGroup: 'arm', relatedJoints: ['elbow'], svgCoords: { cx: 44, cy: 138, rx: 6, ry: 6 }, muscleName: 'Brachialis', boneName: 'Olecranon', labelOffset: { dx: -16, dy: 0 } },
  { id: 'right_elbow', label: 'Right Elbow', side: 'right', view: 'front', muscleGroup: 'arm', relatedJoints: ['elbow'], svgCoords: { cx: 156, cy: 138, rx: 6, ry: 6 }, muscleName: 'Brachialis', boneName: 'Olecranon', labelOffset: { dx: 16, dy: 0 } },
  { id: 'left_forearm', label: 'Left Forearm', side: 'left', view: 'front', muscleGroup: 'arm', relatedJoints: ['wrist', 'elbow'], svgCoords: { cx: 40, cy: 158, rx: 7, ry: 14 }, muscleName: 'Forearm Flexors', boneName: 'Radius / Ulna', labelOffset: { dx: -18, dy: 0 } },
  { id: 'right_forearm', label: 'Right Forearm', side: 'right', view: 'front', muscleGroup: 'arm', relatedJoints: ['wrist', 'elbow'], svgCoords: { cx: 160, cy: 158, rx: 7, ry: 14 }, muscleName: 'Forearm Flexors', boneName: 'Radius / Ulna', labelOffset: { dx: 18, dy: 0 } },

  // Core
  { id: 'upper_abs', label: 'Upper Abs', side: 'center', view: 'front', muscleGroup: 'core', relatedJoints: ['thoracic_spine', 'lumbar_spine'], svgCoords: { cx: 100, cy: 122, rx: 14, ry: 10 }, muscleName: 'Rectus Abdominis', boneName: 'Thoracic Spine', labelOffset: { dx: 0, dy: -14 } },
  { id: 'lower_abs', label: 'Lower Abs', side: 'center', view: 'front', muscleGroup: 'core', relatedJoints: ['lumbar_spine', 'hip'], svgCoords: { cx: 100, cy: 145, rx: 14, ry: 10 }, muscleName: 'Transverse Abdominis', boneName: 'Lumbar Spine', labelOffset: { dx: 0, dy: 14 } },
  { id: 'left_oblique', label: 'Left Oblique', side: 'left', view: 'front', muscleGroup: 'core', relatedJoints: ['lumbar_spine'], svgCoords: { cx: 72, cy: 132, rx: 8, ry: 12 }, muscleName: 'External Oblique', boneName: 'Floating Ribs', labelOffset: { dx: -16, dy: 0 } },
  { id: 'right_oblique', label: 'Right Oblique', side: 'right', view: 'front', muscleGroup: 'core', relatedJoints: ['lumbar_spine'], svgCoords: { cx: 128, cy: 132, rx: 8, ry: 12 }, muscleName: 'External Oblique', boneName: 'Floating Ribs', labelOffset: { dx: 16, dy: 0 } },

  // Hips
  { id: 'left_hip_flexor', label: 'Left Hip Flexor', side: 'left', view: 'front', muscleGroup: 'hip', relatedJoints: ['hip', 'lumbar_spine'], svgCoords: { cx: 80, cy: 165, rx: 10, ry: 8 }, muscleName: 'Iliopsoas', boneName: 'Ilium / Femur Head', labelOffset: { dx: -18, dy: 0 } },
  { id: 'right_hip_flexor', label: 'Right Hip Flexor', side: 'right', view: 'front', muscleGroup: 'hip', relatedJoints: ['hip', 'lumbar_spine'], svgCoords: { cx: 120, cy: 165, rx: 10, ry: 8 }, muscleName: 'Iliopsoas', boneName: 'Ilium / Femur Head', labelOffset: { dx: 18, dy: 0 } },

  // Legs
  { id: 'left_quad', label: 'Left Quad', side: 'left', view: 'front', muscleGroup: 'leg', relatedJoints: ['hip', 'knee'], svgCoords: { cx: 82, cy: 198, rx: 12, ry: 22 }, muscleName: 'Quadriceps Femoris', boneName: 'Femur', labelOffset: { dx: -20, dy: 0 } },
  { id: 'right_quad', label: 'Right Quad', side: 'right', view: 'front', muscleGroup: 'leg', relatedJoints: ['hip', 'knee'], svgCoords: { cx: 118, cy: 198, rx: 12, ry: 22 }, muscleName: 'Quadriceps Femoris', boneName: 'Femur', labelOffset: { dx: 20, dy: 0 } },
  { id: 'left_inner_thigh', label: 'Left Inner Thigh', side: 'left', view: 'front', muscleGroup: 'leg', relatedJoints: ['hip', 'knee'], svgCoords: { cx: 92, cy: 200, rx: 6, ry: 16 }, muscleName: 'Adductors', boneName: 'Femur (medial)', labelOffset: { dx: -8, dy: 14 } },
  { id: 'right_inner_thigh', label: 'Right Inner Thigh', side: 'right', view: 'front', muscleGroup: 'leg', relatedJoints: ['hip', 'knee'], svgCoords: { cx: 108, cy: 200, rx: 6, ry: 16 }, muscleName: 'Adductors', boneName: 'Femur (medial)', labelOffset: { dx: 8, dy: 14 } },
  { id: 'left_knee', label: 'Left Knee', side: 'left', view: 'front', muscleGroup: 'leg', relatedJoints: ['knee'], svgCoords: { cx: 84, cy: 230, rx: 8, ry: 8 }, muscleName: 'Patellar Tendon', boneName: 'Patella', labelOffset: { dx: -16, dy: 0 } },
  { id: 'right_knee', label: 'Right Knee', side: 'right', view: 'front', muscleGroup: 'leg', relatedJoints: ['knee'], svgCoords: { cx: 116, cy: 230, rx: 8, ry: 8 }, muscleName: 'Patellar Tendon', boneName: 'Patella', labelOffset: { dx: 16, dy: 0 } },
  { id: 'left_shin', label: 'Left Shin', side: 'left', view: 'front', muscleGroup: 'leg', relatedJoints: ['knee', 'ankle'], svgCoords: { cx: 84, cy: 262, rx: 7, ry: 18 }, muscleName: 'Tibialis Anterior', boneName: 'Tibia / Fibula', labelOffset: { dx: -18, dy: 0 } },
  { id: 'right_shin', label: 'Right Shin', side: 'right', view: 'front', muscleGroup: 'leg', relatedJoints: ['knee', 'ankle'], svgCoords: { cx: 116, cy: 262, rx: 7, ry: 18 }, muscleName: 'Tibialis Anterior', boneName: 'Tibia / Fibula', labelOffset: { dx: 18, dy: 0 } },

  // Feet
  { id: 'left_ankle_front', label: 'Left Ankle', side: 'left', view: 'front', muscleGroup: 'foot', relatedJoints: ['ankle'], svgCoords: { cx: 84, cy: 290, rx: 6, ry: 6 }, muscleName: 'Peroneals', boneName: 'Talus / Malleolus', labelOffset: { dx: -14, dy: 0 } },
  { id: 'right_ankle_front', label: 'Right Ankle', side: 'right', view: 'front', muscleGroup: 'foot', relatedJoints: ['ankle'], svgCoords: { cx: 116, cy: 290, rx: 6, ry: 6 }, muscleName: 'Peroneals', boneName: 'Talus / Malleolus', labelOffset: { dx: 14, dy: 0 } },
];

// ── Back View Regions ───────────────────────────────────────────────────

const BACK_REGIONS: BodyRegion[] = [
  // Neck/Upper back
  { id: 'neck_back', label: 'Neck (Back)', side: 'center', view: 'back', muscleGroup: 'neck', relatedJoints: ['cervical_spine'], svgCoords: { cx: 100, cy: 55, rx: 10, ry: 8 }, muscleName: 'Upper Trapezius', boneName: 'C1–C7 Vertebrae', labelOffset: { dx: 0, dy: -14 } },
  { id: 'upper_traps_left', label: 'Left Upper Trap', side: 'left', view: 'back', muscleGroup: 'back_muscles', relatedJoints: ['cervical_spine', 'shoulder'], svgCoords: { cx: 78, cy: 72, rx: 12, ry: 8 }, muscleName: 'Trapezius (Upper)', boneName: 'Scapula (Superior)', labelOffset: { dx: -20, dy: 0 } },
  { id: 'upper_traps_right', label: 'Right Upper Trap', side: 'right', view: 'back', muscleGroup: 'back_muscles', relatedJoints: ['cervical_spine', 'shoulder'], svgCoords: { cx: 122, cy: 72, rx: 12, ry: 8 }, muscleName: 'Trapezius (Upper)', boneName: 'Scapula (Superior)', labelOffset: { dx: 20, dy: 0 } },

  // Shoulders (rear)
  { id: 'left_rear_delt', label: 'Left Rear Delt', side: 'left', view: 'back', muscleGroup: 'shoulder', relatedJoints: ['glenohumeral'], svgCoords: { cx: 60, cy: 85, rx: 10, ry: 8 }, muscleName: 'Posterior Deltoid', boneName: 'Scapular Spine', labelOffset: { dx: -20, dy: 0 } },
  { id: 'right_rear_delt', label: 'Right Rear Delt', side: 'right', view: 'back', muscleGroup: 'shoulder', relatedJoints: ['glenohumeral'], svgCoords: { cx: 140, cy: 85, rx: 10, ry: 8 }, muscleName: 'Posterior Deltoid', boneName: 'Scapular Spine', labelOffset: { dx: 20, dy: 0 } },
  { id: 'left_rotator_cuff', label: 'Left Rotator Cuff', side: 'left', view: 'back', muscleGroup: 'shoulder', relatedJoints: ['glenohumeral', 'scapulothoracic'], svgCoords: { cx: 68, cy: 92, rx: 8, ry: 8 }, muscleName: 'Infraspinatus / Teres', boneName: 'Scapula (Infraspinous)', labelOffset: { dx: -22, dy: 6 } },
  { id: 'right_rotator_cuff', label: 'Right Rotator Cuff', side: 'right', view: 'back', muscleGroup: 'shoulder', relatedJoints: ['glenohumeral', 'scapulothoracic'], svgCoords: { cx: 132, cy: 92, rx: 8, ry: 8 }, muscleName: 'Infraspinatus / Teres', boneName: 'Scapula (Infraspinous)', labelOffset: { dx: 22, dy: 6 } },

  // Mid back
  { id: 'mid_back_left', label: 'Left Mid Back', side: 'left', view: 'back', muscleGroup: 'back_muscles', relatedJoints: ['thoracic_spine'], svgCoords: { cx: 82, cy: 108, rx: 12, ry: 12 }, muscleName: 'Rhomboids / Mid Trap', boneName: 'T1–T12 Vertebrae', labelOffset: { dx: -22, dy: 0 } },
  { id: 'mid_back_right', label: 'Right Mid Back', side: 'right', view: 'back', muscleGroup: 'back_muscles', relatedJoints: ['thoracic_spine'], svgCoords: { cx: 118, cy: 108, rx: 12, ry: 12 }, muscleName: 'Rhomboids / Mid Trap', boneName: 'T1–T12 Vertebrae', labelOffset: { dx: 22, dy: 0 } },

  // Lower back
  { id: 'lower_back_left', label: 'Left Lower Back', side: 'left', view: 'back', muscleGroup: 'back_muscles', relatedJoints: ['lumbar_spine', 'sacroiliac'], svgCoords: { cx: 86, cy: 140, rx: 10, ry: 12 }, muscleName: 'Erector Spinae', boneName: 'L1–L5 Vertebrae', labelOffset: { dx: -22, dy: 0 } },
  { id: 'lower_back_right', label: 'Right Lower Back', side: 'right', view: 'back', muscleGroup: 'back_muscles', relatedJoints: ['lumbar_spine', 'sacroiliac'], svgCoords: { cx: 114, cy: 140, rx: 10, ry: 12 }, muscleName: 'Erector Spinae', boneName: 'L1–L5 Vertebrae', labelOffset: { dx: 22, dy: 0 } },

  // Arms (back)
  { id: 'left_tricep', label: 'Left Tricep', side: 'left', view: 'back', muscleGroup: 'arm', relatedJoints: ['elbow', 'shoulder'], svgCoords: { cx: 48, cy: 118, rx: 8, ry: 14 }, muscleName: 'Triceps Brachii', boneName: 'Humerus (posterior)', labelOffset: { dx: -18, dy: 0 } },
  { id: 'right_tricep', label: 'Right Tricep', side: 'right', view: 'back', muscleGroup: 'arm', relatedJoints: ['elbow', 'shoulder'], svgCoords: { cx: 152, cy: 118, rx: 8, ry: 14 }, muscleName: 'Triceps Brachii', boneName: 'Humerus (posterior)', labelOffset: { dx: 18, dy: 0 } },

  // Glutes
  { id: 'left_glute', label: 'Left Glute', side: 'left', view: 'back', muscleGroup: 'hip', relatedJoints: ['hip', 'sacroiliac'], svgCoords: { cx: 84, cy: 168, rx: 12, ry: 10 }, muscleName: 'Gluteus Maximus', boneName: 'Sacrum / Ilium', labelOffset: { dx: -20, dy: 0 } },
  { id: 'right_glute', label: 'Right Glute', side: 'right', view: 'back', muscleGroup: 'hip', relatedJoints: ['hip', 'sacroiliac'], svgCoords: { cx: 116, cy: 168, rx: 12, ry: 10 }, muscleName: 'Gluteus Maximus', boneName: 'Sacrum / Ilium', labelOffset: { dx: 20, dy: 0 } },

  // Legs (back)
  { id: 'left_hamstring', label: 'Left Hamstring', side: 'left', view: 'back', muscleGroup: 'leg', relatedJoints: ['hip', 'knee'], svgCoords: { cx: 82, cy: 200, rx: 10, ry: 22 }, muscleName: 'Hamstrings', boneName: 'Femur (posterior)', labelOffset: { dx: -20, dy: 0 } },
  { id: 'right_hamstring', label: 'Right Hamstring', side: 'right', view: 'back', muscleGroup: 'leg', relatedJoints: ['hip', 'knee'], svgCoords: { cx: 118, cy: 200, rx: 10, ry: 22 }, muscleName: 'Hamstrings', boneName: 'Femur (posterior)', labelOffset: { dx: 20, dy: 0 } },
  { id: 'left_calf', label: 'Left Calf', side: 'left', view: 'back', muscleGroup: 'leg', relatedJoints: ['knee', 'ankle'], svgCoords: { cx: 82, cy: 258, rx: 8, ry: 18 }, muscleName: 'Gastrocnemius / Soleus', boneName: 'Tibia / Fibula', labelOffset: { dx: -22, dy: 0 } },
  { id: 'right_calf', label: 'Right Calf', side: 'right', view: 'back', muscleGroup: 'leg', relatedJoints: ['knee', 'ankle'], svgCoords: { cx: 118, cy: 258, rx: 8, ry: 18 }, muscleName: 'Gastrocnemius / Soleus', boneName: 'Tibia / Fibula', labelOffset: { dx: 22, dy: 0 } },

  // Achilles
  { id: 'left_achilles', label: 'Left Achilles', side: 'left', view: 'back', muscleGroup: 'foot', relatedJoints: ['ankle'], svgCoords: { cx: 82, cy: 285, rx: 5, ry: 6 }, muscleName: 'Achilles Tendon', boneName: 'Calcaneus', labelOffset: { dx: -14, dy: 0 } },
  { id: 'right_achilles', label: 'Right Achilles', side: 'right', view: 'back', muscleGroup: 'foot', relatedJoints: ['ankle'], svgCoords: { cx: 118, cy: 285, rx: 5, ry: 6 }, muscleName: 'Achilles Tendon', boneName: 'Calcaneus', labelOffset: { dx: 14, dy: 0 } },
];

// ── Combined export ─────────────────────────────────────────────────────

export const ALL_BODY_REGIONS: BodyRegion[] = [...FRONT_REGIONS, ...BACK_REGIONS];

export const FRONT_VIEW_REGIONS = FRONT_REGIONS;
export const BACK_VIEW_REGIONS = BACK_REGIONS;

export function getRegionById(id: string): BodyRegion | undefined {
  return ALL_BODY_REGIONS.find(r => r.id === id);
}

export function getRegionsByView(view: BodyView): BodyRegion[] {
  return ALL_BODY_REGIONS.filter(r => r.view === view);
}

/**
 * Severity → color mapping (Slice 3, B8). The old scale used two
 * near-identical blues (#50A0F0 vs #60C0F0 — indistinguishable at a glance
 * and worthless to color-blind users). New scale is NON-adjacent and
 * tokenized (Rule 6); color is also no longer the only channel — the map
 * adds numeric pills and dash-pattern strokes per tier.
 */
export type SeverityTier = 'severe' | 'moderate' | 'mild';

export function getSeverityTier(painLevel: number): SeverityTier {
  if (painLevel >= 7) return 'severe';
  if (painLevel >= 4) return 'moderate';
  return 'mild';
}

export function getSeverityColor(painLevel: number): string {
  const tier = getSeverityTier(painLevel);
  if (tier === 'severe') return 'var(--glow-accent, #8B5CF6)';    // Wing Purple — filled + halo + pulse
  if (tier === 'moderate') return 'var(--accent-luxury, #C6A84B)'; // Gilded Fern — dashed stroke
  return 'var(--accent-primary, #60C0F0)';                         // Ice Wing — outline
}

/** Pain type labels */
export const PAIN_TYPE_OPTIONS = [
  { value: 'sharp', label: 'Sharp' },
  { value: 'dull', label: 'Dull' },
  { value: 'aching', label: 'Aching' },
  { value: 'burning', label: 'Burning' },
  { value: 'tingling', label: 'Tingling' },
  { value: 'numbness', label: 'Numbness' },
  { value: 'stiffness', label: 'Stiffness' },
  { value: 'throbbing', label: 'Throbbing' },
] as const;

/** Common aggravating movements for multi-select */
export const AGGRAVATING_MOVEMENTS = [
  'Squatting', 'Deadlifting', 'Overhead Press', 'Bench Press',
  'Pull-ups', 'Rowing', 'Running', 'Lunging',
  'Twisting/Rotation', 'Bending Forward', 'Reaching Overhead',
  'Sitting for Long Periods', 'Standing for Long Periods',
  'Walking', 'Climbing Stairs',
] as const;

/** Common relieving factors for multi-select */
export const RELIEVING_FACTORS = [
  'Ice', 'Heat', 'Stretching', 'Rest', 'Massage',
  'Foam Rolling', 'Movement/Walking', 'NSAIDs/Medication',
  'Compression', 'Elevation',
] as const;
