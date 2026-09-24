/**
 * Planner Sequence Commands
 * =========================
 * Narrow command registry for deterministic exercise/day ordering changes in
 * the mounted Workout Planner. The browser mutates local draft state; saved
 * plan persistence remains behind the revision-fenced planner workflow.
 */
import { z } from 'zod';
import { registerCommands } from './baseSchemas.mjs';

const commands = [{
  type: 'planner_rearrange_workout',
  description: 'Rearrange the open Workout Planner into a better exercise sequence',
  naturalLanguagePatterns: [
    'rearrange this workout into the best order',
    'reorder the exercises for the safest flow',
    'optimize this session sequence',
    'organize this workout into a better order',
  ],
  method: 'FRONTEND_DISPATCH',
  endpoint: 'AI_PLANNER_REARRANGE',
  inputSchema: z.object({
    instruction: z.string().trim().min(1).max(4000),
  }).strict(),
  destructive: false,
  requiresConfirmation: false,
  roleRequired: ['admin', 'trainer'],
  requiresClientRef: false,
  category: 'B',
  frontendEvent: 'AI_PLANNER_REARRANGE',
  // SCU G02 / T10 — the registry's first EXPLICIT reversibility declaration.
  // A rearrangement is one discrete planner change, and
  // `planner_undo_last_change` reverts exactly that: a real inverse, not the
  // blanket 'none' the policy adapter used to mint for every command.
  reversibility: 'inverse',
  inverseCommand: 'planner_undo_last_change',
}, {
  type: 'planner_undo_last_change',
  description: 'Undo the last Swan Coach rearrangement in the open Workout Planner',
  naturalLanguagePatterns: [
    'undo that',
    'undo the last planner change',
    'undo the rearrangement',
  ],
  method: 'FRONTEND_DISPATCH',
  endpoint: 'AI_PLANNER_UNDO',
  inputSchema: z.object({}).strict(),
  destructive: false,
  requiresConfirmation: false,
  roleRequired: ['admin', 'trainer'],
  requiresClientRef: false,
  category: 'B',
  frontendEvent: 'AI_PLANNER_UNDO',
}];

export function register() {
  registerCommands(commands);
}

export default commands;
