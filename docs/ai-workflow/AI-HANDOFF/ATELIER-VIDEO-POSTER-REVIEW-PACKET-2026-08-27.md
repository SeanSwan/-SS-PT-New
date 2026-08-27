---
decision: "Hostile-review packet for the video-poster library slice — previewKeyFor, the assetPreviews extraction, and the card kind marker."
status: open
supersedes: none
---

# Review packet — a clip has a poster, and the library finally signs it

Commit `9ffc6de65` on `feat/atelier-v2-compose`, worktree `c:/tmp/ss-atelier-v2`.

**Every function below is pasted WHOLE.** Four confident findings in earlier rounds of this
workstream were manufactured by abbreviated excerpts in the packet, not by defects in the
code. If something looks missing, it is missing from the code, not from this document.

---

## 1. The defect

`assetLibrary.mjs` skipped any row that was not an image before signing a preview:

```js
if (r.kind !== 'image' || !r.r2Key) return Promise.resolve(null);
```

But `videoRenderJobService.mjs:279` writes `posterR2Key` onto the `MediaAsset` row it
creates for a finished clip — the same nullable column the thumbnail slice uses for stills:

```js
const [asset] = await MediaAsset.findOrCreate({
  where: { r2Key },
  defaults: {
    ownerUserId: job.userId,
    jobId: job.id,
    kind: 'video',
    source: 'generated',
    r2Key,
    posterR2Key: meta.posterR2Key ?? null,
    ...
```

So every video in the library rendered as a grey box while a poster for it sat in storage,
already made and already paid for.

The Assets tab already lists video today: `AtelierLibrary.tsx` sends only `brandKit`,
`status` and `cursor`, `buildAssetQuery` adds a `kind` clause only when one is supplied,
and `reusable()` has a purpose-written message for the video case. This was a bug on a
live surface, not a missing feature.

## 2. The trap, and why the fix is one function

The image path falls back to the original when there is no derivative, and that fallback
is correct — an image's original IS a picture. Copying it to video would sign an MP4 into
an `<img>`: undecodable, `onError` fires, the same grey box, now with a wasted signature
and megabytes of request behind it.

Two branches, one of which must remember a condition the other does not, is the shape that
produced sixteen of this subsystem's thirty-one review defects. So the rule is stated once.

## 3. `keyOwnedByRow` (own module) + `previewKeyFor` — WHOLE (re-spliced at round 7)

`assetKeyOwnership.mjs`:

```js
/**
 * assetKeyOwnership.mjs — may this row's key be signed?
 * ============================================================================
 *
 * Its own module because it has TWO consumers — the library's preview signer and the
 * publish/permalink signer — and the defect class this subsystem produces above all others
 * is a rule that exists in two places and is updated in one. Copying this predicate into
 * `publishAsset.mjs` would have been that defect, committed in the fix for it.
 */

/**
 * IS THIS KEY ONE THIS SYSTEM COULD HAVE WRITTEN FOR THIS ROW?
 *
 * Signing is a capability. `generateThumbnailUrl` presigns ANY key it is handed, with no
 * prefix restriction, and the URL goes to a browser. So the key has to be checked, and the
 * check has to be anchored to something the caller cannot choose.
 *
 * WHY A READER VALIDATES WHAT A WRITER STORED. `posterR2Key` on a video row is written by
 * nothing in this repository. It arrives as `...meta` spread from the body of
 * `POST /api/render-agents/jobs/:jobId/complete` (renderAgentRoutes.mjs:176) into
 * `completeJob`'s rest parameter and on into `MediaAsset` defaults, unvalidated —
 * `verifyObject` checks `r2Key` only. An enrolled agent can therefore store a key pointing
 * anywhere in the bucket, on a row it legitimately owns.
 *
 * THE TWO NAMESPACES THIS SYSTEM WRITES, each anchored to an id ON THE ROW:
 *
 *   atelier/stills/<ownerUserId>/...   persistStills.mjs:52 and stillThumbnail.mjs:35
 *   jobs/<jobId>/...                   r2KeyForJob (videoRenderJobService.mjs:55)
 *
 * MY FIRST VERSION OF THIS GOT IT WRONG IN BOTH DIRECTIONS, and both seats caught it.
 * It asked only "does the owner's id appear as SOME segment", which is
 *   - TOO STRICT: a legitimate video poster is `jobs/<jobId>/...` and carries no user id at
 *     all, so every properly-produced clip would have failed closed into the very grey box
 *     this slice exists to remove; and
 *   - TOO LOOSE: `jobs/7/frame.webp` passed for owner 7 even though that 7 is a JOB id in
 *     another tenant's namespace — precisely the signed URL the check exists to refuse.
 * A segment-anywhere test written against one writer's convention, applied to two writers.
 * The pair defect again, this time in the guard against it.
 *
 * Position matters, namespace matters, and the anchor is the row's own id — never a value
 * from the payload. `jobId` is a UUID, so it cannot collide with a numeric user id.
 *
 * Empty and relative segments are refused outright. S3 keys are opaque strings and do not
 * resolve `..`, so this is not traversal defence; it keeps the invariant simple enough to
 * state, which is worth more here than the case it excludes.
 *
 * FAIL CLOSED: an unrecognised key yields a placeholder. Trusting it yields a signed URL
 * for someone else's object. A new writer must use one of the two namespaces above.
 */
export function keyOwnedByRow(key, row) {
  if (typeof key !== 'string' || !key || !row) return false;
  const seg = key.split('/');
  if (seg.some((x) => !x || x === '.' || x === '..')) return false;

  if (seg.length >= 4 && seg[0] === 'atelier' && seg[1] === 'stills') {
    return row.ownerUserId !== null && row.ownerUserId !== undefined
      && seg[2] === String(row.ownerUserId);
  }
  if (seg.length >= 3 && seg[0] === 'jobs') {
    return row.jobId !== null && row.jobId !== undefined && seg[1] === String(row.jobId);
  }
  return false;
}
```

`assetPreviews.mjs`:

```js
/**
 * WHICH OBJECT A CARD SHOWS — one rule, deliberately not two branches.
 *
 *   1. A poster is PREFERRED when there is one — the ~30 KB WebP the thumbnail slice writes
 *      for a still, or the frame a video writer records for a clip. Same column, same
 *      meaning, same precedence.
 *   2. Falling back to the primary object is legitimate ONLY when that object is itself a
 *      viewable still. `r2Key` on an image row is a PNG an <img> renders; on a video row it
 *      is an MP4, and signing it hands the browser a movie to decode as a picture. On audio
 *      there is nothing to look at.
 *   3. Either candidate is signed ONLY if `keyOwnedByRow` recognises it. One of the two is
 *      caller-supplied and unvalidated, and signing is a capability.
 *
 * The three compose in one function rather than an image branch beside a video branch,
 * because a rule applied to one half of a pair is what this subsystem produces when left to.
 *
 * Returns null when there is nothing showable — a degraded card, never an error.
 */
export function previewKeyFor(row) {
  if (!row) return null;
  if (keyOwnedByRow(row.posterR2Key, row)) return row.posterR2Key;
  const original = row.kind === 'image' ? row.r2Key : null;
  return keyOwnedByRow(original, row) ? original : null;
}
```

## 4. `signPreviews` and `reportNoSigner` — WHOLE (current source, re-spliced at round 6)

