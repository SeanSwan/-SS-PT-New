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

import { keyOwnedByRow } from './assetKeyOwnership.mjs';

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
  // `failed === attempted` with ONE signable row is a sample of one. A 24-row page where 23
  // rows have no poster reaches that state as easily as a page of one, so this is not an
  // edge case, it is Tuesday.
  //
  // THE REASON IS THE CONTRACT, NOT TODAY'S IMPLEMENTATION. An earlier version of this
  // comment argued from a purged object failing to sign. That was wrong and is withdrawn:
  // `generateThumbnailUrl` builds a SigV4 URL locally — see "a local HMAC, not a network
  // call" below — so a purged object signs fine and 404s in the browser, where onError
  // turns it into a placeholder. Under TODAY'S signer a lone failure really is signer-side.
  //
  // But `readUrl` is INJECTED, and the contract does not promise a signer never touches the
  // object. One that did could fail per-object, and then a page-wide "this is a
  // preview-signing problem" would be a false statement to the operator. That is the same
  // reasoning as the falsy-resolution guard below — defend the seam, not the one
  // implementation currently behind it — and the cost is one sentence withheld in a shape
  // where a person still gets a placeholder and a log line.
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
      console.warn('[Atelier/library] the page\u0027s only signable object failed — a sample of one cannot tell a bad object from a bad signer.');
    }
  } else if (failed >= 2) {
    // PARTIAL FAILURE IS THE SHAPE THIS SLICE CREATES, AND `totalFailure` CANNOT SEE IT.
    //
    // `failed === attempted` fires only when EVERYTHING fails. A signing credential or KMS
    // policy scoped to `atelier/*` would sign every still and refuse every clip: on a mixed
    // page the flag stays false, the banner never renders, and the operator sees a library
    // where photographs work and every video is a grey box, with nothing saying why.
    //
    // That is the silence this module's header calls unacceptable, arriving through the
    // page shape the video-poster feature itself introduced — a rule covering only the
    // all-or-nothing half of its own pair. NOT raised to the banner: a partial failure is
    // genuinely not "previews are unavailable", and saying so would be the false page-wide
    // claim rounds 3 and 8 were about. Logged, so it is findable.
    console.warn('[Atelier/library] %d of %d previews failed to sign while others succeeded — a partial failure the page-wide signal cannot show. Check whether the signer scope covers every key namespace.', failed, attempted);
  }
  return { previews, previewsUnavailable };
}

// Re-exported so the preview tests and any future preview-side caller reach it from here.
export { keyOwnedByRow };
