# Round-10 packet — version log

Round 10 exists because **round 9's own packet contained a claim its artifact did not support.**

Round 9's finding-2 fix called `response.body.cancel()` to release the response body on the error
path. That call throws:

```
Invalid state: ReadableStream is locked
```

once `getReader()` has taken the lock, and an empty `catch` swallowed it. The fix was written,
reviewed, committed (`7a23939cf`), and described as complete — **and it did nothing.** It was caught
only because a *different* finding (finding 3) forced settlement to be recorded after the await.

That is the defect class round 10 is built to hunt: not *"is the code wrong"* but *"does the
evidence for 'the code is right' actually entail it?"*

## Builds

| Build | sha256 | Lines | Bytes | Blocks | Dispatched to Astra? |
|---|---|---|---|---|---|
| v1 | `01e44ae2b550545c2b7263609a88ce0575d80c60c18fe1b5e3234bc30909f853` | 8975 | 465,237 | 15 (14 hashed) | **YES — this is the packet round 10 reviewed** |
| v2 | `3346b22771d9037f10efa93de1d02305fba984d13188c4e8892b646b32a69fc2` | 9041 | 469,201 | 14 hashed | **NO — not a review target; a re-sync** |

The packet is committed as `62aba3cd1`. If it is rebuilt, its hash moves; **the row above identifies
the bytes round 10 actually adjudicated** and must not be treated as interchangeable with a later
rebuild.

## v2 — a re-sync, and the staleness the hardened verifier caught

After the per-block representation fix (see below), `verify-r10-packet.mjs` reported **two genuinely
stale blocks** — and the distinction mattered, because the *previous* run had reported two **false**
ones. The fix is what makes the two cases tellable apart:

```
  STALE/LIES backend/tests/unit/spotlightImageTransportPin.test.mjs
           claimed      b82be769… (170 lines)
           body lf      b82be769…   <- header and body AGREE
           disk raw     9b6a75aa…   <- but the DISK has moved
           disk lf      43c065c3…
```

`header == body` holds; `body != disk` fails. That is staleness, not a representation artefact, and
the instrument now says which. Both causes are legitimate and were identified:

