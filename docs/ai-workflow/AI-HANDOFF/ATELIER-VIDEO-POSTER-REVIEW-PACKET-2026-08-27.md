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

## 3. `previewKeyFor` — WHOLE

```js
/**
 * WHICH OBJECT A CARD SHOWS — one rule, deliberately not two branches.
 *
 * A card is a picture of the asset. Two facts decide the key, and they compose:
 *
 *   1. A poster is ALWAYS preferred when one exists. It is the ~30 KB WebP the
 *      thumbnail slice writes for a still, and the frame the video job service
 *      records for a clip. Same column, same meaning, same precedence.
 *   2. Falling back to the primary object is legitimate ONLY when that object is
 *      itself a viewable still. `r2Key` on an image row is a PNG an <img> renders;
 *      on a video row it is an MP4, and signing it hands the browser a movie to
 *      decode as a picture — a guaranteed onError and a wasted signature. On an
 *      audio row there is nothing to look at at all.
 *
 * WHY THIS IS ONE FUNCTION AND NOT AN `if (kind === 'video')` BESIDE THE IMAGE PATH.
 * The dominant defect class in this subsystem is a rule applied to one half of a
 * pair — sixteen of the review loop's thirty-one defects — and in every case the
 * comment above the code was accurate about the branch its author was looking at.
 * Adding guards never stopped it; deleting the second copy did. So the poster
 * preference is stated ONCE and the fallback carries its own condition, rather
 * than an image branch and a video branch that must be remembered together.
 *
 * Returns null when there is nothing showable — a degraded card, never an error.
 */
export function previewKeyFor(row = {}) {
  if (row.posterR2Key) return row.posterR2Key;
  return row.kind === 'image' ? (row.r2Key || null) : null;
}
```

## 4. `signPreviews` — WHOLE

Extracted from `assetLibrary.mjs` when my first pass took that file from 292 to 328 lines,
over the 300 cap. The body below is byte-identical to what was inline except for the three
lines that call `previewKeyFor`.

```js
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
      return Promise.resolve().then(() => readUrl(previewKey)).catch((err) => {
        failed += 1;
        // Per-row degradation must still be VISIBLE somewhere. Silent isolation turns a
        // rotated secret into a page of grey boxes with a 200 and no telemetry — the
        // operator concludes their renders are broken, and nothing ever says otherwise.
        console.warn('[Atelier/library] preview signing failed for asset %s: %s', r.id, err?.message || err);
        return null;
      });
    }))
    : page.map(() => null);

  // ONE bad object is isolation working. EVERY object failing is a broken signer, and
  // those are different facts that must not look identical to the person reading the page.
  const previewsUnavailable = attempted > 0 && failed === attempted;
  if (previewsUnavailable) {
    console.error('[Atelier/library] ALL %d previews failed to sign — the signer is likely misconfigured, not the objects.', attempted);
  }
  return { previews, previewsUnavailable };
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
