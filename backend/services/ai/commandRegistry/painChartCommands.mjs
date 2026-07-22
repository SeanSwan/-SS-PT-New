/**
 * Pain Chart Commands (CC-4)
 * ==========================
 * FRONTEND_DISPATCH registry for the Body Map / Pain Chart Swan Coach dock.
 * The browser validates the region against the REAL ALL_BODY_REGIONS catalog before
 * selecting; nothing here writes pain entries — the human records via PainEntryPanel.
 */
import { z } from 'zod';
import { registerCommands } from './baseSchemas.mjs';

const commands = [{
  type: 'painchart_select_region',
  description: 'Select a body region on the open Pain Chart',
  naturalLanguagePatterns: [
    'select the left shoulder',
    'show the lower back on the pain chart',
    'go to the right knee',
    'highlight the neck',
  ],
  method: 'FRONTEND_DISPATCH',
  endpoint: 'AI_PAINCHART_SELECT_REGION',
  inputSchema: z.object({
    region: z.string().trim().min(2).max(60),
  }).strict(),
  destructive: false,
  requiresConfirmation: false,
  roleRequired: ['admin', 'trainer'],
  requiresClientRef: false,
  category: 'B',
  frontendEvent: 'AI_PAINCHART_SELECT_REGION',
}];

export function register() {
  registerCommands(commands);
}

export default commands;
