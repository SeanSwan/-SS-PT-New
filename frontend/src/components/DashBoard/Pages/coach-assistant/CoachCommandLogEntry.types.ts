import type { CommandLogConfirmation, CommandLogEntry } from './CoachCommandCenter.data';

export type LogActor = CommandLogEntry['actor'];

export type LogStep = {
  number: string;
  title: string;
  body: string;
};

export type FormattedLogBody = {
  leadParagraphs: string[];
  steps: LogStep[];
  structuredPacket?: string;
};

export type CoachCommandLogEntryProps = {
  entry: CommandLogEntry;
  onCancelCommand?: (confirmation: CommandLogConfirmation) => Promise<void>;
  onConfirmCommand?: (confirmation: CommandLogConfirmation) => Promise<{ success: boolean; error?: string }>;
};
