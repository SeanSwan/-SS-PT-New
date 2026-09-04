import type { CommandLogConfirmation, CommandLogEntry } from './CoachCommandCenter.data';
import type { ConfirmResult } from '../../../../hooks/useCoachCommand';

export type LogActor = CommandLogEntry['actor'];

export type LogStep = {
  number: string;
  title: string;
  body: string;
};

export type LogStyleVariantKey = 'science' | 'keep100';

export type LogStyleVariant = {
  key: LogStyleVariantKey;
  label: string;
  body: FormattedLogBody;
};

export type LogWorkoutSection = {
  title: string;
  bullets: string[];
};

export type FormattedLogBody = {
  leadParagraphs: string[];
  steps: LogStep[];
  bullets: string[];
  sections?: LogWorkoutSection[];
  variants?: LogStyleVariant[];
  structuredPacket?: string;
};

export type CoachCommandLogEntryProps = {
  entry: CommandLogEntry;
  onCancelCommand?: (
    confirmation: CommandLogConfirmation,
    options?: { alreadyCancelled?: boolean },
  ) => Promise<void>;
  onConfirmCommand?: (
    confirmation: CommandLogConfirmation,
    result?: ConfirmResult,
  ) => Promise<{ success: boolean; error?: string }>;
  onRetryMessage?: (message: string) => void;
  onSpeak?: (text: string) => void;
  workoutLoggerRoute?: string | null;
  workoutLoggerScopeLabel?: string | null;
};
