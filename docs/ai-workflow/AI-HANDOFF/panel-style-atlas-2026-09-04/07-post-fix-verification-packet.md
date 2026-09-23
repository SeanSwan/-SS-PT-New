# Style Atlas post-fix hostile verification packet

## Remit

Act as a hostile final reviewer. Assume the repairs below are wrong until the evidence proves
otherwise. Find concrete defects in security/privacy boundaries, queue durability, temporal races,
catalog-outage behavior, query encoding, prompt construction, accessibility, or test validity.
Do not request licensed corpus data. Do not suggest broad rewrites or generic enhancements.

Return:

1. `P0/P1/P2/P3` findings with a concrete reproduction and smallest repair.
2. Explicit adjudication of every repaired issue listed below.
3. Any false-positive or vacuous-test concern.
4. Final verdict: `APPROVE`, `REVISE`, or `REJECT`.

## Product boundary

Style Atlas is a private, loopback-only browser over a licensed 9,521-style catalog. Only the owner
may browse it. Partner/client memories receive a 403 before catalog rows load. Atlas exploration and
its queue must never become taste evidence. Compose returns a display-only draft; Make remains the
only prompt writer. Queue files are separate from kept/judgment stores.

## Repaired issues

- Namespace values now use `URLSearchParams`; an extra option string is parsed and merged.
- Queue add and compose now resolve styles through one cached `loadCatalog()` slug map.
- The queue library independently applies the same `corpusAccess` authority as the HTTP route;
  direct reads return no licensed queue data and direct mutations return `forbidden` for partner or
  client memories.
- Subject text containing a Midjourney-style `--parameter` is rejected rather than creating two
  conflicting parameter channels.
- Queue GET/remove/clear run before the optional catalog-presence gate, so the owner can recover a
  stranded queue. Add/Surprise/compose remain unavailable with 503 while the catalog is absent.
- Queue storage/quarantine exceptions become a bounded 503 JSON response.
- Compose includes a one-shot corruption/quarantine notice.
- Surprise accepts numeric years consistently, echoes ignored filters, and limits its draw to free
  queue capacity while reporting `limitedByQueue`.
- Escape does not close detail while focus is in an editing control.
- A compose response invalidated by a queue mutation replaces its still-connected spinner with a
  cancellation instruction. A response superseded by a newer compose or memory switch stays silent.

## Exact implementation excerpts

### Namespace query construction

```js
qs(extra = '') {
  const query = new URLSearchParams({ profile: this.profile, project: this.project || '' });
  const additions = new URLSearchParams(String(extra).replace(/^[?&]+/, ''));
  for (const [key, value] of additions) query.set(key, value);
  return query.toString();
}
```

Both profile and project are additionally validated server-side: profile must be one of a fixed
enum; project must match a lowercase slug of at most 40 characters.

### One style resolver and prompt flag rejection

```js
let catalogRef = null;
let catalogBySlug = null;
const styleFor = (slug) => {
  const catalog = loadCatalog();
  if (catalog !== catalogRef) {
    catalogRef = catalog;
    catalogBySlug = new Map(catalog.index.map((row) => [row.slug, row]));
  }
  return catalogBySlug.get(String(slug || ''));
};

// queueAdd
const row = styleFor(slug);
if (!row) return { ok: false, error: 'unknown style' };
const type = row.kind === 'sref' ? 'sref-style' : 'artistic-style';

// composeDraft
for (const entry of queue) {
  const row = styleFor(entry.slug);
  if (!row) { unresolved.push(entry.slug); continue; }
  parts.push(catalogInsert(row));
}
const subject = String(inputSubject || '').replace(/\s+/g, ' ').trim().slice(0, 200);
if (/(?:^|\s)--[a-z][a-z0-9-]*/i.test(subject)) {
  return { ok: false, error: 'subject must not contain Midjourney parameters' };
}
```

`catalogInsert` is the existing single grammar owner: person categories become `by NAME`; other
styles contribute their name. Aspect ratio is allowlisted and the final draft appends exactly one
`--ar` plus `--v 7`.

### Route ordering and failures

