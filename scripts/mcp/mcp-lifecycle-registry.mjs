/**
 * ============================================================================
 * FILE: mcp-lifecycle-registry.mjs
 * PURPOSE: Classify exact MCP command shapes without granting mutation authority.
 * AUTHOR: Codex | LAST MODIFIED: 2026-08-09
 * AI VILLAGE VALIDATED: Not run (permission-gated)
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Validates declarative exact argv registry entries.
 * HOW IT FITS IN THE APP: Process inventory -> registry -> core ownership proof.
 * KEY DECISIONS: Only a private code constant can authorize process mutation.
 * NASM PROTOCOL CONTEXT: Not applicable; this is agent infrastructure.
 */

const REGISTRY_KEYS = ['argv', 'label', 'processNames'];
const MUTATION_AUTHORITY = new Set(['playwright']);
const slash = (value = '') => String(value).replaceAll('\\', '/').toLowerCase();
const basename = (value = '') => slash(value).split('/').at(-1);
const tokens = (commandLine = '') => [...String(commandLine).matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g)]
  .map((match) => match[1] ?? match[2] ?? match[3]);

function validArg(value) {
  return typeof value === 'string' || (Array.isArray(value) && value.length > 0
    && value.every((item) => typeof item === 'string') && new Set(value).size === value.length);
}

/** Validate registry data while rejecting every executable-authority field. */
export function validateRegistry(entries) {
  if (!Array.isArray(entries) || entries.length === 0) throw new Error('invalid registry entry');
  const labels = new Set();
  for (const entry of entries) {
    const keys = Object.keys(entry || {}).sort();
    const valid = keys.join(',') === REGISTRY_KEYS.sort().join(',')
      && typeof entry.label === 'string' && /^[a-z0-9-]+$/.test(entry.label)
      && Array.isArray(entry.processNames) && entry.processNames.length > 0
      && entry.processNames.every((item) => typeof item === 'string')
      && Array.isArray(entry.argv) && entry.argv.length > 0 && entry.argv.every(validArg);
    if (!valid) throw new Error('invalid registry entry');
    if (labels.has(entry.label)) throw new Error('duplicate registry label');
    labels.add(entry.label);
  }
  return entries;
}

export const MCP_REGISTRY = Object.freeze(validateRegistry([Object.freeze({
  label: 'playwright', processNames: Object.freeze(['cmd', 'cmd.exe']),
  argv: Object.freeze([Object.freeze(['cmd', 'cmd.exe']), '/c', 'npx', '-y', '@playwright/mcp@latest']),
})]));
export const MANAGED_LABELS = new Set(MCP_REGISTRY.map((entry) => entry.label));

/** Return the exact registry label for a full executable/argv match. */
export function classifyRegistryProcess(commandLine = '', processName = '') {
  const argv = tokens(commandLine).map(slash);
  const executable = basename(processName || argv[0]);
  const match = MCP_REGISTRY.find((entry) => entry.processNames.map(slash).includes(executable)
    && entry.argv.length === argv.length && entry.argv.every((expected, index) => {
      const choices = Array.isArray(expected) ? expected : [expected];
      return choices.map(slash).some((choice) => (index === 0 ? basename(argv[index]) : argv[index]) === choice);
    }));
  return match?.label ?? null;
}

/** Code-owned authority cannot be broadened by registry data. */
export function canMutateLabel(label) { return MUTATION_AUTHORITY.has(label); }
