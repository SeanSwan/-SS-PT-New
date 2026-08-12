/**
 * mastodon.mjs — Mastodon / ActivityPub adapter. NO API KEY for public data.
 * ============================================================================
 * VERIFIED LIVE 2026-08-11: `GET https://mastodon.social/api/v1/accounts/lookup`
 * returned 200 with clean JSON and no credential of any kind.
 *
 * WHY IT EARNS A SLOT: Mastodon is FEDERATED, so "which server" is part of the
 * identity — a handle is `@user@host`. That is a real difference from every other
 * adapter here and it has a security consequence: the host comes from
 * caller-supplied data and becomes the request target. An unvalidated host is a
 * server-side request forgery primitive. This module therefore validates the host
 * shape and refuses anything that is not a plain public hostname.
 *
 * Note the collector is designed to run on an operator machine, so SSRF here is
 * lower-consequence than it would be server-side — but the guard is cheap and the
 * portability contract means this file could end up somewhere it matters.
 *
 * PORTABILITY: `fetch` injected, zero deps, zero repo coupling.
 *
 * @module swan-collect/adapters/mastodon
 */

import { normalizeItem, CollectError, clip } from '../core/item.mjs';

export const SOURCE_KEY = 'mastodon';
const MAX_PAGE = 40;
const MAX_TOTAL = 400;
const MAX_PAGES = 20;

/**
 * Hostnames only: letters, digits, dots, hyphens. No scheme, no port, no path,
 * no userinfo, no IP-literal shapes, no localhost. Deliberately strict — this
 * value becomes the request target.
 */
const HOST = /^(?=.{1,253}$)(?!-)[a-z0-9-]{1,63}(?:\.[a-z0-9-]{1,63})+$/i;
const BLOCKED_HOSTS = new Set(['localhost', 'localhost.localdomain']);

/**
 * A label that is purely numeric in ANY base. The WHATWG URL parser accepts
 * 1-4 IPv4 parts in decimal, hex, or octal, so all of these are addresses:
 *   127.1  0x7f.0.0.1  0177.0.0.1  0xa9.0xfe.0xa9.0xfe
 * A real DNS label is never wholly numeric-in-some-base.
 */
const NUMERIC_LABEL = /^(?:0[xX][0-9a-fA-F]+|0[0-7]*|[0-9]+)$/;

export function isSafeHost(host) {
  if (typeof host !== 'string') return false;
  const h = host.trim().toLowerCase();
  if (!h || BLOCKED_HOSTS.has(h)) return false;
  if (!HOST.test(h)) return false;

  // Reject IPv4 in every notation the URL parser accepts. The old guard required
  // exactly four DECIMAL octets, which Kimi K3 packet-7 M3 showed was a real
  // bypass — VERIFIED 2026-08-12: `0xa9.0xfe.0xa9.0xfe` passed the guard and
  // resolves to 169.254.169.254, the cloud metadata endpoint this guard exists
  // to block. `127.1`, `0x7f.0.0.1` and `0177.0.0.1` all reached 127.0.0.1.
  const labels = h.split('.');
  if (labels.every((l) => NUMERIC_LABEL.test(l))) return false;

  // Belt: whatever the parser normalizes to must still look like a hostname.
  // This also catches shapes not yet imagined, since the parser is the thing
  // that ultimately decides where the request goes.
  try {
    const parsed = new URL(`https://${h}/`).hostname;
    if (parsed.startsWith('[')) return false;               // IPv6 literal
    if (/^\d+(\.\d+){0,3}$/.test(parsed)) return false;      // normalized to IPv4
    if (parsed !== h) return false;                          // any rewriting is suspicious
  } catch {
    return false;
  }
  return true;
}

/**
 * Split `@user@host`, `user@host`, or `https://host/@user` into { host, user }.
 * Returns null when the shape is unrecognized — never a partial guess.
 */
export function parseAcct(input, { defaultHost = 'mastodon.social' } = {}) {
  if (typeof input !== 'string' || !input.trim()) return null;
  const s = input.trim().replace(/^@/, '');

  const urlMatch = s.match(/^https?:\/\/([^/]+)\/@([A-Za-z0-9_]{1,64})/i);
  if (urlMatch) {
    return isSafeHost(urlMatch[1]) ? { host: urlMatch[1].toLowerCase(), user: urlMatch[2] } : null;
  }

  const parts = s.split('@');
  if (parts.length === 2) {
    const [user, host] = parts;
    if (!/^[A-Za-z0-9_]{1,64}$/.test(user) || !isSafeHost(host)) return null;
    return { host: host.toLowerCase(), user };
  }
  if (parts.length === 1) {
    if (!/^[A-Za-z0-9_]{1,64}$/.test(parts[0])) return null;
    if (!isSafeHost(defaultHost)) return null;
    return { host: defaultHost.toLowerCase(), user: parts[0] };
  }
  return null;
}

