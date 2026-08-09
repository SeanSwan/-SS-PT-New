#!/usr/bin/env node
/**
 * FILE: scripts/verify-until-dry/ledger.mjs
 * PURPOSE: Produce and verify deterministic, append-only local evidence chains.
 * TRUST MODEL: Hash chaining is tamper-evident, not a local security boundary.
 * PROVENANCE: Local ledgers remain LOCAL_ADVISORY until CI independently reruns them.
 */

import { createHash } from 'node:crypto';

export const GENESIS_HASH = '0'.repeat(64);

function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value).sort().filter((key) => value[key] !== undefined)
        .map((key) => [key, normalize(value[key])]),
    );
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(normalize(value));
}

export function sha256(value) {
  return createHash('sha256').update(String(value), 'utf8').digest('hex');
}

function entryPayload(entry) {
  const { hash: _hash, ...payload } = entry;
  return payload;
}

export function hashLedgerEntry(entry) {
  return sha256(canonicalJson(entryPayload(entry)));
}

export function appendEvent(entries, event) {
  if (!Array.isArray(entries)) throw new TypeError('entries must be an array');
  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    throw new TypeError('event must be an object');
  }
  const previous = entries.at(-1);
  const entry = {
    seq: entries.length + 1,
    prevHash: previous?.hash ?? GENESIS_HASH,
    provenance: event.provenance ?? 'LOCAL_ADVISORY',
    ...structuredClone(event),
  };
  entry.hash = hashLedgerEntry(entry);
  return [...entries, entry];
}

export function verifyLedger(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return { valid: false, error: 'ledger is empty or not an array' };
  }
  let expectedPrevious = GENESIS_HASH;
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      return { valid: false, error: `entry ${index + 1} is not an object` };
    }
    if (entry.seq !== index + 1) {
      return { valid: false, error: `sequence mismatch at entry ${index + 1}` };
    }
    if (entry.prevHash !== expectedPrevious) {
      return { valid: false, error: `previous hash mismatch at entry ${index + 1}` };
    }
    const expectedHash = hashLedgerEntry(entry);
    if (entry.hash !== expectedHash) {
      return { valid: false, error: `hash mismatch at entry ${index + 1}` };
    }
    expectedPrevious = entry.hash;
  }
  return { valid: true, error: null };
}
