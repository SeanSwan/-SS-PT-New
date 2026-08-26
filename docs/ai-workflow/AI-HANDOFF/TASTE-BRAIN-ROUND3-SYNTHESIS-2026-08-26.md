---
decision: "Round-3 hostile review of the Swan Taste Brain: five seats, fourteen real defects, all fixed and proven. Four separate corpus doors were found in four different layers — the licence law had been enforced one layer at a time."
status: shipped
supersedes: none
board: SWA-186
date: 2026-08-26
author: Opus 5 (VS Code terminal), acting Final Decider in Fable's absence
repos: "swan-taste-brain (LOCAL, no remote)"
privacy: IDs and roles only — the second user is "the partner"; no names, no keys, no PII
---

# Swan Taste Brain — round-3 hostile review: what five seats found, and what it cost

**Verdict: REVISE → fixed → 453 checks green.** Commits `8a4038f` and `10a84ee` in `swan-taste-brain`.

---

## The short version

The session that built the household taste brain ran two hostile panels. Both happened **before the
second half of the code existed** — round 2 attacked the render-loop contract on *paper*. So the
render loop, Make/Make 4, HTTP Range, the one-shell app, video shots and the own-material fix had
never been read by anyone but their author. That is what this round reviewed.

It found **fourteen real defects**, including **four separate doors** through which the licensed
Midjourney corpus could reach the partner's memory. Every one is fixed, and every one is covered by
a regression check that **fails against the pre-fix code** — because the nine existing suites passed
404/404 both before and after, which is exactly why a green suite is not evidence.

## The pattern worth remembering

The licence law — *Midlibrary is the owner's alone* — was enforced **one layer at a time**, and each
fix made the next layer look safe.

| # | Layer | The door | Found by |
|---|---|---|---|
| 1 | **generation** | `generateOne` gated grammar and subjects on `pool.ownOnly`, then called `chooseSref()` unconditionally. A partner memory's prompts carried a corpus code **6 times out of 6**. | GLM 5.3 + Ox Alpha, independently |
| 2 | **the read API** | `access-control-allow-origin: '*'` on every JSON response made every read cross-origin readable — any page in Sean's browser could `fetch` the corpus and her kept prompts in one pageload. | GLM 5.3 + Ox Alpha, independently |
| 3 | **the event writer** | `validateEvent` accepted `provenance: 'midlibrary-reference'` candidates into a non-Sean memory. | Ox Alpha alone |
| 4 | **the compiler's output** | `tally()` bumped `t.srefs` regardless of witness, so her compiled profile, `proposedAvoids` and printed brief carried corpus codes — reachable both by rows written *before* door 3 was closed, and by a candidate that lies about provenance while still carrying `sref`. | Kimi K3 alone |

The session's own headline lesson was *"for any feature serving more than one user, print what it
produces for the other user before believing it works."* That was applied to **prose** — subjects and
artists — and stopped there. `--sref` is corpus material too, and so is a style code sitting in a
tally. **The generalised lesson: when a law is broken once, sweep every layer that law touches, not
the layer the bug was found in.** Four rounds of review found four instances of one law being
half-enforced.

## Everything fixed

| Finding | Seat | Where |
|---|---|---|
| Corpus style codes generated into an own-material memory (6/6) | GLM, Ox | `generate.mjs` |
| ACAO `*` made every read endpoint cross-origin readable | GLM, Ox | `serve.mjs` |
| Midlibrary candidates accepted into a non-Sean memory | Ox | `events.mjs` |
| Corpus codes in a non-Sean compiled profile, avoids and brief | Kimi | `profile.mjs` |
| A candidate carrying `sref` bypassed the provenance check | Kimi | `events.mjs` |
| A kept prompt could carry `--sref` into her `kept.md` | Kimi | `taste-namespace.mjs` |
| Unhandled `ReadStream` error killed the server mid-session | GLM | `routes-renders.mjs` |
| `$&` in a kept prompt spliced the heading into the bullet | GLM | `taste-namespace.mjs` |
| Sean's keep path had no length cap; every project memory did | GLM | `serve.mjs` |
| The event writer could `mkdir` a memory the registry never created | GLM | `events.mjs` |
| A seed ≥ 2³² was recorded, then silently truncated by `>>> 0` | GLM | `renders.mjs` |
| The same seed twin on `/api/prompt` | Kimi | `serve.mjs` |
| A thin pool dealt the same picture twice into one grid (38/60) | GLM | `probe.mjs` |
| A malformed request target threw outside the guard, killing the process | GLM | `serve.mjs` |
| `comfyPost` followed redirects — a 302 could carry the graph off-machine | Ox | `routes-make.mjs` |
| `pair` events burned their pictures via never-show-twice and were never compiled | GLM, Ox | `events.mjs` |

