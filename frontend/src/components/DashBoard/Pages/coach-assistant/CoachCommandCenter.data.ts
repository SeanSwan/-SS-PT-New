/**
 * FILE: CoachCommandCenter.data.ts
 * PURPOSE: Command log data types for the admin Swan Coach Command Center.
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

export const INITIAL_COMMAND_LOGS: CommandLogEntry[] = [];
