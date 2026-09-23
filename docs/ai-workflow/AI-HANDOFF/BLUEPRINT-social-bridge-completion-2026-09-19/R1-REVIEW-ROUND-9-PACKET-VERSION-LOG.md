# Round-9 packet — version log

Two builds exist because the source changed between them. Recorded so the review's target is
unambiguous: a review is only interpretable against the exact bytes it read.

| Build | sha256 | Lines | Bytes | Dispatched to Astra? |
|---|---|---|---|---|
| v1 | `81ee0b868e79a1e6aad7ac2392121b8147bae2cecaee680a349bac97004bdc59` | 2789 | 144,036 | **YES — this is the packet round 9 reviewed** |
| v2 | `286da87b6897ef6e11b97c36dcbc504775254e9458174cd66c66444aa1330c2d` | 2804 | 145,270 | no |
| v3 | `d04326797fcb3d712fbb660fcdeeb5719a5f4aecee03fdce12c26e7d635ef211` | 2888 | 152,012 | no — **post-fix rebuild, NOT a review target** |

**Read the `sha256` column against the file on disk, not against this line.** The packet is
regenerated whenever its inlined source or its builder changes, so its hash moves; the row that
must never move is **v1**, which identifies the bytes round 9 actually adjudicated.

## Why v2 exists, and why it does not invalidate the review

v2 differs from v1 in **one artifact only**: `backend/services/spotlightImageUrlPolicy.mjs`,
which changed from sha256 `6ec126d3c5529032…` (227 lines) to `f6eeb49cbe2547ee…` (242 lines).

The change is a **COMMENT-ONLY** addition under `lookupWithTimeout`, recording round 8's C10 item
(3): that the DNS timeout bounds the CALLER's wait but cannot cancel the underlying
`dns.promises.lookup`, because that API takes no `AbortSignal` and returns a bare Promise.

**No executable line changed.** Verified: the suite is green before and after
(4 files, 52 tests passed), and the diff is confined to the docblock.

## Why that is acceptable for this round

Round 9's claims C1–C9 are about D1, D2, D3, D4 and the extraction of the classifier. **C10 item
(3) is not among them** — it is one of round 8's six acknowledged limitations, and v2's comment is
the author documenting it rather than a change under review. So the packet Astra read contained
every artifact C1–C9 are decided against, at the same bytes as v2:

- `spotlightImageFetch.mjs`, `addressClassification.mjs`, `applaudAudioFetcher.mjs`,
  all five test files, both commits, and the round-8 review are **byte-identical in v1 and v2**.

## If a future round needs v2 reviewed

Not necessary for C1–C9, but if C10 item (3) is ever promoted to a claim, v2 is the packet to send
and the reason to send it is this table.

## Post-review drift — and a builder defect that was hiding behind it

After round 9 returned, its findings were fixed, which is _by definition_ a divergence between the
packet's inlined source and the repository. Re-running `node verify-r9-packet.mjs` on the current
tree therefore reports mismatches, and some of that is the correct result, not a defect.

**But the first reading of that mismatch count was wrong, and the way it was wrong is worth
recording.** The verifier reported:

```
MISMATCH backend/services/addressClassification.mjs
MISMATCH backend/services/spotlightImageUrlPolicy.mjs
MISMATCH backend/services/spotlightImageFetch.mjs
MISMATCH backend/services/applaudAudioFetcher.mjs
MISMATCH backend/tests/unit/spotlightImageTransportPin.test.mjs
MISMATCH backend/tests/unit/spotlightImageDnsPin.test.mjs
MISMATCH backend/tests/unit/spotlightImageLifecycle.test.mjs
MISMATCH backend/tests/unit/spotlightImageAdmission.test.mjs
MISMATCH backend/tests/helpers/spotlightImageFixtures.mjs
MISMATCH Z:/HostileReviews/2026-09-21-163103-social-bridge-round-8-astra-s-dns-pin-review.md
MISMATCH docs/.../DNS-PIN-MUTATION-RECORD-2026-09-21.md

verified against disk: 11 | mismatched: 11 | absent: 0
```

