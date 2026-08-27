/**
 * assetPreviews.mjs — turning a row into a picture a person recognises.
 * ============================================================================
 *
 * Extracted from `assetLibrary.mjs` when that file crossed the 300-line cap. The
 * boundary is a real one rather than a convenient one: choosing WHICH object a card
 * shows, signing it, isolating a failure to its own card, and telling a broken signer
 * apart from a broken object are one concern, and nothing else in the library needs
 * any of it.
 *
 * NOTHING HERE IS A REQUIREMENT. Every path degrades to a null preview and a card that
 * falls back to its dimensions. A page that 500s because of a thumbnail is a worse
 * library than one with a missing thumbnail.
 */

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
      return Promise.resolve().then(() => readUrl(previewKey)).catch((err) => {
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
  const previewsUnavailable = attempted > 0 && failed === attempted;
  if (previewsUnavailable) {
    // THE FLAG IS LOUD AT ANY SIZE; THE DIAGNOSIS IS NOT.
    //
    // `failed === attempted` on a page with ONE signable row is not evidence of a broken
    // signer — it is one purged object, and a page of 24 rows where 23 have no poster
    // reaches that state as easily as a page of one. Asserting "the signer is likely
    // misconfigured" there is an actively wrong diagnosis, which is precisely what this
    // message was written to prevent, inverted.
    //
    // Weakening the BOOLEAN would trade that for silence about a genuinely broken signer,
    // and silence is the failure the signal exists to end. So the flag stays as it was and
    // only the claim about CAUSE waits for a second data point.
    if (attempted >= 2) {
      console.error('[Atelier/library] ALL %d previews failed to sign — the signer is likely misconfigured, not the objects.', attempted);
    } else {
      console.warn('[Atelier/library] the page\u0027s only signable object failed — one bad object and a broken signer are indistinguishable at n=1.');
    }
  }
  return { previews, previewsUnavailable };
}
