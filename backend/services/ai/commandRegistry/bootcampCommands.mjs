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
    classStyle: z.string().trim().min(1).max(40).optional(),
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
