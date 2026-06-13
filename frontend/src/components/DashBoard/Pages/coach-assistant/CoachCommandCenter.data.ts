/**
 * FILE: CoachCommandCenter.data.ts
 * PURPOSE: Static operator-console state for the admin Swan Coach Command Center.
 *
 * The command center intentionally models review-gated draft preparation only.
 * No entry in this file implies automatic client-facing writes.
 */

export type CommandLogEntry = {
  id: string;
  actor: 'system' | 'operator' | 'coach';
  label: string;
  body: string;
  attachments?: string[];
  commandConfirmation?: CommandLogConfirmation;
  commandResult?: CommandLogResult;
};

export type CommandLogConfirmation = {
  operationId: string | null;
  command: string;
  params: Record<string, unknown>;
  client: { id?: number; firstName?: string; lastName?: string } | null;
  details: Record<string, unknown> | null;
  isDestructive: boolean;
};

export type CommandLogResult = {
  command: string;
  result: Record<string, unknown> | null;
  client: { id?: number; firstName?: string } | null;
  message?: string;
};

export const INITIAL_COMMAND_LOGS: CommandLogEntry[] = [
  {
    id: 'transcript-parsing',
    actor: 'system',
    label: 'transcript parsing',
    body: 'PLAUD audio upload is parsing. Low-confidence segments remain blocked from draft conversion until reviewed.',
    attachments: ['PLAUD_AUDIO_0513_0940.wav', 'parse-progress 82%'],
  },
  {
    id: 'operator-command',
    actor: 'operator',
    label: 'command',
    body: 'Summarize selected client context and prepare blockers before any draft work.',
  },
  {
    id: 'prepared-recommendation',
    actor: 'coach',
    label: 'prepared recommendation',
    body: 'Summary prepared. Recommendation is ready for operator review: confirm shoulder note, check duplicate-risk log, then approve or revise the draft plan.',
    attachments: ['draft_summary.md', 'operator approval pending'],
  },
];
