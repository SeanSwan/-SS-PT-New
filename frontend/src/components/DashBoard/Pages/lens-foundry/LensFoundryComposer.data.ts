export type LensPresetId = 'creator-wedge' | 'operator-console' | 'portfolio-atlas';
export type ComposerView = 'canvas' | 'packet' | 'flow';

export interface LensPreset {
  id: LensPresetId;
  label: string;
  eyebrow: string;
  headline: string;
  subline: string;
  audience: string;
  surface: string;
  motion: string;
  palette: string[];
  tags: string[];
  fableDirectives: string[];
  hermesSteps: string[];
  promotionChecks: string[];
}

export interface ComposerState {
  presetId: LensPresetId;
  view: ComposerView;
  intensity: number;
  density: number;
  trustGate: boolean;
}

export const lensPresets: LensPreset[] = [
  {
    id: 'creator-wedge',
    label: 'Creator Wedge',
    eyebrow: 'SwanStudios Lens #1',
    headline: 'Creator command surface',
    subline: 'A premium control room for offers, proofs, and launch-ready design variants.',
    audience: 'Admin and founder operator',
    surface: 'Campaign builder, offer lab, proof gallery',
    motion: 'FLIP transitions with reduced-motion parity',
    palette: ['var(--accent-primary, #60C0F0)', 'var(--accent-secondary, #8B5CF6)', 'var(--accent-tertiary, #C6A84B)'],
    tags: ['landing pages', 'offer design', 'proof cards'],
    fableDirectives: [
      'Prioritize first-viewport product clarity over decorative framing.',
      'Use a dense but elegant command layout for repeated daily use.',
      'Keep generated variants tied to Swan tokens and promotion receipts.',
    ],
    hermesSteps: [
      'Capture goal and audience.',
      'Generate a LensDocument draft.',
      'Queue review receipts before any SS-PT promotion.',
    ],
    promotionChecks: ['No PII', 'Swan token match', 'Mobile safe', 'Human approved'],
  },
  {
    id: 'operator-console',
    label: 'Operator Console',
    eyebrow: 'Hermes Flow',
    headline: 'Trust-gated operator flow',
    subline: 'An approval-first workspace for commands, receipts, and Fable direction packets.',
    audience: 'Sean-only system operator',
    surface: 'Command review, audit receipts, action queue',
    motion: 'Step morphs, no background loops',
    palette: ['var(--accent-muted, #4070C0)', 'var(--accent-primary, #60C0F0)', 'var(--text-primary, #E0ECF4)'],
    tags: ['Hermes', 'approval gates', 'receipts'],
    fableDirectives: [
      'Make command state readable at a glance before adding flourish.',
      'Separate draft, approval, and execution zones visually.',
      'Expose the risk tier on every operator-facing decision.',
    ],
    hermesSteps: [
      'Classify command tier.',
      'Render approval copy and rollback note.',
      'Hold T3/T4 actions for explicit human approval.',
    ],
    promotionChecks: ['Tier label', 'Receipt copy', 'Rollback note', 'Kill switch'],
  },
  {
    id: 'portfolio-atlas',
    label: 'Portfolio Atlas',
    eyebrow: 'Design Brain',
    headline: 'Visual style atlas',
    subline: 'A living gallery for page archetypes, motion studies, and reusable design language.',
    audience: 'Designer, builder, and reviewer',
    surface: 'Style library, morph studies, wireframe packets',
    motion: 'Gallery morphs with snap-to-grid staging',
    palette: ['var(--accent-tertiary, #C6A84B)', 'var(--accent-primary, #60C0F0)', 'var(--accent-secondary, #8B5CF6)'],
    tags: ['portfolio', 'wireframes', 'design memory'],
    fableDirectives: [
      'Show real page intent, not generic inspiration boards.',
      'Attach each visual study to a reusable production destination.',
      'Keep contrast, touch targets, and responsiveness visible in the packet.',
    ],
    hermesSteps: [
      'Index the style study.',
      'Attach source docs and constraints.',
      'Create a promotion task only after review passes.',
    ],
    promotionChecks: ['Source linked', 'Responsive proof', 'Contrast pass', 'Route target'],
  },
];

export const composerViews: { id: ComposerView; label: string }[] = [
  { id: 'canvas', label: 'Canvas' },
  { id: 'packet', label: 'Fable Packet' },
  { id: 'flow', label: 'Hermes Flow' },
];

export const getLensPreset = (id: LensPresetId) =>
  lensPresets.find((preset) => preset.id === id) || lensPresets[0];

export const getReadinessScore = (state: ComposerState) => {
  const trustScore = state.trustGate ? 24 : 4;
  const motionScore = Math.max(0, 24 - Math.abs(state.intensity - 68) / 2);
  const densityScore = Math.max(0, 24 - Math.abs(state.density - 58) / 2);
  return Math.round(Math.min(100, 28 + trustScore + motionScore + densityScore));
};

export const buildLensBrief = (preset: LensPreset, state: ComposerState) => [
  `Lens: ${preset.label}`,
  `Surface: ${preset.surface}`,
  `Audience: ${preset.audience}`,
  `Motion budget: ${preset.motion}`,
  `Intensity: ${state.intensity}`,
  `Density: ${state.density}`,
  `Trust gate: ${state.trustGate ? 'required' : 'not ready'}`,
  `Fable direction: ${preset.fableDirectives.join(' ')}`,
  `Hermes flow: ${preset.hermesSteps.join(' ')}`,
].join('\n');

