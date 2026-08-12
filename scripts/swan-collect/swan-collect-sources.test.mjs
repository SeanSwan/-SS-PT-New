/**
 * swan-collect-sources.test.mjs — adapters, registry, store, runner.
 * Run: node --test scripts/swan-collect/swan-collect-sources.test.mjs
 *
 * ZERO network, ZERO disk (the store's fs is injected). Split from
 * swan-collect.test.mjs to keep both files under the 300-line cap.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CollectError, decodeAndStrip, decodeEntities } from './core/item.mjs';
import { extractFeed, normalizeFeedDate, splitEntries, tagText, feedUrlFor, unwrapCdata } from './adapters/rss.mjs';
import { parseAcct, isSafeHost, collectStatuses } from './adapters/mastodon.mjs';
import { collectVendor, defineProvider, readPath, PLATFORMS, adapters as vendorAdapters } from './adapters/vendor.mjs';
import { createRegistry } from './core/registry.mjs';
import { createStore, cellName, shortHash } from './core/store.mjs';
import { collectEntity, parseArgs } from './run.mjs';

const AT = '2026-08-11T12:00:00.000Z';
const jsonRes = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body, text: async () => JSON.stringify(body) });
const textRes = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, text: async () => body });

// ── entity decoding (the XSS-ordering fix) ──────────────────────────────────

test('decode runs BEFORE strip — encoded markup cannot survive as live markup', () => {
  // Strip-then-decode would emit "<script>". Decode-then-strip removes it.
  assert.doesNotMatch(decodeAndStrip('&lt;script&gt;alert(1)&lt;/script&gt;safe'), /<script/i);
  assert.match(decodeAndStrip('&lt;script&gt;alert(1)&lt;/script&gt;safe'), /safe/);
  // Double-encoded stays inert literal text, never re-interpreted.
  assert.equal(decodeAndStrip('&amp;lt;b&amp;gt;'), '&lt;b&gt;');
  assert.equal(decodeAndStrip('We&#39;re excited'), "We're excited");
});

test('decodeEntities decodes ampersand LAST', () => {
  assert.equal(decodeEntities('&amp;amp;'), '&amp;');
  assert.equal(decodeEntities('&#x3C;'), '<');
  assert.equal(decodeEntities('&#0;'), ' ', 'control code points are neutralized');
});

// ── RSS / Atom ──────────────────────────────────────────────────────────────

const RSS_DOC = `<?xml version="1.0"?><rss version="2.0"><channel><title>NPR</title>
<item><title>First &amp; Best</title><guid>g1</guid><link>https://npr.org/a</link>
<description><![CDATA[<p>Body <b>here</b></p>]]></description>
<pubDate>Mon, 11 Aug 2026 10:00:00 GMT</pubDate></item>
<item><title>Second</title><guid>g2</guid><link>https://npr.org/b</link><pubDate>bogus</pubDate></item>
</channel></rss>`;

const ATOM_YT = `<?xml version="1.0"?><feed xmlns:yt="http://www.youtube.com/xml/schemas/2015">
<title>Chan</title>
<entry><yt:videoId>Z6z_feacXW8</yt:videoId><title>Vid A</title>
<link rel="alternate" href="https://youtube.com/watch?v=Z6z_feacXW8"/>
<published>2026-08-01T00:05:00+00:00</published></entry></feed>`;

test('extractFeed parses RSS 2.0: CDATA unwrapped, entities decoded, markup stripped', () => {
  const { feedTitle, items } = extractFeed(RSS_DOC, { fetchedAt: AT });
  assert.equal(feedTitle, 'NPR');
  assert.equal(items.length, 2);
  assert.equal(items[0].title, 'First & Best');
  assert.equal(items[0].externalId, 'g1');
  assert.match(items[0].text, /Body here/);
  assert.doesNotMatch(items[0].text, /<p>|<b>/, 'markup must not survive');
  assert.equal(items[0].publishedAt, '2026-08-11T10:00:00.000Z', 'RFC-822 converted');
});

test('extractFeed OMITS an unparseable date rather than guessing', () => {
  const { items } = extractFeed(RSS_DOC, { fetchedAt: AT });
  assert.equal(items[1].publishedAt, null);
});

test('extractFeed parses Atom + YouTube videoId into a video item', () => {
  const { items } = extractFeed(ATOM_YT, { fetchedAt: AT });
  assert.equal(items.length, 1);
  assert.equal(items[0].kind, 'video');
  assert.equal(items[0].externalId, 'Z6z_feacXW8');
  assert.equal(items[0].canonicalUrl, 'https://www.youtube.com/watch?v=Z6z_feacXW8');
  assert.equal(items[0].publishedAt, '2026-08-01T00:05:00.000Z');
});

test('normalizeFeedDate accepts RFC-822 and ISO, refuses everything else', () => {
  assert.equal(normalizeFeedDate('Mon, 11 Aug 2026 10:00:00 GMT'), '2026-08-11T10:00:00.000Z');
  assert.equal(normalizeFeedDate('11 Aug 2026 10:00:00 GMT'), '2026-08-11T10:00:00.000Z');
  assert.equal(normalizeFeedDate('2026-08-11T10:00:00Z'), '2026-08-11T10:00:00Z');
  assert.equal(normalizeFeedDate('2099'), null, 'a bare year must not become a date');
  assert.equal(normalizeFeedDate('sometime last week'), null);
  assert.equal(normalizeFeedDate(''), null);
});

test('splitEntries is bounded and does not mix RSS with Atom', () => {
  const many = `<rss>${'<item><guid>x</guid></item>'.repeat(500)}</rss>`;
  assert.ok(splitEntries(many).length <= 200, 'entry count is capped');
});

test('SECURITY: a feed cannot smuggle a javascript: link into canonicalUrl', () => {
  const doc = `<rss><channel><item><guid>g</guid><link>javascript:alert(1)</link></item></channel></rss>`;
  const { items } = extractFeed(doc, { fetchedAt: AT });
  assert.equal(items[0].canonicalUrl, null);
});

test('SECURITY: no XML entity machinery exists to attack (XXE / billion laughs)', () => {
  const evil = `<?xml version="1.0"?><!DOCTYPE r [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
<rss><channel><item><guid>g</guid><title>&xxe;</title></item></channel></rss>`;
  const { items } = extractFeed(evil, { fetchedAt: AT });
  // The narrow extractor never resolves entities it does not know; the raw
  // reference is left as inert text and no file is ever read.
  assert.doesNotMatch(items[0].title || '', /root:/);
});

test('feedUrlFor rejects non-http(s) and credentialed URLs', () => {
  assert.equal(feedUrlFor('https://a.com/f.xml'), 'https://a.com/f.xml');
  assert.equal(feedUrlFor('file:///etc/passwd'), null);
  assert.equal(feedUrlFor('https://u:p@a.com/f'), null);
  assert.equal(feedUrlFor('nonsense'), null);
});

test('unwrapCdata and tagText handle a missing tag without throwing', () => {
  assert.equal(unwrapCdata('<![CDATA[x]]>'), 'x');
  assert.equal(tagText('<a>1</a>', 'zzz'), null);
});

// ── Mastodon ────────────────────────────────────────────────────────────────

test('SSRF: isSafeHost blocks localhost, IP literals, ports, and metadata addresses', () => {
  assert.equal(isSafeHost('mastodon.social'), true);
  assert.equal(isSafeHost('localhost'), false);
  assert.equal(isSafeHost('127.0.0.1'), false);
  assert.equal(isSafeHost('169.254.169.254'), false, 'cloud metadata endpoint');
  assert.equal(isSafeHost('evil.com:8080'), false, 'a port is not part of a hostname here');
  assert.equal(isSafeHost('../etc'), false);
  assert.equal(isSafeHost(''), false);
});

test('parseAcct handles all three shapes and refuses unsafe hosts', () => {
  assert.deepEqual(parseAcct('@M@mastodon.social'), { host: 'mastodon.social', user: 'M' });
  assert.deepEqual(parseAcct('M@mastodon.social'), { host: 'mastodon.social', user: 'M' });
  assert.deepEqual(parseAcct('https://mastodon.social/@M'), { host: 'mastodon.social', user: 'M' });
  assert.equal(parseAcct('@evil@localhost'), null);
  assert.equal(parseAcct(''), null);
});

test('mastodon excludes boosts — someone else\'s speech is not this entity\'s', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    if (url.includes('lookup')) return jsonRes({ id: '42', display_name: 'M', followers_count: 1 });
    return jsonRes([
      { id: '2', content: '<p>mine</p>', created_at: '2026-08-01T00:00:00Z', url: 'https://m.social/2' },
      { id: '1', reblog: { id: 'other' }, content: 'theirs', created_at: '2026-08-01T00:00:00Z' },
    ]);
  };
  const { items } = await collectStatuses('@M@mastodon.social', { fetchImpl, max: 5 });
  assert.equal(items.length, 1);
  assert.equal(items[0].text, 'mine', 'HTML stripped, boost excluded');
  assert.equal(items[0].externalId, 'mastodon.social:2', 'id is host-scoped — ids are only unique per instance');
});

test('mastodon terminates on a repeated cursor (H1 discipline)', async () => {
  let n = 0;
  const fetchImpl = async (url) => {
    n += 1;
    if (url.includes('lookup')) return jsonRes({ id: '1' });
    return jsonRes([{ id: 'same', reblog: {}, created_at: '2026-08-01T00:00:00Z' }]);
  };
  const { items, windowComplete } = await collectStatuses('@M@mastodon.social', { fetchImpl, max: 50 });
  assert.equal(items.length, 0);
  assert.equal(windowComplete, false);
  assert.ok(n <= 4, `must not loop; made ${n} calls`);
});

// ── vendor ──────────────────────────────────────────────────────────────────

test('vendor ships DISABLED — no provider, no key, no platform all refuse', async () => {
  await assert.rejects(() => collectVendor('a', { platform: 'x' }), /ships disabled/);
  const provider = defineProvider({ name: 'p', endpoint: 'https://v.example/{platform}', map: { externalId: 'id' } });
  await assert.rejects(() => collectVendor('a', { provider, platform: 'nope' }), /platform must be one of/);
  await assert.rejects(() => collectVendor('a', { provider, platform: 'x' }), /requires an API key/);
});

test('vendor descriptors cover every closed platform and default to disabled', () => {
  assert.deepEqual(vendorAdapters.map((a) => a.platform).sort(), [...PLATFORMS].sort());
  assert.ok(vendorAdapters.every((a) => a.enabled === false && a.requiresCredential));
  assert.ok(vendorAdapters.every((a) => a.termsPosture === 'vendor-licensed'));
});

test('SECURITY: the vendor key goes in a HEADER, never the query string', async () => {
  const provider = defineProvider({ name: 'p', endpoint: 'https://v.example/{platform}', itemsPath: 'items', map: { externalId: 'id', text: 'text' } });
  let seenUrl = '';
  let seenHeaders = {};
  const fetchImpl = async (url, opts) => { seenUrl = url; seenHeaders = opts.headers; return jsonRes({ items: [{ id: '1', text: 'hi' }] }); };
  const { items } = await collectVendor('acct', { provider, apiKey: 'SECRET123', platform: 'x', fetchImpl });
  assert.doesNotMatch(seenUrl, /SECRET123/, 'key must never appear in a URL');
  assert.match(seenHeaders.Authorization, /SECRET123/);
  assert.equal(items[0].termsPosture, 'vendor-licensed', 'third-hand data is labelled as such');
  assert.equal(items[0].sourceKey, 'vendor_x');
});

test('readPath refuses prototype-walking segments', () => {
  assert.equal(readPath({ a: { b: 1 } }, 'a.b'), 1);
  assert.equal(readPath({}, '__proto__.polluted'), undefined);
  assert.equal(readPath({}, 'constructor.name'), undefined);
  assert.equal(readPath(null, 'a'), undefined);
});

test('defineProvider rejects malformed providers', () => {
  assert.throws(() => defineProvider({ name: 'Bad Name', endpoint: 'https://x', map: { externalId: 'id' } }), CollectError);
  assert.throws(() => defineProvider({ name: 'p', endpoint: 'http://insecure', map: { externalId: 'id' } }), CollectError);
  assert.throws(() => defineProvider({ name: 'p', endpoint: 'https://x', map: {} }), CollectError);
});

// ── registry ────────────────────────────────────────────────────────────────

const stub = (key, over = {}) => ({ key, label: key, tier: 'public-no-auth', termsPosture: 'public-no-auth', collect: async () => ({ items: [] }), ...over });

test('registry rejects duplicates and malformed adapters', () => {
  const r = createRegistry().register(stub('a'));
  assert.throws(() => r.register(stub('a')), /already registered/);
  assert.throws(() => r.register({ key: 'Bad Key', collect: async () => {} }), CollectError);
  assert.throws(() => r.register({ key: 'b' }), /has no collect/);
  assert.throws(() => r.get('missing'), /no adapter/);
});

test('registry reports unavailable sources WITH REASONS — never a silent skip', () => {
  const r = createRegistry().registerAll([
    stub('free'),
    stub('keyed', { requiresCredential: true, credentialHint: 'NEEDS_KEY' }),
    stub('off', { enabled: false }),
  ]);
  const s = r.status({});
  assert.deepEqual(s.available.map((a) => a.key), ['free']);
  assert.equal(s.unavailable.length, 2);
  assert.match(s.unavailable.find((u) => u.key === 'keyed').reason, /NEEDS_KEY/);
  assert.match(s.unavailable.find((u) => u.key === 'off').reason, /disabled/);
  assert.deepEqual(r.listEnabled({ keyed: 'k' }).map((a) => a.key).sort(), ['free', 'keyed']);
});

test('registry orders cleanest tier first', () => {
  const r = createRegistry().registerAll([
    stub('v', { tier: 'vendor-licensed' }), stub('o', { tier: 'official-api' }), stub('p', { tier: 'public-no-auth' }),
  ]);
  assert.deepEqual(r.list().map((a) => a.key), ['o', 'p', 'v']);
});

// ── store ───────────────────────────────────────────────────────────────────

test('cellName sanitizes traversal, separators, and colons out of filenames', () => {
  assert.match(cellName('bluesky', 'reuters.com'), /^bluesky__reuters\.com__[a-z0-9]{13}\.json$/);
  assert.match(cellName('rss', '../../etc/passwd'), /^rss__/);
  assert.doesNotMatch(cellName('rss', '../../etc/passwd'), /\.\.|\//);
  assert.doesNotMatch(cellName('rss', 'a:b'), /:/, 'colon would be an NTFS alternate stream');
  assert.throws(() => cellName('Bad Key', 'x'), CollectError);
});

test('REGRESSION: distinct entities NEVER share a cell (found by hostile review)', () => {
  // Sanitizing alone collapsed all five of these onto one file, so entity A's
  // stored set would contain entity B's items — the same data-mixing failure as
  // the reconcile scope bug.
  const refs = ['Acme/Corp', 'Acme_Corp', 'Acme Corp', 'Acme?Corp', 'Acme#Corp'];
  const names = new Set(refs.map((r) => cellName('bluesky', r)));
  assert.equal(names.size, refs.length, 'every distinct entity needs its own cell');
});

test('REGRESSION: long entity names do not collide on truncation', () => {
  const a = `${'X'.repeat(200)}AAA`;
  const b = `${'X'.repeat(200)}BBB`;
  assert.notEqual(cellName('rss', a), cellName('rss', b));
});

test('cellName is deterministic — the same ref always maps to the same cell', () => {
  assert.equal(cellName('bluesky', 'Reuters'), cellName('bluesky', 'Reuters'));
  assert.notEqual(cellName('bluesky', 'Reuters'), cellName('youtube', 'Reuters'));
});

test('shortHash is stable, bounded, and filename-safe', () => {
  assert.equal(shortHash('abc'), shortHash('abc'));
  assert.notEqual(shortHash('abc'), shortHash('abd'));
  assert.match(shortHash('anything at all'), /^[a-z0-9]{1,13}$/);
});

test('store read fails OPEN to empty — which can only ever cause ADDs, never retractions', async () => {
  const fs = { readFile: async () => { throw new Error('ENOENT'); }, writeFile: async () => {}, mkdir: async () => {}, readdir: async () => [] };
  const s = createStore('/tmp/x', { fs });
  assert.deepEqual(await s.read('bluesky', 'e'), []);
  const corrupt = { ...fs, readFile: async () => 'not json' };
  assert.deepEqual(await createStore('/tmp/x', { fs: corrupt }).read('bluesky', 'e'), []);
});

test('store round-trips a cell scoped to one source+entity', async () => {
  const files = new Map();
  const fs = {
    readFile: async (p) => { if (!files.has(p)) throw new Error('ENOENT'); return files.get(p); },
    writeFile: async (p, d) => { files.set(p, d); },
    mkdir: async () => {}, readdir: async () => [...files.keys()].map((p) => p.split('/').pop()),
  };
  const s = createStore('/tmp/store', { fs });
  await s.write('bluesky', 'Reuters', [{ sourceKey: 'bluesky', externalId: '1' }], { savedAt: AT });
  assert.equal((await s.read('bluesky', 'Reuters')).length, 1);
  assert.deepEqual(await s.read('youtube', 'Reuters'), [], 'a different source is a different cell');
});

// ── runner ──────────────────────────────────────────────────────────────────

test('runner REFUSES an out-of-scope entity before any network call', async () => {
  let touched = false;
  const registry = createRegistry().register(stub('a', { collect: async () => { touched = true; return { items: [] }; } }));
  const r = await collectEntity({ name: 'Someone', category: 'person', handles: { a: 'x' } }, { registry });
  assert.equal(r.allowed, false);
  assert.equal(r.code, 'OUT_OF_SCOPE');
  assert.equal(touched, false, 'a refused entity must cost nothing');
});

test('runner surfaces a dropped handle instead of silently skipping the source', async () => {
  // Found live 2026-08-11: an --rss URL was dropped by the identifier charset and
  // the source never ran, with nothing reported anywhere.
  const registry = createRegistry().register(stub('rss', { handleField: 'rss' }));
  const r = await collectEntity(
    { name: 'Org', category: 'organization', handles: { rss: 'has space bad' } },
    { registry },
  );
  assert.equal(r.allowed, true);
  assert.equal(r.droppedHandles.length, 1);
  assert.equal(r.droppedHandles[0].source, 'rss');
});

test('runner accepts a URL handle (the RSS case that used to vanish)', async () => {
  const registry = createRegistry().register(stub('rss', { handleField: 'rss' }));
  const r = await collectEntity(
    { name: 'Org', category: 'organization', handles: { rss: 'https://feeds.npr.org/1001/rss.xml' } },
    { registry },
  );
  assert.equal(r.droppedHandles.length, 0);
  assert.equal(r.sources.length, 1);
});

test('runner isolates failures — one dead source does not abort the others', async () => {
  const registry = createRegistry().registerAll([
    stub('good', { handleField: 'good' }),
    stub('bad', { handleField: 'bad', collect: async () => { throw new CollectError('rate limited'); } }),
  ]);
  const r = await collectEntity(
    { name: 'Org', category: 'organization', handles: { good: 'g', bad: 'b' } },
    { registry },
  );
  assert.equal(r.sources.length, 2);
  assert.equal(r.totals.failed, 1);
  assert.equal(r.sources.find((s) => s.source === 'good').ok, true);
  assert.match(r.sources.find((s) => s.source === 'bad').error, /rate limited/);
});

// ── Kimi K3 packet-7 findings, all empirically confirmed then fixed ─────────

test('H1: the store ACCUMULATES — an item outside the window is kept, not deleted', async () => {
  // Confirmed: feed [A,B] then [B,C] left the cell holding only B,C. Item A was
  // silently deleted with no retractedAt and no receipt line. RSS always reports
  // windowComplete:false, so this fired on ordinary operation.
  const files = new Map();
  const fs = {
    readFile: async (p) => { if (!files.has(p)) throw new Error('ENOENT'); return files.get(p); },
    writeFile: async (p, d) => { files.set(p, d); }, mkdir: async () => {}, readdir: async () => [...files.keys()],
  };
  const store = createStore('/s', { fs });
  const mk = (id) => ({ sourceKey: 'feed', externalId: id, entityRef: 'Org', retractedAt: null });
  let page = [mk('A'), mk('B')];
  const registry = createRegistry().register(stub('feed', {
    handleField: 'feed', collect: async () => ({ items: page, windowComplete: false }),
  }));
  const ent = { name: 'Org', category: 'organization', handles: { feed: 'x' } };

  await collectEntity(ent, { registry, store });
  page = [mk('B'), mk('C')];
  const r2 = await collectEntity(ent, { registry, store });

  const stored = JSON.parse([...files.values()][0]).items.map((i) => i.externalId).sort();
  assert.deepEqual(stored, ['A', 'B', 'C'], 'A must survive a window it fell outside of');
  assert.equal(r2.sources[0].kept, 1, 'the receipt must account for preserved items');
  assert.equal(r2.sources[0].stored, 3);
});

test('H1: a COMPLETE window still retracts rather than keeps', async () => {
  const { reconcile } = await import('./core/reconcile.mjs');
  const mk = (id) => ({ sourceKey: 'f', externalId: id, entityRef: 'e', retractedAt: null });
  const full = reconcile([mk('a'), mk('b')], [mk('a')], { at: AT, windowComplete: true });
  assert.equal(full.retracted.length, 1);
  assert.equal(full.kept.length, 0);
  const partial = reconcile([mk('a'), mk('b')], [mk('a')], { at: AT });
  assert.equal(partial.retracted.length, 0);
  assert.equal(partial.kept.length, 1, 'unseen during a partial window = kept');
});

test('M2: a hostile oversized vendor page cannot blow past the ceiling', async () => {
  const provider = defineProvider({ name: 'p', endpoint: 'https://v.example/{platform}', itemsPath: 'items', map: { externalId: 'id' } });
  const huge = { items: Array.from({ length: 50_000 }, (_, i) => ({ id: `i${i}` })) };
  const { items } = await collectVendor('a', { provider, apiKey: 'k', platform: 'x', max: 10, fetchImpl: async () => jsonRes(huge) });
  assert.equal(items.length, 10, 'the ceiling is enforced INSIDE the loop, not after it');
});

test('M3: non-canonical IPv4 can no longer reach internal addresses', () => {
  // Confirmed bypass: 0xa9.0xfe.0xa9.0xfe resolved to 169.254.169.254 — the
  // cloud metadata endpoint this guard exists to block.
  for (const h of ['127.1', '0x7f.0.0.1', '0177.0.0.1', '0xa9.0xfe.0xa9.0xfe', '2130706433']) {
    assert.equal(isSafeHost(h), false, `${h} must be blocked`);
  }
  for (const h of ['mastodon.social', 'mas.to', 'social.example.co.uk', 'a-b.example.com']) {
    assert.equal(isSafeHost(h), true, `${h} must still be allowed`);
  }
});

test('M4: write-then-rename — a crashed write cannot leave a truncated cell', async () => {
  const files = new Map();
  const renames = [];
  const fs = {
    readFile: async (p) => { if (!files.has(p)) throw new Error('E'); return files.get(p); },
    writeFile: async (p, d) => { files.set(p, d); },
    rename: async (a, b) => { renames.push([a, b]); files.set(b, files.get(a)); files.delete(a); },
    mkdir: async () => {}, readdir: async () => [...files.keys()],
  };
  await createStore('/s', { fs }).write('bluesky', 'Org', [{ sourceKey: 'bluesky', externalId: '1' }], { savedAt: AT });
  assert.equal(renames.length, 1, 'the swap must go through rename');
  assert.match(renames[0][0], /\.tmp-/, 'content lands on a temp path first');
  assert.ok([...files.keys()].every((k) => !k.includes('.tmp-')), 'no temp file is left behind');
});

test('M4: a store without rename degrades to a direct write rather than failing', async () => {
  const files = new Map();
  const fs = { readFile: async () => { throw new Error('E'); }, writeFile: async (p, d) => { files.set(p, d); }, mkdir: async () => {}, readdir: async () => [] };
  const n = await createStore('/s', { fs }).write('bluesky', 'Org', [{ sourceKey: 'bluesky', externalId: '1' }]);
  assert.equal(n, 1);
  assert.equal(files.size, 1);
});

test('L1: a date-only RFC-822 no longer invents a time', () => {
  // Confirmed: "11 Aug 2026" became 2026-08-11T07:00:00.000Z — a fabricated hour.
  assert.equal(normalizeFeedDate('11 Aug 2026'), null);
  assert.equal(normalizeFeedDate('Mon, 11 Aug 2026'), null);
  assert.equal(normalizeFeedDate('Mon, 11 Aug 2026 10:00:00 GMT'), '2026-08-11T10:00:00.000Z');
});

test('L2: a title is NOT identity — an entry with no stable id is skipped', () => {
  const doc = `<rss><channel>
    <item><title>Same Headline</title></item>
    <item><title>Same Headline</title></item>
  </channel></rss>`;
  const { items } = extractFeed(doc, { fetchedAt: AT });
  assert.equal(items.length, 0, 'two distinct articles must never collapse into one via title');
});

test('L4: shortHash is 64-bit — distinct inputs stay distinct at scale', () => {
  const seen = new Set();
  for (let i = 0; i < 5_000; i += 1) seen.add(shortHash(`entity-${i}`));
  assert.equal(seen.size, 5_000, 'no collisions across 5k entities');
});

test('L6: a refusal receipt carries the same keys as a success', async () => {
  const registry = createRegistry().register(stub('a', { handleField: 'a' }));
  const denied = await collectEntity({ name: 'X', category: 'person', handles: { a: 'h' } }, { registry });
  assert.ok(Array.isArray(denied.droppedHandles), 'consumers iterate one shape, not two');
  assert.ok(Array.isArray(denied.sources));
});

test('L7: a lone surrogate is never emitted', () => {
  const out = decodeEntities('&#xD800;&#xDFFF;ok');
  assert.doesNotMatch(out, /[\uD800-\uDFFF]/, 'lone surrogates break JSON consumers downstream');
  assert.match(out, /ok/);
});

test('M1: readCapped aborts a stream that exceeds the ceiling', async () => {
  const { readCapped } = await import('./core/http.mjs');
  let cancelled = false;
  let served = 0;
  const chunk = new TextEncoder().encode('x'.repeat(1024));
  const res = {
    body: {
      getReader: () => ({
        read: async () => { served += 1; return { done: false, value: chunk }; },
        cancel: async () => { cancelled = true; },
      }),
    },
  };
  await assert.rejects(() => readCapped(res, 4096, 'test'), /exceeds 4096 bytes/);
  assert.equal(cancelled, true, 'the stream must be cancelled, not drained');
  assert.ok(served < 20, 'it must abort early rather than buffer everything');
});

test('parseArgs maps flags to handles and reserved keys correctly', () => {
  const a = parseArgs(['--name', 'Reuters', '--category', 'organization', '--bluesky', 'reuters.com', '--sources']);
  assert.equal(a.name, 'Reuters');
  assert.equal(a.category, 'organization');
  assert.equal(a.handles.bluesky, 'reuters.com');
  assert.equal(a.sources, true);
  assert.equal(a.handles.name, undefined, 'reserved flags must not become handles');
});
