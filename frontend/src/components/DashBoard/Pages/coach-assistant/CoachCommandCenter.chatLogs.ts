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
  return `${entry.actor}:${entry.body.trim()}`;
}

export function buildConversationLogs(
  conversationId: number | string | null | undefined,
  messages: Message[],
): CommandLogEntry[] {
  return messages
    .filter((message) => message.content.trim().length > 0)
    .map((message, index) => ({
      id: `conversation-${conversationId ?? 'active'}-${index}-${message.timestamp}`,
      actor: actorForMessage(message.role),
      label: labelForMessage(message.role),
      body: message.content,
      at: message.timestamp,
    }))
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