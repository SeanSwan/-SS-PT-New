import type { CoachMessageData } from '../SwanCoachTypes';

const COMMAND_ERROR_FALLBACK = 'Swan Coach command lane failed. No data was changed.';

export function buildCommandErrorMessages(commandText: string, error?: string): CoachMessageData[] {
  const timestamp = new Date().toISOString();
  return [
    { id: `cmd-user-${Date.now()}`, role: 'user', content: commandText, timestamp },
    {
      id: `cmd-error-${Date.now()}`,
      role: 'assistant',
      content: error || COMMAND_ERROR_FALLBACK,
      timestamp,
    },
  ];
}