```js
const ns = namespaceFrom(url);
if (ns.error) return json400;
const access = corpusAccess(ns.profile, ns.project);
if (!access.ok) return json403BeforeCatalogLoad;

const storageUnavailable = () => json(503, {
  ok: false,
  error: 'queue storage is temporarily unavailable; no changes were made'
});

if (path === '/api/atlas/queue' && method === 'GET') {
  try { return json200(readQueueAndTakeNotice()); }
  catch { return storageUnavailable(); }
}

if (path === '/api/atlas/queue' && method === 'POST') {
  parse body and validate action;
  if (action is remove or clear) {
    try { perform mutation; return result plus takeQueueNotice(); }
    catch { return storageUnavailable(); }
  }
  remember add request; // add still requires catalog below
}

const atlas = loadAtlasFn();
if (!atlas.present) {
  // grid/facets: 200 with present:false; detail:404; add/surprise/compose:503
  return catalogUnavailableResponse;
}

if (remembered add) {
  try { queueAdd; return result plus takeQueueNotice(); }
  catch { return storageUnavailable(); }
}
```

The queue module repeats that authority check after validating that the memory exists. This is
intentional defense in depth for future CLI/MCP importers, not a replacement for the route gate.

Compose is likewise wrapped; after `composeDraft`, it calls `takeQueueNotice` and merges the notice
into success or 400 output. Surprise reads the queue once inside a storage try/catch, computes
`room = QUEUE_MAX - before.length`, refuses a full queue, draws `min(requested, room)`, applies each
add inside a storage try/catch, and returns:

```js
{
  ok: true,
  seed,
  pool,
  excluded,
  ignored,
  requested,
  limitedByQueue: draw < requested,
  added,
  queue,
  max
}
```

### Client race behavior

```js
// Escape
const editing = event.target?.closest?.('input, textarea, select, [contenteditable="true"]');
if (event.key === 'Escape' && detailOpen && !editing) closeDetail();

// compose response
if (world.changed() || sequence !== composeSequence) return;
if (queueVersion !== queueSequence) {
  if (output.isConnected) {
    output.innerHTML = '<p>Draft cancelled because the queue changed. Compose again when ready.</p>';
  }
  return;
}
renderReturnedDraft();
```

On catalog absence, the owner UI renders the failure message plus the queue aside and mounts the
queue module. A forbidden partner/client response renders only the refusal; it does not mount queue.

## Tests added first and observed red

Before implementation, the new tests failed as follows:

- namespace query encoded as multiple unintended parameters;
- prompt subject accepted a second `--ar`;
- absent-catalog add and compose incorrectly succeeded under the injected loader seam;
- compose omitted the queue quarantine notice;
- simulated locked quarantine escaped the route handler instead of returning JSON 503;
- Surprise omitted ignored filters and silently truncated at capacity;
- Escape in subject input closed detail and stole focus;
- invalidating a held compose response left `Composing...` permanently;
- catalog-absent UI did not mount the recoverable queue.
- direct library reads/adds/composition admitted partner and client memories.

After repair:

- all 24 dependency-free Node regression programs passed via `npm test`;
- all four Playwright programs passed via `npm run test:browser`;
- targeted hostile browser suite passed controlled out-of-order search, stale queue load, memory
  switch, late facet response, input Escape, stale compose, and catalog-outage scenarios;
- changed JavaScript/module/test files passed `node --check`;
- `git diff --check` passed;
- the catalog audit still reports 9,521 rows and exact 5,505 artistic / 4,016 style-code split;
- no remote exists and nothing was pushed.

## Questions the reviewer must answer

1. Can any path expose catalog data or a prior owner's queue to partner/client memory?
2. Can any queue mutation be accepted when the catalog is absent, corrupted, or storage is locked in
   a way that lies about success?
3. Can stale async work leave a permanent spinner or repaint another memory?
4. Does the cached catalog identity assumption introduce a real hot-reload or test-seam bug?
5. Is the `--parameter` rejection bypassable in a way that restores conflicting flags?
6. Are any tests vacuous because their positive control does not actually reach the risky branch?
