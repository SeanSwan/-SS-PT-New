import type { Message } from '../../../../hooks/useAIChat';
import type { CommandLogEntry } from './CoachCommandCenter.data';

const WELCOME_LOG_ID = 'coach-welcome';

function actorForMessage(role: Message['role']): CommandLogEntry['actor'] {
  return role === 'user' ? 'operator' : 'coach';
}

function labelForMessage(role: Message['role']): string {
  return role === 'user' ? 'You' : 'Swan Coach';
}

function logKey(entry: CommandLogEntry): string {
  // Blank-body proposal entries key on their proposal ids so two different
  // proposal replies never collide (and live/history copies of one reply do).
  const body = entry.body.trim() || entry.proposals?.map((proposal) => proposal.id).join(',') || '';
  return `${entry.actor}:${body}`;
}

export function buildConversationLogs(
  conversationId: number | string | null | undefined,
  messages: Message[],
): CommandLogEntry[] {
  return messages
    // Keep proposal-bearing messages even when their text body is blank —
    // the confirm cards ARE the content.
    .filter((message) => message.content.trim().length > 0
      || Boolean((message as { metadata?: { coachActionProposals?: unknown[] } }).metadata?.coachActionProposals?.length))
    .map((message, index) => {
      const proposals = (message as { metadata?: { coachActionProposals?: CommandLogEntry['proposals'] } })
        .metadata?.coachActionProposals;
      return {
        id: `conversation-${conversationId ?? 'active'}-${index}-${message.timestamp}`,
        actor: actorForMessage(message.role),
        label: labelForMessage(message.role),
        body: message.content,
        at: message.timestamp,
        ...(Array.isArray(proposals) && proposals.length ? { proposals } : {}),
      };
    })
    .reverse();
}

export function mergeTranscriptLogs(
  commandLogs: CommandLogEntry[],
  conversationLogs: CommandLogEntry[],
): CommandLogEntry[] {
  if (!conversationLogs.length) return commandLogs;

  const liveLogs = commandLogs.filter((entry) => entry.id !== WELCOME_LOG_ID);
  const liveKeys = new Set(liveLogs.map(logKey));
  const uniqueConversationLogs = conversationLogs.filter((entry) => !liveKeys.has(logKey(entry)));

  return [...liveLogs, ...uniqueConversationLogs];
}