```js
/**
 * No signer injected. That is a legitimate configuration — `listAssets` is callable
 * without storage and every test relies on it — so it is NOT `previewsUnavailable`,
 * which means "the signer we have is broken".
 *
 * It must not be SILENT, though. If the route's injection ever regresses, this branch
 * returns a full page of nulls with a 200 and no telemetry: exactly the "page of grey
 * boxes with a 200 and nothing ever says otherwise" the per-row catch below calls
 * unacceptable. The same standard has to apply to the branch where nothing is attempted
 * at all — a rule that guards one half of a pair is this subsystem's dominant defect.
 *
 * Only when there was something to sign: an empty page says nothing about wiring.
 */
function reportNoSigner(page) {
  if (page.some((r) => previewKeyFor(r))) {
    console.warn('[Atelier/library] %d row(s) have a signable object but no signer was injected — every card on this page will be a placeholder.',
      page.filter((r) => previewKeyFor(r)).length);
  }
  return page.map(() => null);
}


/**
 * Sign one page of previews. Returns `{ previews, previewsUnavailable }`, where
 * `previews[i]` lines up with `page[i]` and is null for any row with nothing showable
 * or a key that would not sign.
 *
 * `readUrl` is injected so every branch is testable without storage. When it is absent
 * every card is null — an unconfigured signer is a library without pictures, not an error.
 */
export async function signPreviews(page = [], readUrl) {
  let attempted = 0;
  let failed = 0;
  const previews = readUrl
    ? await Promise.all(page.map((r) => {
      // THE DERIVATIVE WHEN THERE IS ONE, THE ORIGINAL ONLY WHEN IT IS ITSELF A PICTURE.
      //
      // A still persisted since the thumbnail slice carries `posterR2Key` — a ~30 KB WebP
      // instead of a ~2 MB PNG, which is what makes a two-dozen-card page affordable. A
      // video row carries one too, written by the video job service, and before this it
      // was never signed: every clip in the library was a grey box while its poster sat
      // in storage, already paid for.
      //
      // The image fallback is not laziness, it is the difference between a slow card and a
      // missing one. Signing a derived key unconditionally would hand every older asset a
      // URL for an object that was never written; the browser 404s, the card's error
      // handler falls back to dimensions, and every picture made before the thumbnail
      // slice quietly becomes a grey box. Heavy and visible beats light and absent.
      //
      // The rule itself lives in `previewKeyFor` — see the note there for why it is one
      // function rather than an image branch and a video branch.
      const previewKey = previewKeyFor(r);
      if (!previewKey) return Promise.resolve(null);
      attempted += 1;
      // ONE ARGUMENT, because the real signer takes one. The route injects
      // `(key) => generateThumbnailUrl(key)`, whose signature is `(objectKey)` — a mime
      // passed here reached nothing. A dead argument at a seam is precisely how a test in
      // this repo stubbed `fetchPrompts` for months against code that reads `fetchImpl`,
      // so it is not left lying around to look meaningful.
      //
      // Nothing is lost by dropping it: the object's ContentType is set when it is written,
      // so storage serves the right type without being told again at signing time.
      // `Promise.resolve().then(...)` rather than `readUrl(...).catch(...)`: a signer that
      // throws SYNCHRONOUSLY never produces a promise for `.catch` to attach to.
      return Promise.resolve().then(() => readUrl(previewKey)).then((url) => {
        // A SIGNER THAT RESOLVES NOTHING IS A FAILURE, NOT A SUCCESS.
        //
        // This module guards an ABSENT signer (reportNoSigner) and a REJECTING one (the
        // catch below, which also covers a synchronous throw). It did not guard the third
        // mode: present, called, resolves undefined — and that one threads between both.
        // Every card null, `failed` never incremented, so `failed === attempted` is false,
        // no banner, no log, HTTP 200. Byte for byte the "page of grey boxes with a 200 and
        // nothing ever says otherwise" this file twice says is unacceptable, reopened
        // through the one seam the fix did not cover.
        //
        // `generateThumbnailUrl` returns `await getSignedUrl(...)` and has no falsy return
        // path, so this is unreachable through the wiring that exists today. It is guarded
        // anyway because `readUrl` is an INJECTED seam — the guard belongs to the contract,
        // not to the one implementation that currently satisfies it. Counting it as failed
        // is what makes the existing banner and log work unchanged.
        if (!url) throw new Error('signer resolved no URL');
        return url;
      }).catch((err) => {
        failed += 1;
        // Per-row degradation must still be VISIBLE somewhere. Silent isolation turns a
        // rotated secret into a page of grey boxes with a 200 and no telemetry — the
        // operator concludes their renders are broken, and nothing ever says otherwise.
        console.warn('[Atelier/library] preview signing failed for asset %s: %s', r.id, err?.message || err);
        return null;
      });
    }))
    : reportNoSigner(page);

  // ONE bad object is isolation working. EVERY object failing is a broken signer, and
  // those are different facts that must not look identical to the person reading the page.
  // A TOTAL FAILURE IS ONLY EVIDENCE OF A BROKEN SIGNER ONCE THERE WERE TWO CHANCES.
  //
  // `failed === attempted` with ONE signable row is not evidence of anything: it is one
  // purged object. A 24-row page where 23 rows have no poster reaches that state as easily
  // as a page of one, so this is not an edge case, it is Tuesday.
  //
  // I first gated only the LOG on this and left the boolean loud, reasoning that a quieter
  // flag means silence about a genuinely broken signer. That was wrong, and wrong in this
  // subsystem's signature way — one half of a pair. The boolean is not telemetry: its only
  // consumer is a page-wide banner that tells the operator "this is a preview-signing
  // problem, not a problem with your assets." That is the SAME causal claim as the log
  // sentence, in the place a person actually reads it. Gating one and not the other left
  // the wrong statement exactly where it does harm.
  //
  // Nothing goes silent. n=1 total failure still logs; it just stops ASSERTING a cause
  // nobody can know yet, in either voice.
  const totalFailure = attempted > 0 && failed === attempted;
  const previewsUnavailable = totalFailure && attempted >= 2;
  if (totalFailure) {
    if (previewsUnavailable) {
      console.error('[Atelier/library] ALL %d previews failed to sign — the signer is likely misconfigured, not the objects.', attempted);
    } else {
      console.warn('[Atelier/library] the page\u0027s only signable object failed — one bad object and a broken signer are indistinguishable at n=1.');
    }
  }
  return { previews, previewsUnavailable };
}
```

## 4b. `assetView` — WHOLE (re-spliced at round 6)

```js
export function assetView(row, previewUrl = null) {
  const tags = Array.isArray(row.tags) ? row.tags : [];
  const tag = (prefix) => {
    const hit = tags.find((t) => typeof t === 'string' && t.startsWith(`${prefix}:`));
    return hit ? hit.slice(prefix.length + 1) : null;
  };
  const rawSeed = tag('seed');
  const parsedSeed = rawSeed === null ? NaN : Number(rawSeed);
  const seedTag = Number.isFinite(parsedSeed) ? parsedSeed : null;

  return {
    id: row.id,
    kind: row.kind,
    mime: row.mime,
    width: row.width ?? null,
    height: row.height ?? null,
    sizeBytes: row.sizeBytes === undefined || row.sizeBytes === null ? null : Number(row.sizeBytes),
    status: row.approvalStatus,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    // Lifted out of tags so a client never parses strings to answer "which brand made this".
    brandKit: tag('brandkit'),
    brandKitHash: tag('brandkit-hash'),
    workspaceId: tag('workspace'),
    lane: tag('lane'),
    // NaN IS NOT A NUMBER THE CLIENT CAN READ. `Number('v2')` is NaN, and JSON.stringify
    // emits NaN as `null` — so a malformed tag arrived as a seed of null with nothing
    // logged and no error, and any attempt to reproduce that render lost its anchor
    // silently. Parsed once (it was evaluated twice) and only accepted if it is finite.
    seed: seedTag,
    // The prompt, from frozen provenance. Truncated at write time by buildProvenance;
    // shown so a person can recognise their own work, which is the whole point of a library.
    // THE HASH OF THE BYTES THIS CARD IS SHOWING. Motion refuses to animate a frame whose
    // recorded hash is not the one the caller approved — "approval binds bytes, not words"
    // — so the caller has to be able to SAY which bytes it approved. Without this, an asset
    // in the library is a dead end: you can see it and never animate it.
    //
    // The tempting shortcut is to let the bind look up its own hash and skip the argument.
    // That would make the gate compare a value to itself and quietly delete the protection
    // it exists to provide. Publishing the hash keeps the check adversarial: if the row
    // changed between listing and binding, the server still refuses.
    //
    // Safe to expose — it is the content hash of the caller's own image on an owner-scoped
    // query, not a credential, and the storage key stays withheld.
    sha256: row.provenance?.artifact?.sha256 ?? null,
    prompt: row.provenance?.request?.prompt ?? null,
    promptTruncated: Boolean(row.provenance?.request?.promptTruncated),
    // A SHORT-LIVED SIGNED URL, or null. Null is a degraded card, never an error: one
    // object that will not sign must not cost the operator the whole page. The storage
    // key still never leaves the server — a signed URL is time-limited and opaque, which
    // is the same trade the published-reference endpoint already makes.
    previewUrl,
  };
}
```

