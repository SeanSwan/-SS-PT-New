/**
 * Command Registry — Base Schemas & Types
 * ========================================
 * Shared Zod schemas and type definitions for the God-Level AI command engine.
 * All registered commands use BaseCommand shape with domain-specific input schemas.
 *
 * NO OpenAI. Provider chain: Gemini → Anthropic → Venice.
 */
import { z } from 'zod';
import { resolveCommandPolicy } from '../commandPolicy.mjs';

// ── Enums ────────────────────────────────────────────────────────────────────

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
export const USER_ROLES = ['admin', 'trainer', 'client'];

// ── Classified Intent Schema (output of intent classifier) ────────────────

export const ClassifiedIntentSchema = z.object({
  intent: z.string().min(1).max(100),
  // The classifier prompt's OUTPUT FORMAT and examples tell the model
  // "client name or null" — modern models faithfully emit the literal null,
  // and .optional() alone rejected it, collapsing EVERY client-less command
  // to the chat fallback (prod incident root-caused 2026-07-15).
  clientRef: z.string().max(200).nullable().optional(),
  params: z.record(z.unknown()).nullable().optional(),
  confidence: z.number().min(0).max(1),
}).strict();

// ── Command Definition Shape ─────────────────────────────────────────────

/**
 * @typedef {Object} CommandDefinition
 * @property {string} type - Unique command identifier (e.g., 'create_client')
 * @property {string} description - Human-readable description
 * @property {string[]} naturalLanguagePatterns - Example phrases that trigger this command
 * @property {string} method - HTTP method
 * @property {string} endpoint - API path (may contain :params)
 * @property {import('zod').ZodSchema} inputSchema - Zod validation schema for params
 * @property {boolean} destructive - Whether this modifies/deletes data irreversibly
 * @property {boolean} requiresConfirmation - Whether user must confirm before execution
 * @property {string[]} roleRequired - Roles allowed to execute
 * @property {string[]} [relatedCommands] - Related command types for suggestions
 * @property {boolean} [requiresClientRef] - Whether a client reference is needed
 * @property {string} [category] - Command category (A-L)
 */

// ── Shared Sub-Schemas ──────────────────────────────────────────────────────

export const ClientRefSchema = z.string().min(1).max(200);

export const DateSchema = z.string().regex(
  /^\d{4}-\d{2}-\d{2}$/,
  'Date must be YYYY-MM-DD format'
);

export const TimeSchema = z.string().regex(
  /^\d{2}:\d{2}$/,
  'Time must be HH:MM format'
);

export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
}).partial();

export const DateRangeSchema = z.object({
  startDate: DateSchema,
  endDate: DateSchema,
}).partial();

export const PainLevelSchema = z.number().int().min(1).max(10);

export const NASMPhaseSchema = z.number().int().min(1).max(5);

// ── Command Registry Map Type ────────────────────────────────────────────

/** @type {Map<string, CommandDefinition>} */
const COMMAND_REGISTRY = new Map();

/**
 * Register a command definition.
 * @param {CommandDefinition} command
 */
export function registerCommand(command) {
  if (COMMAND_REGISTRY.has(command.type)) {
    throw new Error(`Duplicate command type: ${command.type}`);
  }
  COMMAND_REGISTRY.set(command.type, {
    ...command,
    policy: resolveCommandPolicy(command),
  });
}

/**
 * Register multiple commands at once.
 * @param {CommandDefinition[]} commands
 */
export function registerCommands(commands) {
  for (const cmd of commands) {
    registerCommand(cmd);
  }
}

/**
 * Get a command by type.
 * @param {string} type
 * @returns {CommandDefinition|undefined}
 */
export function getCommand(type) {
  return COMMAND_REGISTRY.get(type);
}

/**
 * Get all registered commands.
 * @returns {CommandDefinition[]}
 */
export function getAllCommands() {
  return [...COMMAND_REGISTRY.values()];
}

/**
 * Get all commands available for a given role.
 * @param {string} role
 * @returns {CommandDefinition[]}
 */
export function getCommandsForRole(role) {
  return getAllCommands().filter(cmd => cmd.roleRequired.includes(role));
}

/**
 * Get all command types as a list (for intent classifier prompt).
 * @returns {string[]}
 */
export function getAllCommandTypes() {
  return [...COMMAND_REGISTRY.keys()];
}

/**
 * Build a summary for the intent classifier prompt.
 * Returns a compact list: type | description | example patterns
 * @param {string} [role] - Optional role filter
 * @returns {string}
 */
/** Param key names from a command's zod object schema (null for unions/none). */
function commandParamKeys(cmd) {
  const shape = cmd.inputSchema?.shape;
  if (!shape || typeof shape !== 'object') return null;
  const keys = Object.keys(shape);
  return keys.length ? keys : null;
}

export function buildCommandSummaryForClassifier(role) {
  const commands = role ? getCommandsForRole(role) : getAllCommands();
  // The params list is load-bearing: without the exact key names the model
  // invents keys from the pattern placeholders ("{exercise}" → params.exercise)
  // and zod rejects the intent (prod incident 2026-07-15, round 3).
  const lines = commands.map(cmd => {
    const keys = commandParamKeys(cmd);
    return `${cmd.type}: ${cmd.description} (e.g., "${cmd.naturalLanguagePatterns[0]}")${keys ? ` [params: ${keys.join(', ')}]` : ''}`;
  });
  return lines.join('\n');
}
