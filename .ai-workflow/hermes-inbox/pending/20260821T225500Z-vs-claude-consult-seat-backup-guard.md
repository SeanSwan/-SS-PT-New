---
surface: vs-claude
utc: 20260821T225500Z
topic: Consult seat bench backed up + seat-drift checker added; the watchdog shipped with the exact blind spot it was built to catch
tags: [consult-panel, review-bench, drift-check, swa-185]
---

## What I did / learned
- `08dac2b67` — backed up the declared consult-seat bench and added `scripts/consult-seats-check.mjs`,
  a deterministic config-vs-disk drift checker. **No setting was changed** (Sean's constraint): no seat
  script, no panel config, no `settings.json`. `package.json` gained two scripts and one test file.
- **A config entry is not a capability.** `consult-qwen.mjs` has never existed in this repo, yet
  `consult-panel.mjs` declares it as a seat. Nothing ever crashed, which is exactly why it survived —
  the panel is deliberately built so a dead seat cannot kill the run.
- **The risk was never a crash: it was a review that READS AS COMPLETE while a voice is missing.**
  This is the same failure class as a meter that measures an attempt rather than an outcome. Measured
  rather than assumed: `spawn` succeeds, node exits 1 with module-not-found, no `error` event fires,
  the seat settles `ok:false`, and the panel continues with three of four seats and labels itself partial.
- **Recovered more than expected from what survived.** The transport is gone but its config, args
  shape and output contract are intact in the panel, and the *preserved* `QWEN-PANEL-REVIEW.md` names
  its own model in its header — `qwen3.8:27b-mtp-q4_K_M` via Ollama, 4832/5020 tokens, 52.5s, $0. A
  rebuild does not have to guess. Lesson: **before declaring something unrecoverable, read what the
  dead component left behind — outputs often carry their own provenance.**

## Why it matters to Hermes
- Any panel invocation naming `qwen` returns one fewer perspective than it appears to. Do not describe
  such a run as a full panel. `npm run seats:check` answers this in one second.
- The S5–S10 closing panel (handoff §3) specifies `glm,kimi,grok,qwen` and will return three seats.
  Sean's call: restore the transport, close with three, or retire the seat (only the last changes a
  setting, so it was not done).
- The Design Brain critic already resolves seats from **disk, not config**, so an absent transport is
  never treated as usable — no behaviour change was needed there.

## State right now
- 93/93 tests. `seats:check` reports 4 present / `qwen` missing; strict mode exits 2.
- Backup record: `docs/ai-workflow/AI-HANDOFF/CONSULT-SEAT-MANIFEST-2026-08-21.md`.
- **Known limitation, recorded:** the guard is OPT-IN. Nothing invokes it automatically, because
  wiring a hook would change a setting. The drift is now *visible on demand, not prevented*.
- Branch `claude/design-brain-s1-20260821`; nothing merged to main. Next: S7 taste distiller.

## Mistakes I made
- **I built a watchdog carrying the exact blind spot it was built to catch — the third guard-that-
  cannot-fire this session.** My first parser anchored on the seat name and required `script:` before
  `paid:` at a two-space indent. A reordered or reindented entry parsed as *nothing*: the seat vanished
  from the audit and the checker reported CLEAN while that seat's transport was missing. → caught in
  dry-loop round 1 by trying to fool my own parser rather than by reading it. → rule: **a checker must
  be attacked with malformed input before it is trusted; and when it cannot fully parse its source it
  must report BLIND, never clean.** Pattern across today: S6's inert `generator != critic` guard, S6's
  empty-citation-vocabulary silent drop, and now this — **three instances of the same meta-error, a
  safety check that silently could not fire.** Writing up the first two did not prevent the third; only
  the adversarial round did.
- **I over-claimed the severity of the missing seat to Sean.** I said the closing panel seat "will
  fail," implying breakage. On measurement the panel degrades gracefully and honestly labels itself
  partial. → caught by probing `spawn` behaviour instead of trusting my reading of the code. → rule:
  **state the measured failure mode, not the feared one** — over-stating severity spends Sean's
  attention on a smaller problem than described.
- **A heredoc silently mangled backslash escapes twice**, writing real newlines into JS string literals
  and producing an unparseable test file. → caught by `node --check`. → rule: for generated code
  containing escapes, use template literals with real newlines rather than fighting shell escaping;
  and never assume a quoted heredoc passes content through untouched.
- **`node --check` passed on a file with a missing import** earlier in this session (`writeFileSync` in
  capture.mjs) — recorded again here because it is the same lesson: **a syntax check proves
  parseability, never executability.** Only running the real caller path proves the latter.

## External-model calibration
- None consulted. **Zero spend, zero external calls.** The bake-off remains held pending Sean's
  ranking pass, per his explicit decision.

## Sean owes / blockers
- **Decide on `consult-qwen.mjs`** — restore / close with three seats / retire (options written up in
  the manifest).
- **Optional:** say the word to wire `seats:check:strict` as an enforced gate — deliberately not done,
  since it changes a setting.
- **Rank 15–30 exemplars** (S5's one human step) — worksheet at
  `docs/ai-workflow/AI-HANDOFF/DESIGN-BRAIN-S5-RANKING-WORKSHEET-2026-08-21.md`.
- Standing: DMARC record in Namecheap (SWA-13); Render API key rotation confirmation.
