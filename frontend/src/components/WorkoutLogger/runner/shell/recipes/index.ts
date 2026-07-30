/**
 * Recipe registry — the four CORE page recipes (Labs land only after
 * the page-level harness passes on these; Circuit Relay stays BLOCKED
 * until the engine grows `group {kind, rounds}` — handoff §4.6).
 * `getRecipe` mirrors RunnerCollection's crash-safe switch: unknown
 * id → Focus Flow, never a throw.
 */
import type { RunnerStyleId } from '../../runnerStyles';
import type { RecipeConfig } from './types';
import { focusFlow } from './focusFlow';
import { classic } from './classic';
import { ledgerPro } from './ledgerPro';
import { sheetStack } from './sheetStack';

export const CORE_RECIPES: readonly RecipeConfig[] = Object.freeze([
  focusFlow, classic, ledgerPro, sheetStack,
]);

const BY_ID = new Map<RunnerStyleId, RecipeConfig>(CORE_RECIPES.map((recipe) => [recipe.id, recipe]));

export function getRecipe(id: RunnerStyleId): RecipeConfig {
  return BY_ID.get(id) ?? focusFlow;
}