1. **`backend/tests/unit/spotlightImageTransportPin.test.mjs`** was changed by
   **`c9dc2ed3d`** — *"test(spotlight): close round-9 finding 5 — cover the pin branch undici never
   takes"*. This is the landed form of the D1 fix from the independent review at
   `Z:/HostileReviews/2026-09-22-094314-social-bridge-round-10-finding-5-reopened-and.md`
   (filed on that reviewer's branch as `e801c791c`, and content-equivalent). v1 was built **before**
   it landed. The rebuilt block now carries the corrected comment and the three
   `createPinnedLookup — both branches, observed directly` cases.
2. **`Z:/HostileReviews/2026-09-21-212053-…-round-9-astra-classifier.md`** gained
   `superseded_by: 2026-09-22-094314-social-bridge-round-10-finding-5-reopened-and` when that
   review was filed. v1 captured the pre-supersession text.

**v2 rebuilds both against the settled tree.** It is a **re-sync, not a new review target**: round 10
was adjudicated against v1, and v1's hash above remains the identifier for what Astra read. v2 exists
so the packet is not a stale description of the tree it claims to describe.

## What round 10 targets, and why it is not the round-9 commit

The round-9 packet names `target_commit: 6cca20594`. **That commit no longer exists.** Neither does
`67de00ee0` or `7a23939cf`. All three are absent from the object store:

```
$ git cat-file -t 6cca20594
fatal: Not a valid object name 6cca20594
```

The fixes were never lost — the content sat untracked in the working tree — but the commits that
carried them were, so round 10 cannot cite them. It targets **`14833065a`**, the commit that
re-landed the same content, and §5 of the packet states this plainly rather than papering over it.

**A round-10 packet that claimed to review `6cca20594` would be claiming to review bytes that are
not in the repository.** That is the same overclaim class as §0.

## The header defect, fixed and mutation-proven

Round 9's builder hashed the **raw** text and embedded the **stripped** text:

```js
sha256 \`${sha256(text)}\` · ${lines(text)} lines`   // UNSTRIPPED
'```' + lang, text.replace(/\s+$/, ''), '```',      // STRIPPED
```

so every header described a byte-string that appears nowhere in the packet. `verify-r9-packet.mjs`
reported **11 of 11 MISMATCH** — including two files (`spotlightImageUrlPolicy.mjs`,
`spotlightImageAdmission.test.mjs`) that no round-9 fix had touched, which is what proved the count
could not be explained as post-fix drift.

Round 10's builder strips once via `normalise()`, then hashes and counts what it actually embeds.

**Proven load-bearing by mutation:**

| State | `verify-r10-packet.mjs` | Exit |
|---|---|---|
| Builder correct | `14 verified \| 0 mismatched \| 0 absent` | 0 |
| Header reverted to unstripped | `14 verified \| 14 mismatched \| 0 absent` | 1 |
| Restored | `14 verified \| 0 mismatched \| 0 absent` | 0 |

One block verifies only under the documented operator-path redaction (the round-9 review, which
lives outside the repo at `Z:\HostileReviews\` and whose absolute path is redacted by design).

## The verifier's own defect — the two "HEADER-LIES" blocks, and why they were not lies

After the tamper test below, the verifier was hardened to compare **header vs embedded body** as
well as **body vs disk**. The hardened version immediately reported `2 header-lies`:

```
  HEADER-LIES backend/services/addressClassification.mjs
  HEADER-LIES backend/services/spotlightImageFetch.mjs
  (A) header vs body : 12 honest, 2 header-lies
```

`body == disk` for both (sha `d6f5dbd0…`, 237 lines, for `spotlightImageFetch.mjs`) while the header
matched neither. **These were not lies. They were the verifier's fault, and measuring it was the
only way to know.**

The hardening had applied `.replace(/\r\n/g, '\n')` to the **whole packet text**. That is correct for
making `^…$`-anchored regexes match on a CRLF checkout — it is what fixed the `blocks found: 0` false
pass recorded below. But it **also rewrote the line endings inside every embedded body**, so the
bytes being hashed were no longer the bytes the headers were computed over.

Measured:

| Artifact | On disk | Header hashed from | Packet body | Agrees under |
|---|---|---|---|---|
| `addressClassification.mjs` | CRLF | CRLF | CRLF | **raw only** |
| `spotlightImageFetch.mjs` | CRLF | CRLF | CRLF | **raw only** |
| `ipv6LiteralSyntax.mjs` | LF | LF | CRLF | **LF-normalised only** |

Eleven of the thirteen sourced artifacts are LF on disk and two are CRLF. The packet itself is
materialised CRLF throughout (8,975 CRLF for 8,975 LF). So **no single global normalisation can
verify both halves** — one rule is always wrong for some blocks, and it reports the honest half as
lies. The packet was internally honest the whole time; the instrument was representation-dependent,
which is *the exact defect class this round exists to hunt*.

**The fix:** per-block representation. Each block now nominates the representation (raw, then LF) in
which its header is true, and the **disk must agree under that same representation**, including the
line count. A header true in one representation while the disk is true in the other still fails.

**Mutation-proven — four mutations, all still caught:**

| Mutation | Expected | Observed | Exit |
|---|---|---|---|
| M-A tamper an embedded body, keep its header | caught | `1 problem block(s)` — `addressClassification.mjs` | 1 |
| M-B zero a header (round-9 defect replayed) | caught | `1 problem block(s)` — `ipv6LiteralSyntax.mjs` | 1 |
| M-C break every header line (zero blocks) | caught | `blocks found: 0` → `no blocks were found…never a pass` | 1 |
| M-D silently drop one block | caught | `expected 14 hashed blocks, found 13` | 1 |
| Honest packet | pass | `14 verified \| 0 problems \| PACKET OK` | 0 |

The tamper test is the one that matters most, because the *pre-hardening* verifier was blind to it:
injecting `/* INJECTED-BACKDOOR */` into an embedded body with its header left intact produced
`14 verified | 0 mismatched`, exit 0 — the verifier never hashed the body it had parsed. That is
Astra's round-10 finding 5, reproduced against this repository's own instrument.

The packet file was restored byte-identically after every mutation (`4b20b78c…` verified against a
pristine copy both times).

## Egress

Dispatched through `scripts/consult-astra-subscription.mjs` — the **ChatGPT-subscription** route via
the authenticated Codex CLI, per the standing directive that Astra is never called via OpenRouter.

```
[redact-egress] document: 12 redaction(s) before send — <REDACTED-EMAIL>×6, <PATH>×4, <OPERATOR>×2
[consult-astra] transport=codex-cli billing=chatgpt-subscription model=gpt-6-astra effort=high
```

Verified with `--dry-run` first, which never dispatches a model call.

## Integrity

- `verify-r10-packet.mjs` — `14 verified | 0 problems | PACKET OK` (exit 0), and all four mutations
  above still caught.
- `verify-r9-packet.mjs` — `11 verified | 0 mismatched | 0 absent` (regression check; the round-9
  packet still verifies after round 10 was added beside it).
- Secret scan of all four round-10 files: **CLEAN, 0 hits**.
- Ban #50: `build-round10-packet.mjs` 254 lines, `round10-packet-template.mjs` 205 — both under.

## Verdict on the packet, and what it does NOT mean

**PACKET OK means the packet is internally honest and current. It does NOT mean the code under
review is correct.** Those are different claims, and round 10 exists precisely because the two were
conflated in round 9.

The reviewed code is **not** correct. Astra's verdict on the round-9 fixes was
`DEFECTS-FOUND — REVISE` (0 critical / 0 high / 5 medium / 1 low), with **C1 FALSIFIED**. Every
finding was independently reproduced against the live tree:

```
false null                                       PRIVATE 64:ff9b::8.8.8.8   <- the dotted spelling
true  0064:ff9b:0000:0000:0000:0000:0808:0808    PUBLIC  64:ff9b::808:808    <- THE SAME ADDRESS
true  0064:ff9b:0002:0000:0000:0000:0808:0808    PUBLIC  64:ff9b:2::808:808  <- NAT64 /32 overreach
true  2606:0000:0000:0000:0000:0000:0001:0000    PUBLIC  2606::1:           <- illegal trailing ':'
true  null                                       PRIVATE ::                 <- isValidIPv6 true, expandIPv6 null
true  3fff:0000:0000:0000:0000:0000:0000:0001    PUBLIC  3fff::1            <- documentation space
true  2001:0002:0000:0000:0000:0000:0000:0001    PUBLIC  2001:2::1          <- non-global
```

Two addresses that denote the same host still classify in **opposite** directions. D2 is open.

The one measured improvement since round 9: `2002:7f00:0::1` and `2002:7f00::1` now agree (both
PRIVATE), so the 6to4 path was repaired. The NAT64 dotted-tail path was not — it carries the same
greedy-colon strip, `head = dottedTail[1].replace(/:$/, '')`.

**A green verifier beside a red classifier is the honest picture, and it is what this log records.**

## The second round-10 review — `vs-claude`, and what it changes

Round 10 has **two independent reviews**, which is worth stating plainly:

| Review | Reviewer | Verdict |
|---|---|---|
| `2026-09-21-224500-social-bridge-spotlight-round-10-astra-verify-fixes` | Astra (`gpt-6-astra`) | `DEFECTS-FOUND — REVISE`, **0/0/5/1**; C1 FALSIFIED |
| `2026-09-22-094314-social-bridge-round-10-finding-5-reopened-and` | vs-claude (Opus 5) | `DEFECTS-FOUND`, **0/0/0/1**, 3 unproven; **supersedes round 9** |

The vs-claude review found a defect Astra did not: `spotlightImageTransportPin.test.mjs` claimed a
case exercised `net`'s single-address form, but a probe showed undici passes `all: true` on **every**
call — so the single-address branch is unreachable there, and the case written *because an ordering
mutation had survived* still could not catch one. Fixed in `c9dc2ed3d` (test-only). They graded it
**LOW, not MEDIUM**, and explained the regrade: the property that matters is covered on the branch
undici actually takes, so it was a false-confidence surface, not an exposure.

Its **U1** is the outstanding item, and it names this repository's own evidence discipline:

> *"A pass that re-runs the disposition's own mutation claims (e.g. reverting `reader.cancel()` and
> checking exactly one test fails with `body-cancel-locked`)."*

That is the round-11 instrument: re-derive the §5 mutation claims **from the committed revision**,
rather than re-asserting them. Note that the round-10 packet's own M5 record claims *"2 RED"* for the
reader-release mutation while the assertion quoted in §3.6 is
`expect(timeline).not.toContain('body-cancel-locked')` — **the count and the assertion have not been
reconciled against each other**, which is the same "count without the artifact it ran against" defect
vs-claude flagged in finding 4. Reconciling it is round 11's first job.

## Round 11's first measurement — made here, and it corrects the packet

U1 was answered directly rather than deferred. M5 was re-run against the **committed** revision
(`reader?.cancel('stream read failed')` removed, nothing else touched):

```
baseline (unmutated)   6 files | 91 passed | 91
M5 (release removed)   1 failed | 90 passed | 91
                       FAIL spotlightImageLifecycle.test.mjs >
                         'settles a body that ERRORS mid-read before closing the pool'
```

**Two corrections to the packet's own record follow from this, and both are overclaims of the kind
the round exists to find:**

1. **The count is `1 RED`, not `2 RED`.** The §5 M5 record says "2 RED". Measured against the
   committed tree it is 1. A mutation count is only meaningful with the artifact it ran against
   named — the same defect vs-claude flagged in finding 4. The packet's count is not reproducible
   as stated.
2. **`body-cancel-locked` is NOT the assertion that has teeth.** §3.6 says of line 125,
   `expect(timeline).not.toContain('body-cancel-locked')`, that it "is the assertion that has teeth."
   Under M5 **that line passes.** The failure is on line 127,
   `expect(settled.length).toBeGreaterThan(0)` — the *settlement count*, not the lock sentinel:

   ```
   125|     expect(timeline).not.toContain('body-cancel-locked');   <- PASSES under M5
   127|     expect(settled.length).toBeGreaterThan(0);             <- FAILS under M5
   ```

   So the mutation is detected, but by a different assertion than the one the packet names as
   load-bearing. The sentinel is sound *by reasoning* — a `body.cancel()` on a locked body would
   record `body-cancel-locked` and trip line 125 — but that is an argument about an alternative
   defect, not a measurement of this one. **A claim of the form "this is the assertion that has
   teeth" is a claim that it is the one that fails; measured, it is not.**

Neither correction is a regression: 91/91 green, the mutation detected, the property held. Both are
**prose overclaims in an evidence document**, which is precisely the class round 10 was built to
hunt — found here, in round 10's own packet, by applying round 10's own method to it.

The source was restored byte-exactly after the mutation
(`c4c57de63cda8f9f` vs `HEAD`, CRLF-normalised, both sides) and `git status` is clean.
