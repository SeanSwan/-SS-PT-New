export const PET_SPECIES = {
  crystal_dragon: {
    name: 'Crystal Dragon',
    element: 'ice',
    affinity: 'athletic',
    baseColor: '#60C0F0',
    accentColor: '#8B5CF6',
    description: 'A fierce dragon forged from crystalline ice. Thrives on physical challenge.',
  },
  iron_wolf: {
    name: 'Iron Wolf',
    element: 'steel',
    affinity: 'discipline',
    baseColor: '#C0C0C0',
    accentColor: '#878681',
    description: 'A loyal wolf with iron resolve. Rewards consistency above all.',
  },
  ember_phoenix: {
    name: 'Ember Phoenix',
    element: 'fire',
    affinity: 'vitality',
    baseColor: '#F59E0B',
    accentColor: '#EF4444',
    description: 'A phoenix reborn from ember. Fueled by recovery and self-care.',
  },
  frost_swan: {
    name: 'Frost Swan',
    element: 'frost',
    affinity: 'recovery',
    baseColor: '#E0ECF4',
    accentColor: '#60C0F0',
    description: 'A graceful swan of living frost. Elegant strength through balance.',
  },
  shadow_panther: {
    name: 'Shadow Panther',
    element: 'shadow',
    affinity: 'social',
    baseColor: '#8B5CF6',
    accentColor: '#C6A84B',
    description: 'A sleek panther of shadow and gold. Draws power from community.',
  },
};

export const EVOLUTION_STAGES = [
  { stage: 0, name: 'Egg', minLevel: 0, bodyScale: 0.5, features: [] },
  { stage: 1, name: 'Hatchling', minLevel: 1, bodyScale: 0.65, features: ['eyes', 'body'] },
  { stage: 2, name: 'Juvenile', minLevel: 5, bodyScale: 0.8, features: ['eyes', 'body', 'tail'] },
  { stage: 3, name: 'Adult', minLevel: 15, bodyScale: 1.0, features: ['eyes', 'body', 'tail', 'wings'] },
  { stage: 4, name: 'Elder', minLevel: 30, bodyScale: 1.1, features: ['eyes', 'body', 'tail', 'wings', 'crown'] },
  { stage: 5, name: 'Mythic', minLevel: 60, bodyScale: 1.2, features: ['eyes', 'body', 'tail', 'wings', 'crown', 'aura'] },
];

export const PET_MOODS = [
  { id: 'ecstatic', minAvg: 85, emoji: '\u2728', animation: 'bounce', description: 'Radiating joy' },
  { id: 'happy', minAvg: 70, emoji: '\u{1F60A}', animation: 'wiggle', description: 'Content and healthy' },
  { id: 'content', minAvg: 55, emoji: '\u{1F642}', animation: 'idle', description: 'Doing okay' },
  { id: 'tired', minAvg: 40, emoji: '\u{1F610}', animation: 'droop', description: 'Needs attention' },
  { id: 'sad', minAvg: 25, emoji: '\u{1F622}', animation: 'shiver', description: 'Feeling neglected' },
  { id: 'critical', minAvg: 0, emoji: '\u{1F480}', animation: 'flicker', description: 'Fading away...' },
];

export const APPEARANCE_TRIGGERS = {
  strength_workouts: { thresholds: [5, 20, 50, 100], mods: ['iron_plates', 'steel_armor', 'crystal_armor', 'mythic_armor'] },
  cardio_workouts: { thresholds: [5, 20, 50, 100], mods: ['speed_lines', 'wind_trail', 'lightning_wings', 'sonic_aura'] },
  streak_days: { thresholds: [7, 30, 90, 365], mods: ['faint_glow', 'steady_glow', 'bright_aura', 'legendary_flame'] },
  social_actions: { thresholds: [10, 50, 100, 200], mods: ['collar', 'cape', 'crown_jewel', 'royal_mantle'] },
  personal_records: { thresholds: [1, 5, 15, 30], mods: ['small_blade', 'longsword', 'crystal_lance', 'mythic_weapon'] },
};
