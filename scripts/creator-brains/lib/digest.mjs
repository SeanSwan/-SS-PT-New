#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/digest.mjs
 * PURPOSE: The run digest — a short human report that fires on SUCCESS as well
 *          as failure, plus the redaction that keeps secrets out of it.
 * PART OF: Creator Brains — SS-PT acquisition engine (blueprint 1.0, S3)
 * ADDED: 2026-09-12
 * ============================================================================
 *
 * THE DIGEST FIRES ON GOOD DAYS — THAT IS THE WHOLE DESIGN:
 *   Both upstream hostile-review seats independently named this "the one thing
 *   I would change": an unattended pipeline with no positive signal rots in
 *   exactly the way this repository has already rotted once (machinery shipped,
 *   feeding never wired). A digest that only appears on failure is a digest
 *   whose ABSENCE carries no information — you cannot tell "everything is fine"
 *   from "the scheduler stopped running three weeks ago". So this writes every
 *   run, including the ones that did nothing, and says so out loud.
 *
 * REDACTION IS DEFENCE IN DEPTH, NOT THE PRIMARY CONTROL:
 *   The primary control is that no secret is ever passed into a run record. But
 *   a digest is the one artifact designed to be read and forwarded, so it also
 *   scrubs anything KEY-SHAPED that reaches it. Both layers exist because the
 *   failure this prevents (a refresh token in a Telegram message) is not
 *   recoverable by deleting the message.
 *
 * @module creator-brains/digest
 */

import { join } from 'node:path';
import { paths, writeTextAtomic } from './paths.mjs';

/** Shapes that must never survive into a report. Ordered longest-first. */
const SECRET_PATTERNS = [
  /\bya29\.[A-Za-z0-9._~-]{10,}/g,                 // Google OAuth access token
  /\b1\/\/[A-Za-z0-9._-]{20,}/g,                   // Google refresh token
  /\bsk_live_[A-Za-z0-9]{8,}/g,                    // Stripe live secret
  /\bsk_test_[A-Za-z0-9]{8,}/g,                    // Stripe test secret
  /\brk_live_[A-Za-z0-9]{8,}/g,                    // Stripe restricted
  /\bwhsec_[A-Za-z0-9]{8,}/g,                      // Stripe webhook secret
  /\bAIza[A-Za-z0-9_-]{10,}/g,                     // Google API key
  /\bxoxb-[A-Za-z0-9-]{10,}/g,                     // Slack bot token
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/g, // JWT
  /\b\d{6,12}:AA[A-Za-z0-9_-]{30,}/g,              // Telegram bot token
  /\bpostgres(?:ql)?:\/\/[^\s"']+/gi,              // database URL
];

/** Scrub key-shaped strings. Also scrubs any explicitly supplied secret value. */
export function redact(text, secrets = []) {
  let out = String(text ?? '');
  for (const value of secrets) {
    if (typeof value !== 'string' || value.length < 8) continue;
    out = out.split(value).join('<REDACTED>');
  }
  for (const re of SECRET_PATTERNS) out = out.replace(re, '<REDACTED>');
  return out;
}

const pct = (n, d) => (d ? `${Math.round((n / d) * 100)}%` : '—');

/**
 * Render the digest for one run record.
 * `secrets` are extra literal values to scrub (never the values themselves in
 * the output — only their absence is observable).
 */
export function buildDigest(record, { secrets = [], extraLines = [] } = {}) {
  const c = record.counts || {};
  const L = [];
  L.push(`# Creator Brains — run ${record.runId}`);
  L.push('');
  L.push(`**${record.ok ? 'COMPLETED' : 'FINISHED WITH FAILURES'}** · started ${record.startedAt} · ended ${record.endedAt || '—'}`);
  L.push('');
  L.push('## Totals');
  L.push('');
  L.push('| | |');
  L.push('|---|---|');
  L.push(`| new videos discovered | ${c.discovered || 0} |`);
  L.push(`| transcripts fetched | ${c.fetched || 0} |`);
  L.push(`| deferred (rate cap) | ${c.deferred || 0}${c.deferredReason ? ` — ${c.deferredReason}` : ''} |`);
  L.push(`| no caption track | ${c.noTrack || 0} |`);
  L.push(`| failed (transient) | ${c.failed || 0} |`);
  L.push(`| unavailable | ${c.unavailable || 0} |`);
  L.push(`| deleted upstream | ${c.deleted || 0} |`);
  L.push(`| brains rebuilt | ${c.built || 0} |`);
  L.push('');

  if (record.budget) {
    L.push('## Budget');
    L.push('');
    L.push(`- cap: ${record.budget.perHour} video fetches / rolling hour`);
    L.push(`- used this run: ${record.budget.spent} · refusals: ${record.budget.refusals}`);
    L.push('');
  }

  L.push('## Phases');
  L.push('');
  for (const p of record.phases || []) {
    const bits = Object.entries(p.counts || {}).filter(([, v]) => v !== 0 && v !== null && v !== undefined)
      .map(([k, v]) => `${k}=${v}`).join(' ');
    L.push(`- ${p.ok ? 'OK  ' : 'FAIL'} \`${p.name}\`${p.reason ? ` — ${p.reason}` : ''}${bits ? ` (${bits})` : ''}`);
  }
  L.push('');

  if (record.creators && record.creators.length) {
    L.push('## Creators');
    L.push('');
    L.push('| Creator | Videos | Fetched | Coverage |');
    L.push('|---|---|---|---|');
    for (const cr of record.creators) {
      L.push(`| ${cr.title || cr.channelId} | ${cr.total} | ${cr.fetched} | ${pct(cr.fetched, cr.total)} |`);
    }
    L.push('');
  }

  if (Array.isArray(record.notes) && record.notes.length) {
    L.push('## Notes');
    L.push('');
    for (const n of record.notes) L.push(`- ${n}`);
    L.push('');
  }

  for (const line of extraLines) L.push(line);

  L.push('---');
  L.push('');
  L.push('_This digest fires on success too. If it stops arriving, the pipeline is');
  L.push('not running — that is the signal, and its absence is the alarm._');
  L.push('');
  return redact(L.join('\n'), secrets);
}

/** Write the digest and return its path. */
export function writeDigest(record, { r, secrets = [], extraLines = [] } = {}) {
  const text = buildDigest(record, { secrets, extraLines });
  const p = join(paths(r).digestDir, `${record.runId}.md`);
  writeTextAtomic(p, text);
  return { path: p, text };
}

/**
 * Recursively replace any supplied secret value anywhere in an object.
 *
 *   Lives here rather than in the runner because it is the redaction concern,
 *   and it belongs beside edact so the two cannot drift apart. It round-trips
 *   through JSON deliberately: the alternative is a deep walk that has to
 *   understand every shape a run record can take.
 */
export function scrub(value, secrets) {
  const json = redact(JSON.stringify(value), secrets);
  try { return JSON.parse(json); } catch { return { redacted: true }; }
}