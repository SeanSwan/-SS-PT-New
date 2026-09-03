---
date: 2026-09-03
originating_model: claude-fable-5
model_id: claude-fable-5-1
title: A shared unknown across seats is the orchestrator's to-do, not corroboration — and a retry loop that writes to a fixed path must check for the file first
linear: SWA-239
commits: [ce9d83d51, 43ff8d64f, 591b5bc3c]
models_used:
  - model: claude-opus-5
    role: researcher
    did: 14 web searches, environment ground-truth, competitive sweep, research base + consult packet
    cost: subscription
  - model: claude-fable-5-1
    role: Final Decider — hostile review, blueprint v1, GLM synthesis, blueprint v2
    did: found 10 defects in the research (2 critical); wrote v1; arbitrated 2 GLM views; reversed one of its own v1 positions
    cost: subscription
  - model: glm-5.3
    role: independent design view
    did: 27k out / 1016 s; 8 adopted improvements; 3 positions rejected; converged on the fidelity probe unprompted
    cost: Z.ai subscription ($0 marginal)
  - model: glm-5.3-flash
    role: independent design view
    did: 24k out / 861 s; 10 adopted improvements incl. STARVED≠EMPTY and identity-without-SAM; 2 positions rejected
    cost: Z.ai subscription ($0 marginal)
skills_touched:
  - id: instrument-check
    change: reinforced
    failure: a background queue script exits 0 whether or not the consult ran; I nearly acted on the exit code instead of the output files
  - id: consult-glm retry helper
    change: proposed (not built)
    failure: my hand-rolled retry loop would have re-fired both consults and overwritten finished reports because it never checked whether the output already existed
  - id: rule-67 R5 (never seize a lock)
    change: reinforced
    failure: two of my own retry loops competed for the same Z.ai lock; the fix was to kill mine, not to seize
---

# A shared unknown across seats is the orchestrator's to-do, not corroboration

Two GLM seats, given the same packet independently, both wrote `[UNSURE — not documented in
sources]` for MiniMax H3's per-image resolution and file-size limits, and both designed a
"downscale ladder, never hard-code" workaround around the gap. That looked like corroboration:
two seats agree the number is unknowable.

It was not. I had fetched the official `platform.minimax.io` page an hour earlier and had the
numbers (each side 256–5760 px, aspect 2:5–5:2, ≤30 MB). The seats had no fetch tool. Their
behaviour — flag rather than invent — was exactly right for a seat without the instrument. But
the orchestrator's job on seeing two seats share an unknown is to **resolve it**, not to relay
it forward as a design constraint. A shared `[UNSURE]` is a to-do for whoever holds the tool.

The complementary lesson: three seats converging *unprompted* on the same structural idea (the
closed-loop fidelity probe; capture-director-as-product) IS corroboration worth weighting. The
synthesis's value is entirely in the **disagreements** — that is where the twenty adopted changes
and five rejections came from.

## Who did what

- **Opus 5** researched. Right on all four strategic findings (H3 ≠ Krea artifacts; 360° is a
  target not a property; nobody does person-lock + coverage map; reuse `lib/lora.mjs`). Thin on
  measurement: never defined how "exactly like the person" would be tested.
- **Fable 5.1 (me)** hostile-reviewed the research (10 findings), wrote v1 with the Likeness Loop
  (held-out frames, self-calibrated floor), then synthesised. **Wrong in v1** on "import `lora.mjs`
  by sibling path; a copy drifts" — both GLMs independently pointed out that a path import dies
  when the sibling moves, breaking the five-year-from-a-checkout doctrine v1 had itself cited two
  paragraphs earlier. Reversed in v2: vendor + a sync check that fails the suite on unexplained
  divergence.