async function api(fetchImpl, host, path, params = {}, { timeoutMs = 15_000 } = {}) {
  const url = new URL(`https://${host}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }
  const res = await fetchImpl(url.toString(), {
    method: 'GET',
    headers: { accept: 'application/json' },
    redirect: 'error',
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res || typeof res.status !== 'number') throw new CollectError('mastodon: malformed fetch response');
  if (res.status === 429) throw new CollectError('mastodon: rate limited (429) — back off and retry later');
  if (res.status === 404) throw new CollectError(`mastodon: not found on ${host}`);
  if (!res.ok) throw new CollectError(`mastodon: ${path} on ${host} returned ${res.status}`);
  return res.json();
}

/** Resolve `@user@host` to the instance-local numeric account id. */
export async function lookupAccount(acct, { fetchImpl = fetch, defaultHost } = {}) {
  const parsed = parseAcct(acct, defaultHost ? { defaultHost } : undefined);
  if (!parsed) throw new CollectError(`mastodon: '${acct}' is not a valid @user@host handle`);
  const data = await api(fetchImpl, parsed.host, '/api/v1/accounts/lookup', { acct: parsed.user });
  if (!data?.id) throw new CollectError(`mastodon: no account '${parsed.user}' on ${parsed.host}`);
  return {
    id: String(data.id),
    host: parsed.host,
    acct: `@${parsed.user}@${parsed.host}`,
    displayName: data.display_name ?? null,
    followersCount: data.followers_count ?? null,
    statusesCount: data.statuses_count ?? null,
    url: data.url ?? null,
  };
}

/**
 * Collect an account's public statuses, newest first.
 *
 * Boosts (`reblog`) are excluded by default for the same reason reposts are on
 * Bluesky: a boost is someone else's speech, and attributing it to this entity
 * would be a misattribution.
 */
export async function collectStatuses(acct, {
  fetchImpl = fetch, defaultHost, max = 100, pageSize = 40, includeBoosts = false, includeReplies = false,
} = {}) {
  const account = await lookupAccount(acct, { fetchImpl, defaultHost });
  const ceiling = Math.min(Math.max(Number(max) || 100, 1), MAX_TOTAL);
  const per = Math.min(Math.max(Number(pageSize) || MAX_PAGE, 1), MAX_PAGE);

  const items = [];
  const seenCursors = new Set();
  // Per-run id dedupe. The seen-cursor brake stops the LOOP, but only after a
  // replayed page has been consumed — so without this a server that returns the
  // same page twice yields duplicate items and an inflated fetched count.
  const seenIds = new Set();
  let maxId;
  let exhausted = false;
  let pages = 0;

  // Same termination discipline as every other adapter (Kimi K3 H1): loop exit
  // must not depend on items.length growing, because a page of all-boosts adds
  // nothing. Page brake + repeated-cursor brake, both leaving exhausted=false.
  while (items.length < ceiling && pages < MAX_PAGES) {
    pages += 1;
    const batch = await api(fetchImpl, account.host, `/api/v1/accounts/${encodeURIComponent(account.id)}/statuses`, {
      limit: Math.min(per, ceiling - items.length),
      max_id: maxId,
      exclude_replies: includeReplies ? undefined : 'true',
      exclude_reblogs: includeBoosts ? undefined : 'true',
    });
    if (!Array.isArray(batch) || !batch.length) { exhausted = true; break; }

    for (const st of batch) {
      if (!st?.id) continue;
      if (!includeBoosts && st.reblog) continue;
      if (seenIds.has(st.id)) continue;
      seenIds.add(st.id);
      items.push(normalizeItem({
        sourceKey: SOURCE_KEY,
        externalId: `${account.host}:${st.id}`,
        entityRef: account.acct,
        kind: 'post',
        // `content` is server-rendered HTML; normalizeItem strips it.
        text: st.content,
        authorName: st.account?.display_name || st.account?.acct || account.displayName,
        canonicalUrl: st.url || st.uri || null,
        publishedAt: st.created_at,
        sourceTier: 'public-no-auth',
        termsPosture: 'public-no-auth',
        fetchMethod: 'mastodon-api',
        metrics: {
          favourites: st.favourites_count ?? null,
          reblogs: st.reblogs_count ?? null,
          replies: st.replies_count ?? null,
        },
      }, { fetchedAt: new Date().toISOString() }));
    }

    const last = batch[batch.length - 1];
    maxId = last?.id;
    if (!maxId) { exhausted = true; break; }
    if (seenCursors.has(maxId)) break;
    seenCursors.add(maxId);
  }

  return { account, items: items.slice(0, ceiling), windowComplete: exhausted };
}

export const adapter = Object.freeze({
  key: SOURCE_KEY,
  label: 'Mastodon',
  tier: 'public-no-auth',
  termsPosture: 'public-no-auth',
  requiresCredential: false,
  handleField: 'mastodon',
  resolve: lookupAccount,
  collect: collectStatuses,
});