**Eleven of eleven.** Not the six the earlier draft of this log claimed, and not a pattern that any
theory of "the fixes changed six files" can explain: `spotlightImageUrlPolicy.mjs` was not touched
by any round-9 fix, and `spotlightImageAdmission.test.mjs` was not either.

The cause was found by measuring per block rather than theorising. For every one of the eleven, the
**embedded body and the file on disk agreed exactly** (`sha256(body) == sha256(disk)`,
first differing line: none). What disagreed was the packet's **own header**, which is what the
verifier compares against. In `build-round9-packet.mjs` the header was computed on the raw text:

```js
sha256 \`${sha256(text)}\` · ${lines(text)} lines`   // UNSTRIPPED
'```' + lang, text.replace(/\s+$/, ''), '```',      // STRIPPED when embedded
```

so the header described a byte-string that appears nowhere in the packet. Every artifact whose file
ends in a newline — i.e. essentially all of them — mismatched on re-read. The line counts were wrong
in the same way: `spotlightImageDnsPin.test.mjs` claims **286** lines and its file ends in **two**
newlines, so the embedded body has 285.

Fixed by normalising once and describing what is embedded (`normalise()` + `block()` in the builder).

**Proven load-bearing by mutation.** Reverting only the header back to the unstripped text
reproduces the failure exactly — `11 mismatched`, exit 1 — and restoring the fix returns
`mismatched: 0`, exit 0. The verifier's non-zero exit was also confirmed on the failing path
independently of any shell pipeline.

### What this changes about rebuilding

The packet **was rebuilt** from the fixed tree, and that was correct. The earlier draft of this log
instructed "do not fix this by rebuilding the packet" on the theory that the mismatches were
legitimate drift. That instruction was right in spirit — a rebuilt packet must never be passed off
as what round 9 read — but it was applied to the wrong symptom: the eleven mismatches were a defect
in the packet's integrity metadata, and leaving them would have left a packet whose hashes could not
be checked at all.

What preserves the review's interpretability is not the stale packet; it is **this version log**,
plus the `v1` row above naming the exact sha256 Astra reviewed. A rebuilt packet is labelled as
post-fix in the `Integrity` section below and must not be represented as the round-9 target.

| File | Finding it changed for | Landed in |
|---|---|---|
| `addressClassification.mjs` | 1 (classifier fails open) | `67de00ee0` |
| `spotlightImageFetch.mjs` | 2 (error path does not release) | `7a23939cf` |
| `applaudAudioFetcher.mjs` | 5 (rebinding overclaim) | `7a23939cf` |
| `spotlightImageTransportPin.test.mjs` | 5 (`pinned[0]` overclaim) | `7a23939cf` |
| `spotlightImageLifecycle.test.mjs` | 2 + 3 (error path, settlement) | `7a23939cf` |
| `spotlightImageFixtures.mjs` | 3 + 5 (settlement marker, stub claim) | `7a23939cf` |

A round-10 packet is the right instrument for verifying the fixes. This packet is the record of what
round 9 read, plus an honestly-labelled post-fix rebuild.

## Integrity

`node verify-r9-packet.mjs` re-reads every inlined artifact and compares it against the file it
claims to be. It accepts a block as verified **EXACT** (disk bytes are the embedded bytes) or
**REDACTED** (disk bytes with the documented operator-path redaction reproduce the header), so a
correctly-redacted block is not reported as a permanent false mismatch.

- On **v1** (the packet round 9 reviewed): the verifier caught the v1→v2 drift itself, which is the
  point of having it — the mismatch was reported before it could be mistaken for a clean packet.
- On the **rebuilt post-fix packet**: `11 verified against disk, 0 mismatched, 0 absent`, of which
  **1** verified only under the documented redaction (the round-8 review, which lives outside the
  repo at `Z:\HostileReviews\` and whose absolute path is redacted by design).
- Exit code is **1** whenever any block mismatches. Verified on the failing path.

