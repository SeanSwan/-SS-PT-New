# Package Manifest — Cinematic Frontend Blueprint

**Generated:** 2026-09-19T23:16:27.752Z
**Source reply:** `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-cinematic-frontend-2026-09-19/ASTRA-REPLY.md`
**Packet:** `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-cinematic-frontend-2026-09-19/CONSULT-PACKET.md`

> **Manifest header corrected 2026-09-19.** The generated title read "Social Bridge Completion
> Blueprint" and the packet path pointed at `BLUEPRINT-social-bridge-completion-2026-09-19/`,
> which does not exist. Both were stale splitter output. The package is the cinematic frontend
> blueprint and the packet is in this directory. Left as a correction rather than a silent edit,
> so the next reader can tell generated text from reviewed text.

> **Package log — 2026-09-21.** The P1 documents listed below are **no longer the current text**.
> The P2 consultation's nine payloads were applied in place as **section replacements** (never
> whole-file overwrites). Each affected file carries an inline *"P2 amendment applied 2026-09-21"*
> header and an explicit list of what was retired and why. P1 originals are preserved unmodified in
> `/tmp/p1-originals-20260921/`; their md5 hashes are recorded in
> `A0r-INTAKE-RECEIPT.md`. `08` is marked superseded but its original text is **untouched**.
>
> **Durability warning — WITHDRAWN 2026-09-21; the premise was false.** This directory was said to be
> **gitignored** at `.gitignore:496`. It is not. Line 496 is a blank line, and every `ai-workflow`
> rule in `.gitignore` (lines 441–495) targets the dot-prefixed top-level `.ai-workflow/`, never
> `docs/ai-workflow/`. `git check-ignore` returns *not ignored* for every file in this packet. The
> directory was untracked for the ordinary reason: nobody ran `git add`.
>
> **Resolved 2026-09-21.** The `/tmp`-only single point of failure described above has been closed.
> The eleven P1 originals were copied to `P1-ORIGINALS-20260921/` inside this directory and verified
> **byte-identical by md5** against `/tmp/p1-originals-20260921/` (11/11 `OK`, zero diffs). The P1
> record now exists in two places, and survives a reboot.
>
> **Resolved 2026-09-21 (superseding "still true" above).** The packet — including
> `P1-ORIGINALS-20260921/` — is **committed to git**. The "zero copies in git" condition is closed,
> and it was never caused by an ignore rule. Off-machine durability still depends on a push to the
> remote, which is a separate, unverified step: a local commit is not an off-machine backup.

> **Path sanitization 2026-09-21 (required to commit).** The repository's `pre-commit` secret scan
> blocks the `operator-identity` pattern — the operator's OS username inside absolute paths. Four
> files carried it in seven places: `A0-INTAKE-RECEIPT.md`, `A0r-INTAKE-RECEIPT.md`,
> `CONSULT-PACKET.md` and `evidence/playwright-results.json`. Each absolute repo path was replaced
> with the repo's existing `<REPO>` placeholder. **Nothing else was altered**, no finding, hash,
> measurement or verdict changed, and the hook was **not** bypassed. `P1-ORIGINALS-20260921/` and
> `P2-FORGED/` contained no such path and are byte-unchanged, so the immutable P1 record still
> matches `/tmp/p1-originals-20260921/`.

> **Commit `95ad38897` is MISLABELLED — recorded, not rewritten (2026-09-22).** Its message reads
> *"docs(cinematic): commit the blueprint packet; withdraw three false blockers"*. It does **not**
> contain this packet. It contains five `BLUEPRINT-social-bridge-completion-2026-09-19/` files
> belonging to another workstream.
>
> **Cause — the shared-index race.** Several agents share this working tree and therefore share
> one `.git/index`. Between this seat's `git add -- <packet dir>` and its `git commit`, another
> session staged its own round-9 work; the index that was committed was theirs, under this seat's
> message. `CLAUDE.md` Rule 67 R6 warns about `git add -A` during concurrent work — this is the
> same hazard reached by a path-scoped add, which R6 does not currently mention.
>
> **Not amended,** per Rule 45 (no history rewrite without Sean). The correction lives here and in
> the commit that actually carries the packet.
>
> **Mitigation now in use:** verify `git diff --cached --name-only` against an expected list
> immediately BEFORE committing, and verify `git show --name-only HEAD` immediately AFTER. A
> pre-commit check alone does not close the window; the post-commit check is what detects a swap
> that happened inside it. The three sibling commits (`0af46f4db`, `a6bc0b2f1`, `0f1db1cdc`) were
> each re-verified this way and contain exactly what they claim.

## Documents

| File | Role | Lines at P1 | P2 payload applied |
|---|---|---|---|
| `A0-INTAKE-RECEIPT.md` | P1 intake receipt | — | superseded by `A0r-INTAKE-RECEIPT.md` |
| `A0r-INTAKE-RECEIPT.md` | **current** reconciliation receipt | — | new, 2026-09-21; §12 rulings recorded |
| `SLICE-RECEIPTS-2026-09-21.md` | **execution receipts for A1–A4, A6** | — | new, 2026-09-21 |
| `HOSTILE-REVIEW.md` | P1 review | 48 | retained |
| `00-README.md` | package overview | 44 | ✅ amended in place |
| `01-architecture.md` | architecture | 152 | ✅ amended in place |
| `02-wireframes.md` | wireframes | 144 | ✅ amended in place |
| `03-contracts.md` | contracts | 160 | ✅ amended in place |
| `04-build-order.md` | build order | 54 | ✅ amended in place |
| `05-slices.md` | slices | 38 | ✅ amended in place |
| `06-bans.md` | prohibitions | 26 | ✅ amended in place |
| `07-checkpoints.md` | checkpoints | 87 | ✅ amended in place |
| `09-tests.md` | tests | 201 | ✅ amended in place |
| `08-decision-density-self-test.md` | self-test | 50 | ✅ marked superseded, **text preserved** |
| `P1-ORIGINALS-20260921/` | **immutable P1 record** (11 files) | — | md5-verified copy of `/tmp/p1-originals-20260921/` |
| `P2-FORGED/` | **authoritative P2 payloads** (12 files) | — | source of all amendments |
| `CONSULT-PACKET-P2.md` · `ASTRA-REPLY-P2.md` | P2 consult record | — | 41,262 / 66,242 chars |
| `VERIFICATION-NOTES-P2.md` | P2 adjudication (12/12 confirmed) | — | — |
| `CONSULT-PACKET.md` · `ASTRA-REPLY.md` · `VERIFICATION-NOTES.md` | P1 consult record | — | immutable evidence |

## Build order

Per `04-build-order.md` and `05-slices.md`. Build ONE slice at a time; after each slice, produce the diff + the acceptance-criteria evidence and WAIT for the checkpoint verdict before continuing.

**Before the first slice:** export `NODE_OPTIONS=--max-old-space-size=8192` for `tsc` (the tree OOMs at
the ~4 GB default), and settle the four rulings in `A0r-INTAKE-RECEIPT.md` §12.
