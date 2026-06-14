import type { CommandLogConfirmation, CommandLogEntry } from './CoachCommandCenter.data';

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

export type FormattedLogBody = {
  leadParagraphs: string[];
  steps: LogStep[];
  bullets: string[];
  variants?: LogStyleVariant[];
  structuredPacket?: string;
};

export type CoachCommandLogEntryProps = {
  entry: CommandLogEntry;
  onCancelCommand?: (confirmation: CommandLogConfirmation) => Promise<void>;
  onConfirmCommand?: (confirmation: CommandLogConfirmation) => Promise<{ success: boolean; error?: string }>;
};
