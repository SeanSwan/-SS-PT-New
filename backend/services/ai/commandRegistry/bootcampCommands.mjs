/**
 * Bootcamp Builder Commands (CC-3c)
 * =================================
 * Narrow FRONTEND_DISPATCH registry for the Bootcamp Builder's Swan Coach dock.
 * The browser mutates local builder state (useBootcampAiEvents re-validates every
 * payload against the builder's real option sets before applying); nothing here
 * writes to the database. Class-level surface — no client ref required.
 */
import { z } from 'zod';
import { registerCommands } from './baseSchemas.mjs';
// The real class-style vocabulary. Constraining the schema here makes the SERVER
// the authority instead of relying on a client-side re-validation that does not
// actually exist (see the SET_FORMAT entry below).
import { CLASS_STYLES } from '../../bootcamp/bootcampTemplateRules.mjs';

const commands = [{
  type: 'bootcamp_set_structure',
  description: 'Set the open Bootcamp Builder structure — stations and exercises per station',
  naturalLanguagePatterns: [
    'make it five stations',
    'set four stations with three exercises each',
    'change to six stations',
    'three exercises per station',
  ],
  method: 'FRONTEND_DISPATCH',
  endpoint: 'AI_BOOTCAMP_SET_STRUCTURE',
  inputSchema: z.object({
    stations: z.number().int().min(1).max(6).optional(),
    exercisesPerStation: z.number().int().min(1).max(5).optional(),
  }).strict(),
  destructive: false,
  requiresConfirmation: false,
  roleRequired: ['admin', 'trainer'],
  requiresClientRef: false,
  category: 'B',
  frontendEvent: 'AI_BOOTCAMP_SET_STRUCTURE',
}, {
  type: 'bootcamp_set_duration',
  description: 'Set the open Bootcamp Builder class length in minutes',
  naturalLanguagePatterns: [
    'make it a forty five minute class',
    'set the class to 30 minutes',
    'hour long bootcamp',
  ],
  method: 'FRONTEND_DISPATCH',
  endpoint: 'AI_BOOTCAMP_SET_DURATION',
  inputSchema: z.object({
    minutes: z.number().int().min(10).max(120),
  }).strict(),
  destructive: false,
  requiresConfirmation: false,
  roleRequired: ['admin', 'trainer'],
  requiresClientRef: false,
  category: 'B',
  frontendEvent: 'AI_BOOTCAMP_SET_DURATION',
}, {
  type: 'bootcamp_set_format',
  description: 'Set the open Bootcamp Builder format — NASM OPT phase and/or class style',
  naturalLanguagePatterns: [
    'switch to phase two',
    'make it opt phase 3',
    'low impact style class',
  ],
  method: 'FRONTEND_DISPATCH',
  endpoint: 'AI_BOOTCAMP_SET_FORMAT',
  inputSchema: z.object({
    optPhase: z.number().int().min(1).max(5).optional(),
    // Hostile-review (writer sweep): this was `z.string().trim().min(1).max(40)`,
    // so ANY string passed — including values from a DIFFERENT vocabulary
    // ('low_impact' is a `board` value, not a class style). The file header above
    // claims "the browser re-validates every payload against the builder's real
    // option sets"; useBootcampAiEvents.ts:102-103 only checks
    // `typeof d.classStyle === 'string'`, so that gate does not exist for this
    // field. The route falls back to 'standard' before generating, so this was a
    // UI-desync hole rather than a data-integrity one — but the server schema
    // should not depend on a client check it does not perform.
    classStyle: z.enum(CLASS_STYLES).optional(),
  }).strict(),
  destructive: false,
  requiresConfirmation: false,
  roleRequired: ['admin', 'trainer'],
  requiresClientRef: false,
  category: 'B',
  frontendEvent: 'AI_BOOTCAMP_SET_FORMAT',
}];

export function register() {
  registerCommands(commands);
}

export default commands;