- **GLM 5.3** was sharpest on identity: veto-style gating (low cosine alone never rejects — a
  *rival* face does), per-video adaptive τ above the impostor p99, incremental enrollment ("early-
  anchor bias is the hidden single point of failure"), the pose×lighting correlation check. Wrong
  on "ComfyUI not used" (it is the only proven identity path on disk) and on scoring the probe
  against anchors (rewards memorisation — its own text admits "generous to the enrollment set").
- **GLM 5.3-flash** was sharpest on architecture: policy in Node / perception in Python; harvest
  every person and make the subject a query; ship identity v1 with **no SAM** so SAM 3 becomes a
  licence-gated upgrade instead of a critical-path unknown; STARVED ≠ EMPTY coverage states;
  consent blocks export; degraded mode. Its Objection 2 — zero-touch curation is a poisoned-
  dataset generator with a delay fuse — was adopted whole. Wrong on shipping clips silent (the
  official doc accepts AAC and says *voice* carries with a reused reference set).

## Skills created or changed

- `instrument-check` reinforced: **exit code 0 from a wrapper script is not evidence the wrapped
  thing ran.** My queue script ends with an unconditional `echo` and so always exits 0. I checked
  the output files' existence, size and mtime instead — that was the instrument.
- Proposed, not built: a `consult-glm` retry helper that (a) checks whether `--out` already exists
  and is non-empty before firing, (b) refuses to start if another instance holds the lock, (c) is
  idempotent. Two hand-rolled loops in one session is the signal that this should be tooling.
- Rule 67 R5 reinforced from the other side: the lock was held first by another session's chain,
  then by my *own* first loop. Both times the right move was wait/kill-mine, never seize.

## Mistakes I made

1. **Typed the ORIENT block by hand** and expanded a truncated field past the 140-char budget →
   Stop gate blocked. Caught by the gate. Rule: render it, never type it.
2. **Closed out a commit without a Linear sync** → Stop gate blocked. Caught by the gate. Rule:
   the board sync is unprompted; capture or name an SWA id before saying done.
3. **v1 contradicted a doctrine it cited** (import-by-path vs five-year runnability). Caught by two
   external seats, not by my own hostile pass. Rule: when you cite a doctrine in a design, check
   the design against it before the reviewer does.
4. **Launched a second retry loop while the first was still alive**, on a stale tail that showed
   attempt 4 and an unrelated earlier exit code. The second loop would have re-fired both consults
   and overwritten two finished 40 KB reports the moment the lock freed. Caught by me — file mtimes
   and a `[queue] DONE` line in the *first* loop's output — and killed before it fired. Rule: before
   launching a watcher, prove the previous one is dead; before a loop writes to a fixed path, make
   it check the path.
5. **Trusted `$TMPDIR`** (empty in this shell) → wrote to `/glm-queue.sh` and got permission denied.
   Minor; used the scratchpad absolute path. Rule already in memory (Git Bash `/tmp` ≠ Node `/tmp`).
6. **Heredoc quoting failed** on the first 200-line research doc → fell back to the Write tool.
   Minor; the fallback is the documented one.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before recurring? | What stopped it |
|---|---|---|---|
| Hand-typed / over-budget ORIENT | 1 | yes (rule 57) — first offence this session | the gate; re-rendered from the ledger |
| Missing Linear sync at closeout | 1 | yes (SWA-23) — first offence this session | the gate; created SWA-239 |
| Design contradicting its own cited doctrine | 1 | no | two external seats; reversed in v2 |
| Duplicate watcher on stale state / non-idempotent write loop | 1 | no | checked file mtimes before trusting a tail; `kill` + verified log frozen |
| Wrong temp path | 1 | yes (memory: Git Bash /tmp) | scratchpad absolute path |

No error class repeated within the session. The two gate-caught ones are procedural and were
stopped by hooks, not by resolve — which is the point of the hooks.

## External-model calibration

| Seat | Findings adopted | Disproven on verification | Cost | Verdict |
|---|---|---|---|---|
| GLM 5.3 | 8 + first-run-card objection | 3 (ComfyUI unused; probe vs anchors; H3 limits "unsure") | $0 marginal, 1016 s | Best on identity mechanics; over-cautious on things it could not fetch |
| GLM 5.3-flash | 10 + delay-fuse objection adopted whole | 2 (silent clips; H3 limits "unsure") | $0 marginal, 861 s | Best on architecture; the single best insight in either doc (STARVED≠EMPTY) came from the cheaper seat |
| Opus 5 research | 4 strategic findings all survived | 0 disproven; 1 critical omission (no measurement) | $0 | Reliable for breadth; needs a hostile pass for "how would we know" |

Routing note for Hermes: for design consults, **flash was not the lesser seat** — it was the more
architectural one. Run both; they specialise differently. Neither can fetch; resolve their shared
`[UNSURE]`s yourself before synthesis.

## What Hermes should carry forward

- H3 official limits (`[VERIFIED]` 2026-09-02): images each side 256–5760 px, aspect 2:5–5:2, ≤30 MB,
  ≤9; clips H.264/H.265 + AAC/MP3, 2–15 s each, ≤15 s total, ≤50 MB, ≤3; 12 files; role `reference_image`.
- Build authority for Swan Likeness: `docs/ai-workflow/AI-HANDOFF/CHARACTER-CAPTURE-FABLE-BLUEPRINT-2026-09-02.md` @ `591b5bc3c`. Slice 1 is a shoot and three numbers, not code.
