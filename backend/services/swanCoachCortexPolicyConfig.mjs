export const FOCUS_AREA_ALLOWLIST = new Set([
  'shoulders', 'shoulder', 'hips', 'hip', 'ankles', 'ankle', 'feet', 'foot',
  'arches', 'toes', 'calves', 'calf', 'elbows', 'elbow', 'hands', 'hand',
  'forearms', 'forearm', 'wrists', 'wrist', 'neck', 'back', 'lats', 'pecs',
  'chest', 'thoracic spine', 'low back', 'knees', 'knee', 'achilles', 'trunk',
]);

export const READINESS_DESCRIPTOR_ALLOWLIST = new Set([
  'tight', 'tightness', 'stiff', 'stiffness', 'sore', 'soreness', 'guarded',
  'limited', 'restricted', 'reduced', 'poor', 'normal', 'full', 'mild',
  'moderate', 'overworked', 'fatigued', 'tender', 'mobility',
]);

export const READINESS_LEVELS = [
  {
    level: 'green',
    label: 'Green',
    rule: 'Normal tightness or soreness improves with warmup, release, rolling, and controlled range of motion.',
  },
  {
    level: 'yellow',
    label: 'Yellow',
    rule: 'Overworked or guarded tissue requires reduced load, controlled range, recovery work, and no aggressive failure work.',
  },
  {
    level: 'red',
    label: 'Red',
    rule: 'Sharp pain, swelling, numbness, tingling, major weakness, recent injury, or non-improving symptoms require stopping provocative work and referral or clearance.',
  },
];