/**
 * FILE: CoachCommandCenter.data.ts
 * PURPOSE: Static operator-console state for the admin Swan Coach Command Center.
 *
 * The command center intentionally models review-gated draft preparation only.
 * No entry in this file implies automatic client-facing writes.
 */

export type CommandThread = {
  id: string;
  title: string;
  meta: string;
  prompt: string;
  clientStatus: string;
};

export type WorkflowCard = {
  id: string;
  chip: 'cyan' | 'purple' | 'gold' | 'green' | 'red';
  label: string;
  title: string;
  copy: string;
  prompt: string;
};

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

export const COMMAND_THREADS: CommandThread[] = [
  {
    id: 'plaid-intake-review',
    title: 'PLAUD intake review',
    meta: 'Client A-104 - 12 min ago - processing',
    prompt: 'Review the active PLAUD intake for Client A-104 and list draft blockers.',
    clientStatus: 'Client A-104 - parsing 82% - approval gate',
  },
  {
    id: 'duplicate-risk-check',
    title: 'Duplicate risk check',
    meta: 'Client B-217 - 24 min ago - hold',
    prompt: 'Review duplicate-risk logs for Client B-217 before any draft approval.',
    clientStatus: 'Client B-217 - duplicate-risk hold',
  },
  {
    id: 'four-week-block-draft',
    title: '4-week block draft',
    meta: 'Client C-309 - ready for approval',
    prompt: 'Open Client C-309 ready 4-week block draft for operator approval review.',
    clientStatus: 'Client C-309 - ready draft - approval pending',
  },
];

export const COMMAND_WORKFLOWS: WorkflowCard[] = [
  {
    id: 'review-intake',
    chip: 'cyan',
    label: 'intake',
    title: 'Review next intake',
    copy: 'Open the highest-priority intake and list draft blockers.',
    prompt: 'Review next intake',
  },
  {
    id: 'build-block',
    chip: 'purple',
    label: 'draft',
    title: 'Build next 4-week block',
    copy: 'Prepare a draft block from selected client context.',
    prompt: 'Build next 4-week block',
  },
  {
    id: 'summarize-context',
    chip: 'cyan',
    label: 'context',
    title: 'Summarize selected client last 30 days',
    copy: 'Review attendance, notes, holds, and recent draft history.',
    prompt: 'Summarize selected client last 30 days',
  },
  {
    id: 'convert-transcript',
    chip: 'purple',
    label: 'audio',
    title: 'Convert transcript into workout draft',
    copy: 'Use parsed transcript after low-confidence segments are checked.',
    prompt: 'Convert transcript into workout draft',
  },
  {
    id: 'resolve-holds',
    chip: 'gold',
    label: 'holds',
    title: 'Resolve client holds',
    copy: 'Sort confirmation and clarification holds for operator action.',
    prompt: 'Resolve client holds',
  },
  {
    id: 'duplicate-risk',
    chip: 'gold',
    label: 'risk',
    title: 'Review duplicate-risk logs',
    copy: 'Inspect potential duplicate drafts before approval.',
    prompt: 'Review duplicate-risk logs',
  },
  {
    id: 'follow-up',
    chip: 'green',
    label: 'follow-up',
    title: 'Prepare session follow-up',
    copy: 'Draft a client-facing note for approval.',
    prompt: 'Prepare session follow-up',
  },
  {
    id: 'audio-recovery',
    chip: 'red',
    label: 'recovery',
    title: 'Inspect failed audio intake',
    copy: 'Recover failed transcript uploads and parse errors.',
    prompt: 'Inspect failed audio intake',
  },
];

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