## 5. The call site in `listAssets` — WHOLE function

```js
/**
 * List one page. `assetModel` is injected so every branch is testable without a database.
 */
export async function listAssets(req = {}, deps = {}) {
  const { assetModel, Op, fn, col, where, readUrl } = deps;
  if (!assetModel || !Op) throw new ComposeError('E_STORAGE_UNCONFIGURED', 'The asset store is not configured.');

  const q = buildAssetQuery(req, { Op, fn, col, where });
  const rows = await assetModel.findAll({ where: q.where, order: q.order, limit: q.limit });
  const page = rows.slice(0, q._pageSize);
  const hasMore = rows.length > q._pageSize;

  // PREVIEWS. Without them this is an index, not a library: a card showing "1920x1080"
  // asks a person to find their work by reading rather than by recognising it, which is
  // not how anyone looks for a picture.
  //
  // HOW they are signed — which object a card shows, per-row isolation, and telling a
  // broken signer apart from a broken object — lives in `assetPreviews.mjs`, and is
  // described there rather than in both places.
  const { previews, previewsUnavailable } = await signPreviews(page, readUrl);

  return {
    assets: page.map((r, i) => assetView(r, previews[i])),
    previewsUnavailable,
    hasMore,
    // Null when the page is the last one, so a client stops rather than re-requesting.
    nextCursor: hasMore ? encodeCursor(page[page.length - 1]) : null,
    pageSize: q._pageSize,
  };
}
```

## 6. The frontend marker — WHOLE card render

A clip now shows a still frame and is otherwise pixel-identical to a photograph on the
grid. A grey box tells you nothing; an unlabelled poster tells you something false.

```tsx
          <AssetGrid>
            {assets.map((a) => (
              <AssetCard key={a.id}>
                {a.previewUrl && !broken[a.id] ? (
                  <AssetImage
                    src={a.previewUrl}
                    alt={a.prompt || 'Rendered asset'}
                    loading="lazy"
                    // A signed URL expires while you scroll. When it does the card falls
                    // back to the SAME placeholder an unsignable object gets. The first
                    // version hid the image instead, which left a hole — contradicting the
                    // very principle it was written to serve, and a reviewer said so.
                    onError={() => setBroken((b) => ({ ...b, [a.id]: true }))}
                  />
                ) : (
                  <AssetThumb aria-label={a.prompt || 'Rendered asset'}>
                    {a.width && a.height ? `${a.width}x${a.height}` : a.kind}
                  </AssetThumb>
                )}
                <AssetMeta>
                  <strong>{a.status}</strong>
                  {/* WHAT IT IS, whenever it is not the default. A clip now shows its
                      POSTER — a still frame — so without this a six-second video is
                      pixel-identical to a photograph on the grid. Making the picture
                      appear and leaving it unlabelled trades one honesty problem for
                      a worse one: a grey box tells you nothing, a poster tells you
                      something false. */}
                  {a.kind !== 'image' && <span> · {a.kind}</span>}
                  {a.brandKit && <span> · {a.brandKit}</span>}
                  {a.lane && <span> · {a.lane}</span>}
                </AssetMeta>
                {a.prompt && <Caption>{a.prompt}{a.promptTruncated ? '…' : ''}</Caption>}
                {onUse && (() => {
                  const can = reusable(a);
                  // Always rendered, never hidden. A disabled control that says WHY beats a
                  // control that vanishes: the operator learns the asset is unusable and
                  // the reason, instead of wondering where the button went.
                  return (
                    <>
                      <QuietButton
                        type="button"
                        disabled={!can.ok}
                        title={can.ok ? 'Open this frame in Compose, ready for Motion' : can.why}
                        aria-label={`Use ${a.prompt || 'this asset'} in Compose`}
                        aria-describedby={can.ok ? undefined : `why-${a.id}`}
                        onClick={() => onUse(a)}
                      >
                        <Wand2 size={14} aria-hidden /> Use in Compose
                      </QuietButton>
                      {/* THE REASON AS TEXT, not only as a tooltip. A disabled button is not
                          focusable, so `title` alone never reaches a keyboard or screen-reader
                          user, and nothing hovers on a phone — the explanation would have
                          landed for mouse users only. Rendering it means everyone gets the
                          same answer, which was the point of not hiding the control. */}
                      {!can.ok && <Caption id={`why-${a.id}`}>{can.why}</Caption>}
                    </>
                  );
                })()}
              </AssetCard>
            ))}
          </AssetGrid>
```

## 7. Tests — WHOLE files

### 7a. `assetPreviewKey.test.mjs` (new)

```js
/**
 * previewKeyFor — the one rule that decides which object a card shows.
 *
 * Tested directly, and not only through `listAssets`, because the rule is the thing that
 * has to survive. The dominant defect class in this subsystem is a rule applied to one
 * half of a pair; the defence is that the rule exists once, so it needs a test that fails
 * when someone splits it back into an image branch and a video branch.
 */

import { describe, it, expect } from 'vitest';
import { previewKeyFor } from '../../services/atelier/assetPreviews.mjs';

describe('the poster always wins when there is one', () => {
  it('prefers the poster over the original for an image', () => {
    expect(previewKeyFor({ kind: 'image', r2Key: 'a.png', posterR2Key: 't.webp' })).toBe('t.webp');
  });

  it('prefers the poster for a video', () => {
    expect(previewKeyFor({ kind: 'video', r2Key: 'a.mp4', posterR2Key: 'p.webp' })).toBe('p.webp');
  });

  it('prefers the poster for a kind nobody planned for', () => {
    // The rule is stated once, so it answers for kinds that did not exist when it was
    // written. A pair of branches would have needed a third.
    expect(previewKeyFor({ kind: 'hologram', r2Key: 'a.bin', posterR2Key: 'p.webp' })).toBe('p.webp');
  });
});

describe('the fallback is conditional on the original being a picture', () => {
  it('falls back to the original for an image', () => {
    expect(previewKeyFor({ kind: 'image', r2Key: 'a.png', posterR2Key: null })).toBe('a.png');
  });

  it('does NOT fall back to the video file', () => {
    // Signing this would put an MP4 in an <img>.
    expect(previewKeyFor({ kind: 'video', r2Key: 'a.mp4', posterR2Key: null })).toBeNull();
  });

  it('does NOT fall back to the audio file', () => {
    expect(previewKeyFor({ kind: 'audio', r2Key: 'a.mp3', posterR2Key: null })).toBeNull();
  });

  it('does not fall back for an unknown kind either — the allowlist is the picture claim', () => {
    expect(previewKeyFor({ kind: 'hologram', r2Key: 'a.bin', posterR2Key: null })).toBeNull();
  });
});

describe('nothing showable is null, never an error', () => {
  it('an image row with no key at all yields null rather than an empty string', () => {
    // `''` is falsy but would still be SIGNED if this returned it — a signature over the
    // bucket root. Null is the only safe absence.
    expect(previewKeyFor({ kind: 'image', r2Key: '', posterR2Key: null })).toBeNull();
    expect(previewKeyFor({ kind: 'image', r2Key: null, posterR2Key: null })).toBeNull();
  });

  it('an empty row does not throw', () => {
    expect(previewKeyFor({})).toBeNull();
    expect(previewKeyFor()).toBeNull();
  });
});
```

### 7b. New block appended to `assetLibraryPreviews.test.mjs`

