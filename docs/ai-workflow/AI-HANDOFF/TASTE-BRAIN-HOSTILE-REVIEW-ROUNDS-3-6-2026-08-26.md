---
decision: "Four hostile rounds against the Swan Taste Brain found thirty defects, including six doors through which a licensed corpus could reach a second user's memory. All fixed and proven. The recurring shape — a law enforced one layer at a time — is the finding worth keeping."
status: shipped
supersedes: TASTE-BRAIN-ROUND3-SYNTHESIS-2026-08-26.md
board: SWA-186
date: 2026-08-26
author: Opus 5 (VS Code terminal), acting Final Decider in Fable's absence
repos: "swan-taste-brain (LOCAL, no remote)"
privacy: IDs and roles only — the second user is "the partner"; no names, no keys, no PII
---

# Swan Taste Brain — hostile review, rounds 3 to 6

**Seven commits, `8a4038f` … `2436656`. 488 checks across 10 suites, all passing.
Total spend ≈ $0.17.**

---

## Why this was needed

The session that built the household taste brain ran two hostile panels — and **both ran before the
second half of the code existed.** Round 2 attacked the render-loop contract on *paper*. So the
render loop, Make/Make 4, HTTP Range, the one-shell app, video shots and the own-material fix had
never been read by anyone but their author.

Sean asked for a review by Kimi K3, GLM 5.3, Ox Alpha and HY3, fixes until it runs dry, and Kimi
called exactly once.

## The finding that matters

**A law enforced at one layer looks enforced everywhere.** The licence law — *the corpus is the
owner's alone* — was broken in **six different layers**, and each fix made the next one look safe:

| # | Layer | How the corpus arrived | Found by |
|---|---|---|---|
| 1 | **generation** | `chooseSref()` ran unconditionally; the own-material guard covered subjects and artists but not style codes — **6 of 6** prompts carried one | GLM + Ox |
| 2 | **the read API** | `access-control-allow-origin: '*'` made every read cross-origin readable to any page in the owner's browser | GLM + Ox |
| 3 | **the event writer** | candidates could declare `provenance: 'midlibrary-reference'` | Ox |
| 4 | **the compiler's output** | `tally()` bumped style codes regardless of witness, so her profile, avoid-list and printed brief carried them | Kimi |
| 5 | **the index join** | a candidate declaring **nothing** passed validation, and the compiler back-filled `doc`, `prompt` and `provenance` from the corpus image index | Ox |
| 6 | **the client** | a batch generated for one memory rendered under another after a mid-fetch switch; every guard is an `--sref` scan and the corpus's commonest prompt shapes carry **no sref at all** | GLM |

Doors 5 and 6 share one lesson: **absence is not innocence.** Every guard was written
`if (field !== undefined) refuse(...)`, so the way through was to send no field at all.

## The four recurring defect classes

1. **A law enforced at one layer.** Six instances above.
2. **Absence is not innocence.** Doors 5 and 6.
3. **A guard that cannot fire — shipped three times.** A literal backspace where `\b` was meant
   (written through a heredoc that ate the escape, with the interpreter's warning visible and
   ignored); `\s--sref`, which cannot match a prompt *starting* with the flag; and a tripwire
   matching `ml:img:` inside the wider `ml:` namespace it guards. **Two of the three were in the
   same guard**, and both were caught only because the check was written as a *negative* test.
4. **A fix applied to one writer, not to the class.** `$&` expansion was fixed in one of four
   markdown writers. The other three wrote the owner's own files. The structural check
   ("no writer interpolates user text into a replacement string") then found a fourth instance
   that reading had missed.

## Everything fixed

**Corpus containment (6):** style codes in generation · the CORS read channel · midlibrary
candidates at the writer · style codes in the compiled profile · the index back-fill · the client
memory-switch race.
**The writers (5):** `$&` in `keepFor`, `appendKept`, `appendRating` ×2, `appendRejection` ·
multi-line keep injecting fake exemplars · a rating note forging whole table rows · `appendKept`
reporting success on a no-op write · no length cap on the owner's keep path.
**Integrity (6):** the event writer minting namespaces the registry never created · a seed ≥ 2³²
recorded then truncated, twice (intents and `/api/prompt`) · a thin pool dealing the same picture
twice (38 of 60 grids) · `pair` events burning pictures uncounted · `pruneIntents` destroying records
when a network drive was merely unmounted.
**Availability and transport (4):** an unhandled `ReadStream` error killing the server mid-session ·
a malformed request target killing the process · `comfyPost` following redirects off-machine ·
DNS-rebindable reads.
**Scope (4):** render intents carrying corpus codes · the `local-comfy` exemption as a free-text
channel · a bundle aimed at the owner's own memory · **Undo broken in every non-owner memory by my
own round-4 law.**

## Refuted, with evidence

