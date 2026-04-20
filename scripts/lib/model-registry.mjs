/**
 * model-registry.mjs — read verified model IDs from config/MODEL_VERSIONS.md
 * Created: 2026-04-20 (Codex review of d0334e19 — scripts still hard-code model IDs)
 *
 * Purpose: single source of truth for model IDs. Preflight blocks scripts
 * when the registry has unverified TODO markers. This reader lets scripts
 * use the verified IDs at runtime instead of hard-coding them.
 *
 * Registry format (config/MODEL_VERSIONS.md):
 *   Lines matching `^\s*<name>:\s*<value>` inside a fenced ```yaml block.
 *   Comments start with #. Values containing TODO: VERIFY_ mean the entry
 *   is unverified; preflight will block execution before this reader is called.
 *
 * Usage:
 *   import { getModelId, getModelIdOrThrow } from './lib/model-registry.mjs';
 *   const modelId = getModelIdOrThrow('gemini-pro-model');
 *
 * Preflight guarantees that by the time this reader runs, all TODO markers
 * are gone from the registry. But defensive callers can still check with
 * getModelId() which returns null/TODO rather than throwing.
 */

import { readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REGISTRY_PATH = resolve(__dirname, '..', '..', 'config', 'MODEL_VERSIONS.md');

let _cache = null;

/**
 * Load the registry. Cached after first call.
 * Returns a Map of name -> value (strings).
 */
export function loadRegistry() {
  if (_cache) return _cache;

  if (!existsSync(REGISTRY_PATH)) {
    throw new Error(
      `model-registry: config/MODEL_VERSIONS.md not found at ${REGISTRY_PATH}. ` +
        `Required by CLAUDE.md model-ID discipline.`,
    );
  }

  const txt = readFileSync(REGISTRY_PATH, 'utf8');
  const map = new Map();

  // Parse lines of the form `key: value` only inside fenced code blocks,
  // OR any top-level line matching that shape (tolerant format).
  let inFence = false;
  for (const rawLine of txt.split(/\r?\n/)) {
    const line = rawLine;
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      inFence = !inFence;
      continue;
    }

    // Only parse inside fenced blocks — doc prose can contain colons.
    if (!inFence) continue;

    if (!trimmed || trimmed.startsWith('#')) continue;

    const match = trimmed.match(/^([a-zA-Z][\w-]*)\s*:\s*(.+?)\s*(#.*)?$/);
    if (!match) continue;

    const key = match[1];
    const value = match[2].trim();

    map.set(key, value);
  }

  _cache = map;
  return map;
}

/**
 * Get a model ID by registry name. Returns null if missing.
 * Returns the TODO string if unverified (caller should check).
 * Callers should prefer getModelIdOrThrow() unless they explicitly handle missing entries.
 */
export function getModelId(name) {
  const map = loadRegistry();
  return map.has(name) ? map.get(name) : null;
}

/**
 * Get a model ID, throwing if missing or unverified.
 * Preflight should have caught unverified entries earlier, so this throwing
 * here means either preflight was skipped (SKIP_AI_PREFLIGHT=1) or the
 * registry was edited after preflight ran.
 */
export function getModelIdOrThrow(name) {
  const value = getModelId(name);
  if (value === null) {
    throw new Error(
      `model-registry: entry "${name}" not found in config/MODEL_VERSIONS.md. ` +
        `Add it to the registry and verify before use.`,
    );
  }
  if (value.startsWith('TODO: VERIFY_')) {
    throw new Error(
      `model-registry: entry "${name}" is unverified (${value}). ` +
        `Replace with the actual model ID from the provider's docs before use.`,
    );
  }
  return value;
}

/**
 * For diagnostics: list all registry entries with status.
 */
export function listRegistry() {
  const map = loadRegistry();
  const out = [];
  for (const [k, v] of map.entries()) {
    out.push({
      name: k,
      value: v,
      verified: !v.startsWith('TODO: VERIFY_'),
    });
  }
  return out;
}

/**
 * Reset the internal cache. Used by tests; rarely useful elsewhere.
 */
export function _resetRegistryCache() {
  _cache = null;
}
