/**
 * Command Registry — Category O: Equipment Intelligence (4 commands)
 * ==================================================================
 * Slice S6 (blueprint §3.3): makes Swan Coach actually equipment-aware.
 *
 * TIERS (Hermes T-model):
 *   T0 reads:  equipment_list_profiles / equipment_list_items / equipment_gap_report
 *   T2 write:  equipment_add_item — bounded internal write, confirmation-gated,
 *              ALWAYS lands as approvalStatus 'manual' (model enum verified:
 *              pending|approved|rejected|manual). It NEVER auto-approves an AI
 *              scan and there is NO scan trigger from chat (photo required —
 *              Coach deep-links to the scanner instead).
 *
 * OWNERSHIP: enforced inside each dispatcher (profile.trainerId === user.id OR
 * admin) — see dispatchers/equipmentDispatchers.mjs. requiresClientRef is false
 * everywhere: these act on the requesting user's own equipment profiles.
 */
import { z } from 'zod';
import { registerCommands } from './baseSchemas.mjs';

const ProfileIdSchema = z.coerce.number().int().positive();

// Mirrors the EquipmentItem model's category validate list
// (backend/models/EquipmentItem.mjs) — keep in sync with the model.
export const EQUIPMENT_CATEGORIES = [
  'barbell', 'dumbbell', 'kettlebell', 'cable_machine', 'resistance_band',
  'bodyweight', 'machine', 'bench', 'rack', 'cardio', 'foam_roller',
  'lacrosse_ball', 'stability_ball', 'medicine_ball', 'pull_up_bar', 'trx',
  'other',
];

const commands = [
  {
    type: 'equipment_list_profiles',
    description: 'List your equipment profiles (locations) with item counts',
    naturalLanguagePatterns: ['show my equipment profiles', 'what gym locations do I have', 'list my equipment locations'],
    method: 'GET', endpoint: '/api/equipment-profiles',
    inputSchema: z.object({}).strict(),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: false, category: 'O',
  },
  {
    type: 'equipment_list_items',
    description: 'List the approved equipment in one of your equipment profiles',
    naturalLanguagePatterns: ['what equipment is in my home gym', 'list equipment in profile {profileId}', 'what can I train with at this location'],
    method: 'GET', endpoint: '/api/equipment-profiles/:profileId/items',
    inputSchema: z.object({
      profileId: ProfileIdSchema,
    }).strict(),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: false, category: 'O',
  },
  {
    type: 'equipment_gap_report',
    description: 'Show movement-pattern coverage gaps for one of your equipment profiles',
    naturalLanguagePatterns: ['what equipment gaps do I have', 'equipment gap report for profile {profileId}', 'what movement patterns is my gym missing'],
    method: 'GET', endpoint: '/api/equipment-insights/profile/:profileId/gap-report',
    inputSchema: z.object({
      profileId: ProfileIdSchema,
    }).strict(),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: false, category: 'O',
  },
  {
    type: 'equipment_add_item',
    description: 'Add a piece of equipment to one of your equipment profiles',
    naturalLanguagePatterns: ['add a kettlebell to my home gym', 'add {name} to equipment profile {profileId}', 'I just got a new resistance band'],
    method: 'POST', endpoint: '/api/equipment-profiles/:profileId/items',
    inputSchema: z.object({
      profileId: ProfileIdSchema,
      name: z.string().min(1).max(150),
      category: z.enum(EQUIPMENT_CATEGORIES).optional(),
      quantity: z.coerce.number().int().min(1).max(50).optional(),
    }).strict(),
    destructive: false, requiresConfirmation: true,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: false, category: 'O',
  },
];

export function register() {
  registerCommands(commands);
}

export default commands;