Plus: `/api/make/status` now reports when a captured graph holds several seed or prompt fields,
because `applyTo` sets them all in lockstep and the drift proof cannot see it.

## Considered and deliberately NOT changed

- **`applyTo` collapsing multiple seed/prompt fields** (Ox P2, GLM speculative). No graph is captured
  on this machine yet. Substituting only the first seed would silently change which renders come
  out, chosen by guess rather than measurement. The status now states the field counts instead.
- **`tier: 'evidence'` off a single grid for a non-Sean memory** (Kimi P2). Kimi is right that a floor
  measured against Sean's 18 judgements overclaims for a stranger — but requiring two grids changes
  what the sales-practice brief shows after one round, which is a product decision, not a reviewer's
  patch. `witness` is threaded through `directions()`; it is a one-line change if Sean wants it.
- **A 6-digit ComfyUI counter** (HY3 P2). `FILE`/`renderFile` accept `\d{1,5}`. Reaching six digits
  needs 100,000 renders of one identical prompt+seed, since the token is a content hash. It fails
  closed (the file is not listed). Widening the matcher buys nothing and loosens a validated segment.
- **`appendEvent` read-check-append race** (HY3 P2). Ox verified the path is fully synchronous;
  two concurrent POSTs cannot interleave inside the window.

## Where the seats disagreed with reality

- **HY3 returned REVISE on the grounds that the frontend files were missing and therefore the
  SwanStudios house rules (styled-components, Victory, the palette, 44px targets) were unverified.**
  Those rules govern the SwanStudios React app. This is a standalone local Node tool with a
  hand-written page and no React, no MUI and no chart library — the rules do not apply to it. Its
  *server-side* findings were useful and two are recorded above.
- **Qwen 3.8** raised namespace validation on `/api/make` and then partly refuted itself in the same
  answer: `mintIntent` does call `nsOk`. The residue — that nothing binds a *caller* to a namespace
  on the keep/intent/make channels — is the same point GLM made as its finding 10, and is a design
  property of a single-user loopback tool rather than a defect. Recorded, not patched.
- Two of **my own** first-cut fixes were too broad and the suites caught both: banning every style
  code broke judging her own renders, and banning every `--parameter` broke keeping an ordinary
  generated prompt. Both were narrowed.

## What it cost

| Seat | Result | Cost |
|---|---|---|
| GLM 5.3 | 11 findings, 2 P0 — the strongest single reply | $0 (subscription) |
| Ox Alpha | 5 findings, 2 P0 + the third corpus door; the most thorough "found sound" section | $0 |
| Kimi K3 | the fourth corpus door + 3 more, **one call**, reviewing the already-fixed code | $0.157 |
| HY3 | 2 usable server findings; scope error on the verdict | $0.016 |
| Qwen 3.8 | 1 finding, self-refuted; truncated | $0 (local) |

**Total ≈ $0.17.** Kimi's single call was spent on the *post-fix* code rather than the original,
which is why it found a door four other seats had walked past.

## Proof

- **453 checks across 10 suites, all passing** — run from the repo root.
- `prompter/test-round3.mjs` is the new regression file (45 checks). **24 of them fail against the
  pre-fix code**; each names the seat that found it.
- The two P0s were reproduced against a live server *before* being fixed: 6/6 prompts carrying a
  corpus code, and `access-control-allow-origin: *` returned even to `Origin: http://evil.example`.
- The within-grid duplicate was reproduced at **38 of 60 grids** on a thin pool.

## Two mistakes of my own, recorded because they generalise

1. **A guard shipped dead.** The `--sref` check in `keepFor` was written through a heredoc where `\b`
   became a literal backspace (`0x08`), so the regex could never match. It was caught *only* because
   the check for it was written as a negative test — "prove the guard refuses" rather than "prove
   the good case still works". The whole tree was then scanned for stray control characters (one hit,
   this one). **A security guard needs a test that fails when the guard is removed.**
2. **A test wrote production data.** Running the new suite against pre-fix code appended a 10 KB
   bullet to Sean's real `taste/kept.md`, because the `/api/keep` check exercises his own branch.
   Restored, and the suite now snapshots and restores that file unconditionally. This is the same
   class the repo already had a law about (tests must never write the real ComfyUI workflow path) —
   the law existed for one file and not for the others.

Both are in the learning packet.

## Next

Round 4 (GLM · Ox · HY3 · Qwen — Kimi has spent its one call) is reviewing the fixed code to
establish whether this has run dry or whether there is a fifth door.
