/**
 * FILE: CoachCommandCenter.data.ts
 * PURPOSE: Command log data types for the admin Swan Coach Command Center.
 *
 * The command center intentionally models review-gated draft preparation only.
 * No entry in this file implies automatic client-facing writes.
 */

import type { CoachActionProposal } from './SwanCoachTypes';

export type CommandLogAccessHandoff = {
  credentialMode: 'claim_link_ready' | 'claim_link_needed' | 'reset_link_sent' | 'reset_link_ready' | 'reset_link_needed' | 'reset_link_unavailable';
  claimCode?: string | null;
  claimUrl?: string | null;
  resetUrl?: string | null;
  resetExpiresAt?: string | null;
  resetEmailSent?: boolean;
  credentialIssue?: 'reset_link_unavailable' | string;
  clientName?: string;
  clientSource?: string | null;
};

export type CommandLogEntry = {
  id: string;
  actor: 'system' | 'operator' | 'coach';
  label: string;
  body: string;
  /** ISO timestamp of when the entry landed in the transcript. */
  at?: string;
  /** Original operator text; present only on failed sends that can be retried. */
  retryMessage?: string;
  attachments?: string[];
  commandConfirmation?: CommandLogConfirmation;
  commandResult?: CommandLogResult;
  accessHandoff?: CommandLogAccessHandoff;
  /** Chat-lane action proposals (review-gated confirm cards) carried from message metadata. */
  proposals?: CoachActionProposal[];
};

export type CommandLogConfirmation = {
  operationId: string | null;
  command: string;
  params: Record<string, unknown>;
  client: { id?: number; firstName?: string; lastName?: string } | null;
  details: Record<string, unknown> | null;
  expiresAt?: string;
  isDestructive: boolean;
  tier?: 'fire_and_forget' | 'read_back' | 'deliberate' | 'refusal' | null;
  physical?: boolean;
  sourceInputMode?: 'text' | 'voice' | 'ui';
  /** Original operator text, so an expired confirmation can be re-issued one-tap. */
  sourceMessage?: string;
};

export type CommandLogResult = {
  command: string;
  result: Record<string, unknown> | null;
  client: { id?: number; firstName?: string } | null;
  message?: string;
};

export const INITIAL_COMMAND_LOGS: CommandLogEntry[] = [];