```js
describe('a clip has a poster, and it was never signed', () => {
  const model = (rows) => ({ findAll: async () => rows });
  const clip = (over = {}) => row({
    kind: 'video', mime: 'video/mp4', r2Key: 'atelier/video/1/clip.mp4', ...over,
  });

  it('signs the POSTER of a video, so a clip stops being a grey box', async () => {
    // videoRenderJobService writes `posterR2Key` onto the MediaAsset row it creates. The
    // library never signed it, so every clip in the library rendered as its dimensions
    // while the poster sat in storage, already made and already paid for.
    const signed = [];
    const readUrl = async (key) => { signed.push(key); return `https://cdn.example/${key}?sig=abc`; };
    const out = await listAssets({ userId: 1 }, {
      assetModel: model([clip({ posterR2Key: 'atelier/video/1/poster.webp' })]), Op, readUrl,
    });
    expect(signed).toEqual(['atelier/video/1/poster.webp']);
    expect(out.assets[0].previewUrl).toContain('poster.webp');
  });

  it('NEVER falls back to the video file itself when there is no poster', async () => {
    // THE WHOLE REASON `previewKeyFor` IS ONE FUNCTION. The image path falls back to
    // `r2Key` because an image's original IS a picture. Copying that fallback to video
    // would sign an MP4 into an <img>: the browser cannot decode it, the card's onError
    // fires, and the operator sees the same grey box as before \u2014 now with a wasted
    // signature and a request for several megabytes of video behind it.
    const signed = [];
    const readUrl = async (key) => { signed.push(key); return 'https://cdn/x'; };
    const out = await listAssets({ userId: 1 }, {
      assetModel: model([clip({ posterR2Key: null })]), Op, readUrl,
    });
    expect(signed).toEqual([]);
    expect(out.assets[0].previewUrl).toBeNull();
  });

  it('audio follows the same one rule: poster if there is one, never the original', async () => {
    // Not a special case \u2014 a consequence. The rule is stated once, so a kind nobody
    // thought about behaves correctly without anybody deciding it should.
    const signed = [];
    const readUrl = async (key) => { signed.push(key); return 'https://cdn/x'; };
    await listAssets({ userId: 1 }, {
      assetModel: model([
        row({ kind: 'audio', r2Key: 'atelier/audio/1/take.mp3', posterR2Key: 'atelier/audio/1/cover.webp' }),
        row({ id: 'b', kind: 'audio', r2Key: 'atelier/audio/1/other.mp3', posterR2Key: null }),
      ]), Op, readUrl,
    });
    expect(signed).toEqual(['atelier/audio/1/cover.webp']);
  });

  it('a page of clips whose posters all fail IS a broken signer', async () => {
    // Video rows now count toward `attempted`, so the all-failed signal covers them. Before
    // this they were skipped, and a page of clips could never report a misconfigured signer.
    const readUrl = async () => { throw new Error('signature key missing'); };
    const out = await listAssets({ userId: 1 }, {
      assetModel: model([
        clip({ posterR2Key: 'atelier/video/1/a.webp' }),
        clip({ id: 'b', posterR2Key: 'atelier/video/1/b.webp' }),
      ]), Op, readUrl,
    });
    expect(out.previewsUnavailable).toBe(true);
  });

  it('a poster that will not sign costs its own card, not the clip beside it', async () => {
    let n = 0;
    const readUrl = async () => { n += 1; if (n === 1) throw new Error('object gone'); return 'https://cdn/ok'; };
    const out = await listAssets({ userId: 1 }, {
      assetModel: model([
        clip({ posterR2Key: 'atelier/video/1/a.webp' }),
        clip({ id: 'b', posterR2Key: 'atelier/video/1/b.webp' }),
      ]), Op, readUrl,
    });
    expect(out.assets[0].previewUrl).toBeNull();
    expect(out.assets[1].previewUrl).toBe('https://cdn/ok');
    expect(out.previewsUnavailable).toBe(false);
  });
});
```

### 7c. New block appended to `AtelierLibrary.test.tsx`

```tsx
describe('a clip is labelled, because its poster looks exactly like a still', () => {
  it('shows the kind for a video', async () => {
    const { api } = fakeApi({
      assets: [asset({ id: 'v1', kind: 'video', mime: 'video/mp4', previewUrl: 'https://cdn/poster.webp' })],
      hasMore: false, nextCursor: null, pageSize: 24,
    });
    render(<AtelierLibrary api={api} />);
    expect(await screen.findByText(/video/)).toBeInTheDocument();
  });

  it('does NOT label a still, because "image" on every card is noise', async () => {
    // The marker earns its place by being rare. Printing the kind unconditionally would put
    // the same word on every card in the common case and stop being read at all.
    const { api } = fakeApi({ assets: [asset()], hasMore: false, nextCursor: null, pageSize: 24 });
    render(<AtelierLibrary api={api} />);
    await screen.findByAltText(/lone red fox/);
    expect(screen.queryByText(/image/)).not.toBeInTheDocument();
  });
});
```

## 8. Falsification actually run

Each neuter applied, suite run, file restored from the scratchpad (not from git).

| Neuter | Reddened |
|---|---|
| `return row.r2Key \|\| null` — fallback made unconditional | exactly 7: the three `previewKeyFor` fallback assertions, the two library rows-with-no-poster assertions, the video no-fallback assertion, the audio rule assertion |
| `if (row.kind !== 'image') return null` prepended — old skip restored | exactly 6: poster-for-video, poster-for-unknown-kind, signs-the-poster, audio rule, all-clips-fail signer signal, one-clip-fails isolation |
| marker line deleted | exactly 1: "shows the kind for a video" |
| marker made unconditional | exactly 1: "does NOT label a still" |

## 9. Two existing test names were false and were changed

Neither test's behaviour changed; both still pass. Their names asserted something that
stopped being true the moment posters were signed for non-image rows.

- `does not sign non-image rows, which have no still to preview`
  → `signs nothing for a row with no poster and no viewable original`
- `a page with no image rows at all is not a signer failure`
  → `a page where nothing was signable is not a signer failure`

## 10. Sibling sweep

`grep -rn "generateThumbnailUrl\|readUrl\|getSignedUrl\|signedUrl" backend --include=*.mjs`
minus node_modules and tests. Three atelier siblings sign an asset, and all three correctly
want the ORIGINAL, so none carries this defect:

| Site | Signs | Correct because |
|---|---|---|
| `publishAsset.mjs:165,193` | `asset.r2Key` via `generatePlaybackUrl` | the published embed; for a clip the MP4 IS the artifact |
| `motionBind.mjs:157` | `ref.r2Key` via `generatePlaybackUrl` | the init image Motion animates must be the real bytes |
| `persistStills.mjs:265` | `row.r2Key` via `generatePlaybackUrl` | a still just made; `kind: 'image'` is hardcoded at :180 |

## 11. Verification

- Backend atelier glob: **574/574 across 40 suites** (was 560/560 across 39).
- Frontend studio: **138/138 across 15** (was 136/136).
- Full backend: **9851 passed / 6 failed** — +14 passed, the six unchanged.
- `backend-line-cap` CLEAN (253 and 106, both under 300 — the file was 292 before this slice).
- `frontend-guards` CLEAN. `scan-secrets.sh` CLEAN. Token registry CLEAN.
- `tsc --noEmit` on the touched `.tsx`: **exit 0**, read off the command, not after a pipe.

## 12. A correction to the handoff's baseline note

§5a of `ATELIER-SESSION-HANDOFF-2026-08-27.md` names eight suites as holding the six
baseline failures. That is wrong, and in a way that matters to anyone comparing runs.

The six FAILURES are in `equipmentScanService.multi` (1), `equipmentScanService.retry` (3),
`associationsModelRegistryParity` (1) and `phase1bControllers` (1) — and `phase1bControllers`
is not on §5a's list at all.

Five of the suites §5a names — `adminRoleEscalationMatrix`, `adminWaiverController`,
`adminWriteRoleEscalationMatrix`, `destructiveOwnershipMatrix`, `federatedAuthFoundation` —
do not fail. They do not LOAD. `jose` and `sanitize-html` are declared in
`backend/package.json` and absent from the shared `node_modules`, so those files raise a
collection error and their tests never run. Vitest reports 35 failed FILES and 6 failed
TESTS; reading the file count as the test count is how §5a's list was built.

Unloadable and failing are different facts. A suite that cannot load is not evidence of
anything, and counting it as a known failure hides a real one. Not reinstalled: three
agents hold locks on that tree (§11 of the handoff).

---

## What to attack

1. Is stating the rule once genuinely safer here, or does `previewKeyFor` hide a case that
   two explicit branches would have made visible?
2. `attempted` now counts video rows. Does the `previewsUnavailable` signal still mean what
   it says on a mixed page — some stills, some clips, some with posters and some without?
3. Is there a row shape where the new rule signs something the old one refused, that I have
   not considered? I know of one: an image with a poster and an empty `r2Key` is now signed
   where it was skipped. `persistStills` always writes `r2Key`, so I believe it unreachable.
4. The frontend marker is absent for `kind === 'image'`. Is there a surface where a video
   card renders WITHOUT `AssetMeta`, so the poster appears unlabelled after all?
5. Does anything else read `posterR2Key` and assume it implies `kind === 'image'`?

---

# ROUND 1 — GLM verdict and what came of it

**APPROVE. No P0, no P1.** Five P2s. Four were artifacts of what this packet did not show;
one was a real gap in my tests and is now closed. Full review:
`panel-2026-08-27-atelier-video-poster/GLM-PANEL-REVIEW.md`. Qwen did not run — the local
Ollama returned `fetch failed`, so this round is single-seat and I am saying so rather than
reporting a two-seat pass.

| # | Finding | Outcome |
|---|---|---|
| 1 | `previewsUnavailable` mis-signals on a page with exactly one signable row | **REAL, pre-existing, deliberately kept.** See below |
| 2 | `broken` map never resets, so an expired signature strands a card forever | **DISPROVEN** — `setBroken({})` at `AtelierLibrary.tsx:120`, on every fetch |
| 3 | `assetView` may drop `kind`, making the marker a silent no-op | **DISPROVEN** — `assetLibrary.mjs:181` returns `kind: row.kind`. But the *test gap was real*; closed below |
| 4 | The route's `readUrl` injection is asserted in a comment, never shown | **DISPROVEN** — `atelierComposeRoutes.mjs:118`, `readUrl: (key) => r2.generateThumbnailUrl(key)` |
| 5 | §10 sweeps signing sites only; never grepped `posterR2Key` readers or other card surfaces | **DISPROVEN, both** — see below |

## What I changed because of finding 3

GLM could not verify `assetView` passes `kind` through, and was right that it mattered: the
frontend test injects `kind` at its fake API, so it proves the card renders what it is given
and nothing about whether the server sends it. The passthrough exists — but by luck, not by
test. A backend assertion now runs it through the real `assetView`, and deleting
`kind: row.kind` reddens exactly that one test and nothing else.

This is the §7b class the workstream keeps producing: not a test that fails wrongly, a test
that passes without touching the thing it appears to be about.

## Finding 1, and why it stays

With exactly one signable row on a page, one failure IS every failure, so a purged poster
logs "the signer is likely misconfigured, not the objects" — the misdiagnosis that message
exists to prevent. Real. It predates this slice, and my change slightly widens it, because
video rows now count as attempts.

Kept anyway: `attempted >= 2` would make a genuinely broken signer report nothing on a
one-row page, and silence about a broken signer is the failure this whole signal was built
to end. Both thresholds have a wrong case; the current one errs loud. Recorded as backlog
rather than changed inside a slice about something else.

## Findings 5 — the two sweeps GLM asked for, run

`grep -rn "posterR2Key" frontend/src backend` — every hit: the two model declarations, the
two writers (`persistStills.mjs:180` for stills, `videoRenderJobService.mjs:279,301` for
clips), and `assetPreviews.mjs`. **No reader anywhere infers `posterR2Key != null ⇒ image`.**

`grep -rn "previewUrl\|AssetCard" frontend/src` — one other atelier surface renders a
library asset's preview: `AtelierReusedFrameNotice.tsx:18`, fed by `ContentStudioHub.tsx:197`.
It is reachable only through `onUse`, and `reusable()` returns `ok: false` for any
non-image, which disables the button. **No path renders a video poster without the marker.**

## What GLM could not verify, still open

Its "could not verify" list was accurate, which §6 says to expect. Left standing: whether
production strips `console.warn/error` (the telemetry rationale is half-solved if so); that
`kind` is lowercase across MediaAsset writers beyond the two named; and §12's dependency
diagnosis, which wants `npm ls jose sanitize-html` once the three agent locks clear.

## Round-1 verification

Backend atelier glob **575/575 across 40 suites**. Line cap, secret scan clean.

---

# ROUND 2 — both seats, and the one that went somewhere

**GLM: REVISE** (1 P1, 4 P2). **Qwen: APPROVE, no blockers** — its sixth-consecutive-approve
pattern from the handoff's §6 table, holding exactly true while GLM was still finding things.
That is the reason it is never a lone seat.

Reviews: `panel-2026-08-27-atelier-video-poster/GLM-ROUND-2.md`, `QWEN-ROUND-2.md`.

| # | Finding | Outcome |
|---|---|---|
| 1 (P1) | Tenant scoping asserted by convention, never shown | **DISPROVEN** — GLM's own downgrade condition is met |
| 2 | `findOrCreate` never backfills a poster on the found path | **CONFIRMED REAL.** Not mine to fix here; claim narrowed, backlog raised |
| 3 | An absent `readUrl` is the silent failure this slice vows to prevent | **CONFIRMED. Fixed** |
| 4 | Sparse mixed page misdiagnoses as "signer misconfigured" — wider than round 1's n=1 | **CONFIRMED. Fixed, GLM's way** |
| 5 | 35 failed files, 5 explained | **CONFIRMED, and it led somewhere real** |

## Finding 1 — disproven, twice over

`atelierComposeRoutes.mjs:99` mounts `/assets` behind `protect, adminOnly` and passes
`userId: req.user?.id` — from the authenticated session, never a parameter. There is no id
to tamper with. `buildAssetQuery` then **throws `E_BAD_OWNER` before building anything** if
`userId` is falsy, and `where` opens `{ ownerUserId: req.userId }` unconditionally. The
optional-clause style GLM correctly identified as lethal-if-applied-to-owner is applied only
to `kind`, `status` and the rest.

GLM wrote: "If `ownerUserId` is unconditional in `buildAssetQuery`, downgrade to waived."
It is. **Waived** — and the packet is at fault for making it askable, which is now four
findings across two rounds traceable to what I did not paste.

```js
export function buildAssetQuery(req = {}, { Op, fn, col, where: whereFn } = {}) {
  if (!req.userId) throw new ComposeError('E_BAD_OWNER', 'Listing assets requires an owner.');
  ...
  const where = { ownerUserId: req.userId };
```

## Finding 2 — real, and my claim was wrong

`videoRenderJobService.mjs:270` does `MediaAsset.findOrCreate({ where: { r2Key }, defaults: {
… posterR2Key: meta.posterR2Key ?? null … } })`. On the **found** path `defaults` are ignored,
and the `posterR2Key` written twelve lines later at `:301` belongs to `job.update(...)` — the
**VideoRenderJob**, not the asset. So a clip whose asset row was created before a poster
existed keeps `posterR2Key: null` forever, the job and the asset disagree, and this slice
cannot show a picture for it.

**"Every video in the library rendered as a grey box" was therefore right about the cause and
wrong about the coverage of the fix.** Corrected: every video *whose asset row carries a
poster* now shows it; a clip whose row was created on a poster-less declaration still will
not, and that is a defect in the writer, not the reader.

Not fixed here. It is a three-line backfill inside a transaction on the video job path, which
has its own lease and idempotency semantics — a different subsystem, and folding it into a
slice about the library is how "while I'm here" becomes the next incident. **Raised as
backlog #1**, ahead of the indexes, because it is the direct successor to this work.

## Findings 3 and 4 — fixed

**4 first, because GLM's fix is better than mine.** Round 1 recorded the false "signer is
likely misconfigured" claim as an n=1 curiosity and I kept it, reasoning that a quieter flag
means silence about a genuinely broken signer. GLM pointed out the scope was wrong — a
24-row page with 23 poster-less rows and one purged poster reaches `failed === attempted`
just as easily — and that the two concerns separate cleanly: **gate the CLAIM about cause,
not the flag.** The boolean stays loud at any size; the sentence asserting *why* now waits
for a second data point. That is what I wanted and could not see.

**3.** The `readUrl`-absent branch returned a full page of nulls with `previewsUnavailable:
false` and no telemetry — the "page of grey boxes with a 200 and nothing ever says otherwise"
that the per-row catch three lines below calls unacceptable. The rule was guarding one half
of a pair, in the module whose entire header is about not doing that. `reportNoSigner` now
warns when rows *were* signable, and stays quiet when there was nothing to sign, because an
empty page is no evidence about wiring. The boolean is unchanged: an absent signer is a
legitimate configuration, not a broken one.

Both falsified: removing the `attempted >= 2` gate reddens exactly the sparse-page test;
restoring `page.map(() => null)` reddens exactly the absent-signer test.

## Finding 5 — the one that mattered

I explained 5 of 35 files and called the rest "not evidence of anything". GLM said that was
faith. It was. Parsed properly, the 35 are:

| Count | Cause | Verdict |
|---|---|---|
| 10 | real test failures — the 6 counted, plus 4 files whose failures are *also* counted | genuine, pre-existing |
| 5 | `Cannot find package 'sanitize-html'` | declared dep, absent from the shared `node_modules` |
| 2 | `Cannot find package 'jose'` | same |
| 1 | `SyntaxError: Invalid or unexpected token` (`idorAuditReaderControls`) | undiagnosed |
| 1 | `__vite_ssr_import_1__.default.define is not a function` | undiagnosed |
| **15** | **`No test suite found`** | **not broken — written for a different runner** |

**Those 15 are `node:test` files, and nothing has ever counted them.**
`grep -l "node:test" backend/tests/unit/*.mjs` returns **18** files. Vitest cannot collect
them, lists them as failures, and reports zero of their tests. Under their own runner:

```
node --test $(grep -l "node:test" tests/unit/*.mjs)
→ exit 0 · # tests 188 · # pass 188 · # fail 0
```

**188 passing tests that appear in no number anyone has reported on this branch** — including
`swanLawFilter`, `swanLawFilter.corpus` and `swanPromptCompiler`, which are the brief
compiler and law filter the handoff's §1 names as core Atelier, and `forgeEndToEnd`,
`forgeAspectContract`, `variantRun`, `winnerAndCapability`, `contactSheet`, `capabilityHonesty`.

They are green today. The risk is not that they fail; it is that **when one starts failing,
every verification command in the handoff still reports a clean run.** A test that cannot be
seen to fail is the §7b class at the level of the harness rather than the assertion.

Not restructured here — moving 18 files between runners is a decision, not a slice, and it
belongs to whoever owns the backend test strategy. **Recorded, with the command that runs
them, so the next person can no longer not know.**

## Round-2 verification

Backend atelier glob **579/579 across 40 suites**. Line cap, secret scan clean.
Hidden `node:test` baseline established: **188/188, exit 0.**

---

# ROUND 3 — the round that caught me repeating the exact defect I had just written about

**GLM: REVISE** (2 P1, 3 P2). **Qwen: APPROVE**, raising the `node:test` blind spot as its
only P1 — which is the finding round 2 already recorded, so the seats agree it is real.

| # | Finding | Outcome |
|---|---|---|
| 1 (P1) | §4's paste shows neither round-2 fix; the packet asserts a fix and its absence | **CONFIRMED. §3 and §4 re-spliced from current source; §8 extended** |
| 2 (P1) | The found-path gap may cover most affected rows, and nothing measures it | **PARTLY. Narrower than stated — but unmeasurable here. Query handed to Sean** |
| 3 (P2) | `assetView` passthrough proven for `kind` only; five siblings same class | **CONFIRMED. Fixed** |
| 4 (P2) | `previewKeyFor(null)` throws, contradicting "never an error" | **CONFIRMED. Fixed** |
| 5 (P2) | The `previewsUnavailable` consumer is never shown | **CONFIRMED — and it reverses a round-2 decision** |

## Finding 5 — I made the pair defect while writing the commit message about pair defects

`previewsUnavailable` is not telemetry. Its only consumer is `AtelierLibrary.tsx:131 →
:178`, a page-wide banner:

> Previews are unavailable right now — this is a preview-signing problem, not a problem with
> your assets. Everything below is still here.

That is the **same causal claim** as the log sentence I gated in round 2, shown in the place
a person actually reads. On a 24-row page with 23 poster-less clips and one purged poster,
`attempted === failed === 1` and the operator is told previews are unavailable, which is
false: 23 rows never had one and the twenty-fourth lost an object.

I gated the log and left the banner. **One half of a pair — in the commit whose own message
was about not doing that.** Round 2's reasoning ("weakening the boolean trades a wrong
diagnosis for silence") was wrong because it treated the flag as telemetry; the telemetry is
the log, and the log now speaks at both branches. `previewsUnavailable` now requires
`attempted >= 2`, and nothing goes quiet: an n=1 total failure still warns, it just stops
asserting a cause nobody can know yet, in either voice.

## Findings 3 and 4 — fixed

`previewKeyFor(row = {})` defaulted only on `undefined`, so `previewKeyFor(null)`
dereferenced null and threw while the docstring above promised "never an error". The
existing test asserted `{}` and `undefined` and called that coverage. One `if (!row)` now
covers both, replacing a default that caught half — the same collapse-the-pair move as the
fix itself. Neutering it reddens **two** tests, including the old one, which is the proof it
was under-covering.

The `kind` assertion added in round 1 existed because a reviewer asked about `kind`. Every
sibling the card reads — `brandKit`, `lane`, `promptTruncated`, `width`, `height`, `status`
— was the same untested class. Fixing the one that was asked about and leaving five open is
the same habit again, so the seam is now asserted for the whole view shape at once.

## Finding 2 — narrower than stated, and honestly unmeasurable from here

GLM argues retried completions are the *common* path, making poster-less clip rows the
dominant population rather than the exception. I do not think that follows, and I cannot
prove either reading.

The asset row is created in the same transaction that flips the job to `ready`, so a single
declaration carrying poster meta writes the poster. The found path needs the **first**
declaration to have lacked poster meta and a **later** one to carry it — a narrower window
than "any retry". But the size of that window is a fact about production data, and this
environment has no database: the full-suite run fails Postgres connection with
`SASL: SCRAM-SERVER-FIRST-MESSAGE`, and I will not go looking for credentials to find out.

So the claim is scoped instead of measured, and here is the query that settles it:

```sql
SELECT count(*) AS clips_with_a_poster_the_library_cannot_show
FROM media_assets a
JOIN video_render_jobs j ON j.id = a.job_id
WHERE a.kind = 'video' AND a.poster_r2_key IS NULL AND j.poster_r2_key IS NOT NULL;
```

Zero means the found path never bit and the backlog item is theoretical. Non-zero is both
the size of the gap and the row set a one-statement backfill would repair — which sidesteps
the transactional writer fix GLM and I both wanted to avoid.

## Round-3 falsification

| Neuter | Reddened |
|---|---|
| `if (!row) return null` removed | 2 — the new null test **and** the old "empty row does not throw", proving that one was under-covering |
| `previewsUnavailable = totalFailure` (gate removed) | exactly 1 — the sparse-page test |
| `brandKit` dropped from `assetView` | exactly 1 — the whole-view-shape test |

## Round-3 verification

Backend atelier glob to be re-run at commit. Line cap and secret scan clean.

---

# ROUND 4 — four settled by evidence, one confirmed and handed on

**GLM: REVISE** (1 P1, 4 P2), while conceding "I found no defect in `previewKeyFor`/
`signPreviews` themselves". **Qwen: APPROVE, no blockers.** Every remaining finding was
either a fact I could settle with a command or code outside this slice. Settled below.

| # | Finding | Outcome |
|---|---|---|
| 1 (P1) | Sparse-page broken signer is observable only via `console.warn`, whose reachability is unverified | **Collapsed to P2 on GLM's own condition — console IS reachable** |
| 2 | `kind` casing load-bearing and unverified across writers | **SETTLED — there are exactly two writers and both are lowercase literals** |
| 3 | Unconditional poster preference with no freshness invariant | **SETTLED — nothing anywhere mutates `r2Key` on an existing row** |
| 4 | Writer `findOrCreate` scopes on `r2Key` alone, not owner | **CONFIRMED REAL. Out of slice — attached to backlog #1** |
| 5 | `assetView` load-bearing but never pasted | **CONFIRMED. Spliced as §4b** |

## 1 — console is reachable, so this is a P2

GLM: "collapses to P2 the moment someone shows `[Atelier/library]` in shipped logs."

`backend/package.json` has **no build step and no bundler** — `start` is
`node scripts/render-start.mjs`, and the dependency set contains no esbuild, webpack, rollup,
terser, vite or tsup. The source runs as written; `console.warn`/`console.error` go to
stderr, which Render captures. Nothing strips them.

Separately: `backend/utils/logger.mjs` exists and **no atelier module imports it** — four use
raw `console`. So this module matches its neighbours, and switching only this one would be
the inconsistency. Whether the subsystem should move to the structured logger is a real
question and a subsystem-wide one; noted, not answered inside a slice about posters.

What survives, and honestly: on a page where **nothing** is signable (`attempted === 0`) a
broken signer is undetectable. That is not a gate I chose — there is no evidence to have.

## 2 — settled, and stronger than the packet claimed

`grep -rn "MediaAsset.create\|MediaAsset.findOrCreate\|MediaAsset.bulkCreate\|MediaAsset.upsert" backend`
returns **exactly one** hit outside tests: `videoRenderJobService.mjs:271`. The only other
writer constructs its row through the atelier persist path at `persistStills.mjs:180`.

- `persistStills.mjs:180` → `kind: 'image'`
- `videoRenderJobService.mjs:276` → `kind: 'video'`

Both lowercase literals, and there is no third writer to drift. The packet said "only two
writers verified"; the accurate statement is **there are only two writers**.

## 3 — settled, with a real invariant to record

`grep -rn "\.update(" backend | grep -iE "r2Key|posterR2Key"` returns one hit:
`persistStills.mjs:217`, `row.update({ posterR2Key: thumbKey })` — it sets a poster and
never touches `r2Key`.

**No code path anywhere mutates `r2Key` on an existing row.** The stale-poster failure GLM
describes — a card confidently showing the wrong picture, which is worse than a grey box
because nobody notices — has no producer today. Worth stating in `MediaAsset` as an
invariant rather than leaving as an accident, and that is where it goes.

## 4 — confirmed, and the more serious half of backlog #1

```js
const [asset] = await MediaAsset.findOrCreate({
  where: { r2Key },          // <- owner is in `defaults`, not in the lookup
```

On any `r2Key` collision across tenants — a keygen regression, an import, seeded data — a
completing render **finds another tenant's row**. The finder's asset never appears in their
library, because `ownerUserId` stays the original owner's, and nothing errors.

Round 2 read these exact lines hunting the poster gap and did not see the where-clause.
Conditional on a collision, and the fix rides the same transaction as the poster backfill,
so it joins backlog #1 rather than becoming a second item. **Backlog #1 is now two defects
in one `findOrCreate`, not one.**

## Round-4 verification

No code changed this round — four findings were settled by evidence and one is out of slice.
Packet gained §4b. Backend atelier glob unchanged at **581/581 across 41 suites**.

---

# ROUND 5 — one real hole, one fabricated P0

**GLM: REVISE** (1 P1, 2 P2) — "the slice itself is approve-grade". **Qwen: REJECT** on a
**P0 that does not exist.**

| # | Finding | Outcome |
|---|---|---|
| GLM 1 (P1) | A signer that *resolves falsy* threads between both existing guards | **CONFIRMED. Fixed** |
| GLM 2 | The tenant-scoping half of backlog #1 is one line and shouldn't be bundled | **Real, narrower than stated. Deferred — with a reason that isn't tidiness** |
| GLM 3 | `persistStills` write-order asserted, not shown | **DISPROVEN — `putObject` then `row.update`, :214→:217** |
| Qwen 1 (P0) | Pagination broken; `hasMore` always false | **FABRICATED — see below** |

## GLM 1 — the third signer mode, and the best catch of the loop

This module guarded an **absent** signer (`reportNoSigner`) and a **rejecting** one (the
catch, which also covers a synchronous throw). It did not guard **present, called, resolves
`undefined`** — and that threads between both: every card null, `failed` never incremented,
so `failed === attempted` is false, no banner, no log, HTTP 200.

Byte for byte the "page of grey boxes with a 200 and nothing ever says otherwise" this file
twice calls unacceptable — **reopened through the one seam the fix did not cover, in the
module whose header is about exactly that.** That is the fourth time this loop has found the
half-of-a-pair shape, and the second time inside my own fix for it.

`generateThumbnailUrl` returns `await getSignedUrl(...)` with no falsy return path, so it is
unreachable through today's wiring — which is GLM's own collapse condition to P2. Guarded
anyway, because `readUrl` is an **injected seam**: the guard belongs to the contract, not to
the one implementation that currently satisfies it. Treating it as failed is what makes the
existing banner and log work unchanged.

Falsified: removing `if (!url) throw` reddens exactly the two failure tests and leaves the
"a real URL is still passed through" test green — so the guard does not eat the success path.

## GLM 2 — real, narrower than stated, and deferred for a reason that is not tidiness

GLM is right that `where: { r2Key, ownerUserId: job.userId }` is one line, and right to
challenge bundling. Two corrections from the code:

- **Its own caveat holds for stills.** `stillObjectKey` is `atelier/stills/<owner>/<sha256>.<ext>`
  — the owner is *in the key*, so cross-tenant collision is structurally impossible there.
- **It is not a leak.** Video keys are `jobs/<jobId>/…` via `r2KeyForJob`, which — worth
  noting — **is never called to validate `completeJob`'s caller-supplied `r2Key`**. So a
  lease-holder can declare any string. But the found row stays owned by its original owner
  and the library is owner-scoped, so nothing of the victim's is exposed. The harm is that
  **the completer's own asset silently never gets created**. Data integrity, not disclosure.

Deferred because **I cannot falsify a fix here.** `videoRenderJobService.test.mjs` says in
its own header that it covers only paths running *before* database access, and that the
leasing paths "need Postgres and are covered by the integration suite". This environment has
no Postgres. An unfalsifiable fix is not a fix — that is the standing rule of this workstream,
and it applies to fixes I would like to make as much as to ones I would not.

**Backlog #1 remains one edit with two defects in it**, now both written out, so whoever has
a database can fix and prove them together.

## Qwen — a REJECT built on a premise it did not read

Qwen's P0: `findAll({ limit: q.limit })` then `hasMore = rows.length > q._pageSize`, "if
`q.limit` equals `q._pageSize` (**standard implementation**)", `hasMore` is always false.

`assetLibrary.mjs:159-160` returns **`limit: limit + 1, _pageSize: limit`** — the
fetch-one-extra pattern. The two fields are distinct precisely so this works, the §5 paste
shows both, and Qwen substituted an assumption for the line in front of it. Its P1 then
argued a race, wrote "This is handled", and swapped in a claim about the `broken` map that
round 1 had already disproven at `AtelierLibrary.tsx:120`.

Worth recording against the handoff's §6 table, which has Qwen at six consecutive APPROVEs —
"right that the core held; wrong that nothing remained." It has now produced the opposite
error on the same code. **Both failure modes, one workstream: its verdicts carry no
information in either direction.** GLM found something real in five rounds out of five.

## Round-5 verification

Backend atelier glob **584/584 across 41 suites**. Line cap and secret scan clean.

---

# ROUND 6 — the round that found the reason this slice needed a guard of its own

**GLM: REVISE** (1 P1, 3 P2). **Qwen: APPROVE**, no blockers — one round after its
fabricated P0.

| # | Finding | Outcome |
|---|---|---|
| 1 (P1) | Round 5's "not a leak" is unproven and probably false — the *created* path takes a caller-supplied `posterR2Key` | **CONFIRMED. Round 5 was wrong. Guarded in this module** |
| 2 | `previewsUnavailable`'s consumer untested; the fake omits the field | **PARTLY — a positive test existed; negative and absent cases did not. Added** |
| 3 | 44px / tokens / contrast unverifiable from the packet | **DISPROVEN — `buttonBase` carries `min-height: 44px`** |
| 4 | `seed: Number(tag('seed'))` yields NaN → silently `null`, and `tag('seed')` runs twice | **CONFIRMED. Fixed** |

## Finding 1 — I classified this wrongly one round ago, and my own change is the enabler

Round 5 called the writer defect "data integrity, not disclosure". **That analysed only the
*found* path.** GLM analysed the *created* path, and it is worse:

`POST /api/render-agents/jobs/:jobId/complete` (`renderAgentRoutes.mjs:176`) does
`const { r2Key, mime, ...meta } = req.body` and spreads `...meta` into `completeJob`, whose
signature is `({ jobId, agentId, r2Key, mime = 'video/mp4', ...meta })`, and which writes
`posterR2Key: meta.posterR2Key ?? null` into `MediaAsset` defaults. **Nothing validates it** —
`verifyObject` checks `r2Key` only. `generateThumbnailUrl` (`r2StorageService.mjs:177`)
presigns whatever key it is handed, with no prefix restriction.

So an enrolled render agent can store, on a row it legitimately owns, a poster key pointing
anywhere in the bucket — and the Assets tab signs it and renders it in an `<img>`.

**Before this slice that was inert**, because the library refused to sign non-image rows.
**Signing video posters is precisely what would have armed it.** And the payload has no
legitimate producer: `grep` finds no caller anywhere in this repository that supplies a video
`posterR2Key`. The only population the feature could serve today is planted keys.

So this is not a backlog item to hand on. It is the security of the code I wrote.
`previewKeyFor` now signs a key only if it carries the row's `ownerUserId` as a path segment
— which is the convention every key this codebase writes already follows
(`atelier/stills/<userId>/…`, `atelier/stills/<userId>/thumbs/…`) and `ownerUserId` is
`allowNull: false`, so it is always there to check against. Applied through **one predicate to
both candidates**, so it cannot be the half-of-a-pair the rest of this document is about.

Fail closed: an unrecognised key yields a placeholder. Trusting it yields a signed URL for
someone else's object. **Note for whoever writes a real video-poster producer: put the owner
in the key**, or this will correctly refuse to show it.

The writer still needs its own fix — a reader should not be the last line — and that joins
backlog #1, whose entry is now three defects in one statement: the missing owner in the
`findOrCreate` lookup, the un-backfilled poster on the found path, and unvalidated `meta`.

Falsified: disabling the ownership check reddens exactly the four tests that assert it,
including one proving the match is on a whole path segment (owner `7` is not satisfied by
`atelier/stills/77/…`).

**Correction to this packet's own record: round 5's "not a leak" is withdrawn.** It was
reasoned from one of the two paths and stated as though it covered both.

## Findings 2 and 4 — fixed

`assetView` computed `tag('seed')` twice and did `Number(...)` without a finite check, so a
tag like `seed:v2` produced `NaN`, which `JSON.stringify` emits as `null`. The client
received a null seed with nothing logged and no error, and the render lost its reproduction
anchor silently. Parsed once, accepted only if finite.

GLM was half right about the banner: a positive test existed ("when EVERY preview fails, the
page says it is the signer"). The **negative** cases did not — `previewsUnavailable: false`,
and a page omitting the field entirely, which must read as false rather than truthy-undefined.
Both now render the component and assert the notice's absence. Neutering `setPreviewsDown`
reddens the existing test and mine together.

## Finding 3 — disproven, packet fault again

`buttonBase` (`CreatorRenderQueue.styles.ts:143`) is `min-height: 44px` (rule 2), written
with the `css` helper (rule 43), focus ring `var(--accent-secondary, #8B5CF6)` — a
token-with-fallback (rule 6). `QuietButton` composes it. The card render was pasted; the
styles were not. Sixth finding in six rounds traceable to what the packet omitted.

## Round-6 verification

Backend atelier glob **593/593 across 41 suites**. Frontend studio **141/141 across 15**.
Line cap and frontend guards clean on all six touched files.

---

# ROUND 7 — both seats independently found the same thing, and they were right

**GLM: REVISE** (3 P1, 2 P2). **Qwen: REVISE, P0** — and for once its blocker is real, and
**identical to GLM's first one**. Two seats converging independently is the strongest signal
this loop has produced.

| # | Finding | Outcome |
|---|---|---|
| 1 (both) | The guard encodes the *stills* convention, so a legitimate video poster fails closed | **CONFIRMED. Guard rewritten** |
| 2 (GLM) | Segment-anywhere: `jobs/7/…` passes for owner 7 where 7 is a *job* id | **CONFIRMED. Same rewrite** |
| 3 (GLM) | `publishAsset` signs the same unvalidated field; §10 blessed it with the wrong question | **CONFIRMED. Guarded, both sites** |
| 4 (GLM) | `attempted >= 2` cannot separate purge from broken signer | **DISPROVEN — on a premise the module already states** |
| 5 (GLM) | The marker's contrast is unverified | **DISPROVEN — computed 6.22:1** |

## Findings 1 and 2 — my guard was wrong in both directions at once

Round 6's `keyBelongsTo` asked only *"does the owner's id appear as some segment"*. That was
written against `persistStills`' convention and applied to two writers.

- **Too strict.** A legitimate video poster is `jobs/<jobId>/…` (`r2KeyForJob`,
  `videoRenderJobService.mjs:55`) and contains no user id at all. Every properly-produced
  clip would have failed closed into the exact grey box this slice exists to remove — the
  headline dead on arrival, and the docstring asserting a convention that is true of one
  writer would have become the documentation future writers trusted.
- **Too loose.** `jobs/7/frame.webp` passed for owner 7, where that `7` is a **job** id in
  another tenant's namespace — the precise signed URL the guard exists to refuse.

A rule derived from one half of a pair and applied to both. **In the guard against that
defect.** Fourth distinct instance in this slice; both seats saw it and I did not, across
six rounds of attacking exactly this shape.

`keyOwnedByRow(key, row)` now checks **namespace and position, anchored to an id on the
row** — never a value from the payload:

```
atelier/stills/<ownerUserId>/…    persistStills.mjs:52, stillThumbnail.mjs:35
jobs/<jobId>/…                    r2KeyForJob, videoRenderJobService.mjs:55
```

`jobId` is a UUID, so it cannot collide with a numeric user id — the `jobs/7/…` attack is
structurally dead, not merely filtered. Empty and relative segments are refused: S3 keys are
opaque and do not resolve `..`, so that is not traversal defence, it keeps the invariant
small enough to state.

It lives in **its own module** (`assetKeyOwnership.mjs`) because it now has two consumers.
Copying it into `publishAsset.mjs` would have been the duplication this entire document is
about, committed inside the fix for it.

## Finding 3 — I cleared this myself, with the wrong question

§10's sweep asked *which object* each signing sibling reads and never *whose*. `publishAsset`
signs `asset.r2Key`, which on a video row arrives from the same unvalidated request body.
`resolvePublic` is worse than GLM stated: it is **mounted without auth**, so a planted key on
a published row becomes a *public* signed URL for another tenant's object.

Both sites now apply the same predicate — `publishedReference` withholds the reference and
says why; `resolvePublic` resolves to nothing.

**And the guard was untested when first added.** The publish fixture uses
`atelier/stills/1/x.png` with `ownerUserId: 1`, so it passes the check and never exercises
it: neutering the predicate left all 15 tests green. Found by falsifying rather than by
reading, which is the only thing that has ever found this class here.

## Finding 4 — disproven by a line the module already contains

GLM: a lifecycle purge kills two posters, `attempted === failed === 2`, banner blames the
signer. **Presigning never touches storage.** `generateThumbnailUrl` builds a SigV4 URL
locally, so a purged object *signs fine* and 404s later in the browser, where `onError`
turns it into a placeholder. `signPreviews`' own comment says so: *"presigning is a local
HMAC, not a network call."*

A sign-time failure can therefore only be configuration or credentials — which is what the
banner claims. **This also corrects my round-3 rationale**, which argued from "one purged
object" as though a purge could fail signing. The gate survives on the weaker ground that a
sample of one should not assert a cause; the vivid example I used was wrong.

## Finding 5 — disproven with a number

The marker inherits `AssetMeta span { color: var(--text-secondary, rgba(224,236,244,0.62)) }`
over `AssetCard`'s `var(--surface-dark, #1A1A24)`. Composited: `rgb(149,156,165)`.
**6.22:1** against the card — above the 4.5:1 rule. (`strong` is 14.36:1.)

## And something I found while counting: the handoff's verification command is blind to new files

§5's backend command selects test files by KEYWORD. `assetPreviewKey.test.mjs` matches none
of them, so **20 tests — every ownership-guard assertion, the security-critical ones — are
invisible to the command the handoff tells the next agent to trust.**

It also means my own round numbers were not continuous: from round 2 I had quietly widened
the glob with `assetPreview`, so "560 → 593" was never the same command twice. Stated plainly
rather than left to look like growth.

- Handoff's glob, unchanged, now: **582/582 across 40** (was 560/560 across 39)
- Extended to cover every file this slice touches: **696/696 across 53**
- Full backend: **9879 passed / 6 failed** — the same six, +42 passed

A keyword glob cannot see work that does not exist yet. Same class as the `node:test` blind
spot from round 2: a test that cannot be seen to fail. Recorded for whoever fixes either.

## Round-7 verification

Falsifying the predicate reddens **10** tests across both consumers. Frontend **141/141**.
Line cap and secret scan clean on all six touched backend files.