- **Qwen — "arbitrary command execution via the note field."** `cli()` uses `execFileSync` with an
  argv array; no shell is involved. The real effect is narrower and was fixed: the CLI's own filter
  silently *dropped* any note word starting with `--`.
- **Qwen — "the dedup check is bypassable by reordering JSON keys."** `eventIdFor` does not hash
  `JSON.stringify(e)`; it hashes selected fields with the candidate ids **sorted**. Demonstrated:
  reordered input yields an identical id.
- **Qwen — "`unkeepFor` has a replace-based deletion bug."** It filters lines; no `replace` involved.
- **HY3 — "a third guard that cannot fire: `---sref-` should be `--sref-`."** Of 8,281 records, zero
  match `--sref-` without also matching `---sref-`, and zero lack an sref while their URL carries a
  code. The slugifier turns `word --sref` into `word---sref`; three dashes is correct.
- **HY3 — "the local-comfy exemption leaks style codes."** `tally()` hits `if (generated) continue`
  before the style bump, the witness gate stops non-owner style tallies outright, and `t.picks`
  carries no `sref`. The *residual* — that the exemption was a free-text channel — was real and fixed.
- **HY3 returned REVISE/REJECT twice on SwanStudios React house rules** (styled-components, Victory,
  the palette, 44px targets) against a standalone local Node tool containing no React. A reviewer
  given the wrong rulebook returns a confident verdict against rules that do not apply.

## Deliberately not changed — Sean's call

- **`tier: 'evidence'` off a single grid for a non-owner memory.** Kimi and Ox both argue this
  overclaims for someone whose memory started empty yesterday. Requiring the backing to span two
  grids changes what the sales-practice brief shows after one round, which is a product decision.
  `witness` is threaded through `directions()`; it is a one-line change.
- **`applyTo` setting every seed and prompt field in lockstep.** No graph is captured on this machine
  yet, and guessing which seed is "the" seed would silently change which renders come out. The status
  now reports the field counts instead.

## What it cost, and what that says about routing

| Seat | Findings | Verified real | Cost |
|---|---|---|---|
| **Ox Alpha** | 14 across three rounds | all real — found doors 3 and 5 alone, plus all three inert guards | **$0** |
| **GLM 5.3** | 13 across three rounds | all substantive — found door 6 and two of the first three | **$0** (subscription) |
| **Kimi K3** | 4, in **one call** | all real — found door 4 | $0.157 |
| HY3 | 4 usable | 2 real, 2 refuted; wrong rulebook twice | $0.016 |
| Qwen 3.8 | 5 | 1 real (the CLI note), 4 refuted or self-refuted | $0 (local) |

**The free seats did the heavy lifting.** Ox at $0 out-performed both paid seats on depth, and its
*"what I checked and found sound"* sections were the single most reusable artefact — they name the
attacks that failed, so later rounds stop re-walking closed doors. **Require that section from every
hostile seat.**

**Spend the one expensive call on the already-fixed code.** Kimi found a door four seats had walked
past, because it was the only one looking at what their fixes left behind.

## Proof

- **488 checks across 10 suites, all passing**, from the repo root.
- `prompter/test-round3.mjs` is the regression file — **523 lines added**, one check per finding,
  each naming the seat that found it. Verified to **fail against the pre-fix code** at every round.
- The two round-3 P0s were reproduced against a live server before being fixed (6/6 prompts carrying
  a corpus code; ACAO `*` returned even to `Origin: http://evil.example`).
- Door 5 reproduced with three corpus subjects and a `midlibrary-reference` row in a partner profile.
- The within-grid duplicate reproduced at 38 of 60 grids on a thin pool.
- DNS rebinding verified live: `Host: attacker.example` → 403; `127.0.0.1` and `localhost` → 200.
- Control-character sweep clean across 51 tracked files. Sean's `taste/` is untouched.

## Mistakes of my own, recorded because they generalise

1. **I shipped a guard that could not fire, twice, in the same guard.** Once via a heredoc that turned
   `\b` into a backspace — with the interpreter's warning visible in my own output and ignored.
2. **I broke Undo for every non-owner memory** with my round-4 containment law, and the existing undo
   tests missed it because their fixture spreads a whole event while the page sends bare ids. *A test
   that does not construct input the way the caller does is not testing the caller.*
3. **Two other fixes were too broad** and broke judging your own renders and keeping an ordinary
   generated prompt.
4. **My test wrote 10 KB into Sean's real `taste/kept.md`.** The repo's "tests never write production"
   law had been written for one specific file rather than as a class — the same shape as the defects
   I was fixing.
5. **I wrote a test that passed on an empty set** (a fake CDN host meant zero candidates). It only
   reproduced the defect once the instrument was fixed.
6. **My own patch script hit the `$&` bug it was fixing** — a `` $' `` inside a comment expanded to
   the rest of the file and duplicated it.

Durable lesson: `docs/ai-workflow/hermes-learning-packets/20260826-a-law-enforced-at-one-layer-looks-enforced-everywhere.md`
