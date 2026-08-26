#!/usr/bin/env node
/**
 * validate-asset.contract.mjs — the parts of the asset contract that are DATA, not logic.
 *
 * Which registry keys the rules actually read, which compression values exist, and the
 * unread-key audit the CLI prints at startup. Split out of validate-asset.rules.mjs on
 * 2026-08-26 when the N3 panel's fixes pushed that file over the repo's 300-line cap.
 *
 * Pure: no I/O, no process, no bpy. Importable by anything.
 */
export const REGISTRY_KEYS_READ = new Set([
  'assets', 'skeletons', 'zones', 'licensePolicy', 'statusValues', 'budgetPolicy', 'worlds', 'schema', 'updated', 'note',
]);
export const ZONE_KEYS_READ = new Set(['id', 'worldId', 'localId', 'status', 'chromeLaw', 'shardFraming', 'loreParent', 'summary', 'idRule']);
export const COMPRESSION_VALUES = new Set(['none', 'meshopt', 'draco']);

export function unreadRegistryKeys(registry) {
  const top = Object.keys(registry).filter((k) => !REGISTRY_KEYS_READ.has(k));
  const zone = Object.keys(registry.zones?.[0] || {}).filter((k) => !ZONE_KEYS_READ.has(k));
  return { top, zone };
}

// DoS guard: a manifest naming a huge file would hang the gate in CI.
export const MAX_ASSET_BYTES = 256 * 1024 * 1024;
