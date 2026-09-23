/**
 * MODULE: trainingWorkflowModes
 * PURPOSE: Two-level IA for the Client Hub Training tab - three workflow modes
 *          (Today / Plan / History & Inputs) that group the seven preserved
 *          training panel sections without breaking `trainingSection=` deep links.
 * OWNER: Clients & Team training workspace (TrainingTabContent).
 *
 * CONTRACT: The seven TrainingSection ids stay the URL/query contract used by
 * quick actions, view-as CTAs, and coach handoffs. Modes are DERIVED from the
 * active section - the section remains the single source of truth.
 */

import type { TrainingSection } from './TrainingTabSectionContent';
import type { ClientHubAudience } from '../clientHubAudience';

export type TrainingWorkflowMode = 'today' | 'plan' | 'inputs';

export interface TrainingModeConfig {
  id: TrainingWorkflowMode;
  label: string;
  shortLabel: string;
  sublabel: string;
  defaultSection: TrainingSection;
  sections: TrainingSection[];
}

export interface TrainingSectionChip {
  id: TrainingSection;
  label: string;
  shortLabel: string;
}

export const TRAINING_WORKFLOW_MODES: TrainingModeConfig[] = [
  {
    id: 'today',
    label: 'Today',
    shortLabel: 'Today',
    sublabel: "Log & coach today's session",
    defaultSection: 'logger',
    sections: ['logger'],
  },
  {
    id: 'plan',
    label: 'Plan',
    shortLabel: 'Plan',
    sublabel: 'Plan vault, builder & Coach drafts',
    defaultSection: 'plans',
    sections: ['plans', 'architect', 'copilot'],
  },
  {
    id: 'inputs',
    label: 'History & Inputs',
    shortLabel: 'History',
    sublabel: 'Proof, imports & PLAUD review',
    defaultSection: 'history',
    sections: ['history', 'import', 'plaud'],
  },
];

export const TRAINING_SECTION_CHIPS: Record<TrainingSection, TrainingSectionChip> = {
  logger: { id: 'logger', label: 'Log Workout', shortLabel: 'Log' },
  plans: { id: 'plans', label: 'Plan Library', shortLabel: 'Library' },
  architect: { id: 'architect', label: 'Build Plan', shortLabel: 'Build' },
  copilot: { id: 'copilot', label: 'Coach Draft', shortLabel: 'Draft' },
  history: { id: 'history', label: 'Workout History', shortLabel: 'History' },
  import: { id: 'import', label: 'History Import', shortLabel: 'Import' },
  plaud: { id: 'plaud', label: 'PLAUD Uploads', shortLabel: 'PLAUD' },
};

const MODE_BY_SECTION: Record<TrainingSection, TrainingWorkflowMode> = TRAINING_WORKFLOW_MODES
  .reduce((accumulator, mode) => {
    mode.sections.forEach((section) => {
      accumulator[section] = mode.id;
    });
    return accumulator;
  }, {} as Record<TrainingSection, TrainingWorkflowMode>);

export const getTrainingModeForSection = (section: TrainingSection): TrainingWorkflowMode => (
  MODE_BY_SECTION[section] ?? 'today'
);

export const getTrainingModeConfig = (mode: TrainingWorkflowMode): TrainingModeConfig => (
  TRAINING_WORKFLOW_MODES.find((candidate) => candidate.id === mode) ?? TRAINING_WORKFLOW_MODES[0]
);

/**
 * The History & Inputs lane calls /api/admin/clients/:id/workouts. The backend
 * authorizes that route for BOTH admin and trainer (adminWorkoutLoggerRoutes.mjs
 * -> router.use(authorize(['admin', 'trainer']))) WITH a per-client
 * ensureClientAccess assignment guard, so it is already safe to expose to trainers
 * server-side. Hiding it from the trainer surface here is a deliberate PRODUCT/UX
 * choice (Today + Plan is the focused trainer flow) — NOT a security boundary and
 * NOT a missing server-side gate. Do not treat this UI hide as the access control:
 * the per-request assignment guard on the backend is the real boundary. (HR-006-01)
 */
const TRAINER_HIDDEN_MODES: readonly TrainingWorkflowMode[] = ['inputs'];

export const getTrainingModesForAudience = (
  audience: ClientHubAudience,
): TrainingModeConfig[] => (
  audience === 'trainer'
    ? TRAINING_WORKFLOW_MODES.filter((mode) => !TRAINER_HIDDEN_MODES.includes(mode.id))
    : TRAINING_WORKFLOW_MODES
);

export const isTrainingSectionAllowedForAudience = (
  audience: ClientHubAudience,
  section: TrainingSection,
): boolean => getTrainingModesForAudience(audience)
  .some((mode) => mode.sections.includes(section));

export const coerceTrainingSectionForAudience = (
  audience: ClientHubAudience,
  section: TrainingSection,
): TrainingSection => (
  isTrainingSectionAllowedForAudience(audience, section) ? section : 'logger'
);
