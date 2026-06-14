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
    id: 'coach-welcome',
    actor: 'coach',
    label: 'Swan Coach',
    body: 'Ready when you are. Talk or type — log a workout, onboard a client, or pick up a past conversation. I prepare each action and wait for your confirmation before anything is saved.',
  },
];
