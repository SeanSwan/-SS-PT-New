# Consult Seat Manifest — backup of the review bench as configured 2026-08-21

- **decision:** back up the declared consult-seat configuration and record the one missing transport, WITHOUT changing any working setting
- **status:** open — `qwen` transport absent, awaiting Sean's call
- **supersedes:** none
- **Verify anytime:** `npm run seats:check` (report) · `npm run seats:check:strict` (exit 2 on drift)

---

## Why this file exists

`consult-panel.mjs` declares five review seats. Four have a transport on disk. **`consult-qwen.mjs`
has never existed in this repo** — verified against both `HEAD` and `origin/main` with a control
probe (a file known to exist was checked through the same code path first, because Git Bash reports
false absences on `<rev>:<path>` without `MSYS_NO_PATHCONV=1`).

Nothing ever crashed, which is exactly why it went unnoticed. The panel is deliberately built so
"a dead seat must not kill the panel": a missing script makes that seat settle `ok: false` and the
run continues. **The risk is not a crash — it is a review that reads as complete while a voice is
missing.** Same class as a meter that measures an attempt instead of an outcome.

Sean's instruction 2026-08-21: back up the missing file situation, keep current settings. **No
setting was changed.** Seat routing, panel config, and spend gates are untouched.

## The bench as configured (backup of record)

Transcribed from `scripts/consult-panel.mjs` `SEATS`. Pricing per 1M tokens, OpenRouter catalog as
verified in that file 2026-08-18.

| seat | label | script | on disk | paid | in/out per 1M | notes as configured |
|---|---|---|---|---|---|---|
| `sol` | GPT-5.6 Sol Pro | `consult-sol.mjs` | ✅ | paid | 2.5 / 15 | `reasoning.mode=pro`, 1.05M ctx; pinned via `SWAN_SOL_MODEL=openai/gpt-5.6-sol-pro` |
| `kimi` | Kimi K3 | `consult-kimi.mjs` | ✅ | paid | 3 / 15 | 20k output ceiling, `$0.40` hard cap, **ONE review per topic** |
| `glm` | GLM 5.3 | `consult-glm.mjs` | ✅ | free | 0 / 0 | Z.ai subscription — no per-token cost, burns coding-plan credit |
| `qwen` | Qwen 3.8 (local) | `consult-qwen.mjs` | ❌ **MISSING** | free | 0 / 0 | local 5090 via Ollama — $0, fully private, never the lead voice |
| `grok` | Grok 4.6 | `consult-grok.mjs` | ✅ | paid | 2 / 6 | `x-ai/grok-4.6` via OpenRouter; cheapest paid seat; rule-12 repeal (PR #54) |

Default invocation runs **free seats only** (`glm`, `qwen`); paid seats are skipped unless
`--confirm-spend` is passed.

## What is actually missing, and what is not

**Missing:** the transport script only. The *configuration* for the qwen seat survives intact in
`consult-panel.mjs` (label, args shape, output filename `QWEN-PANEL-REVIEW.md`, free/paid flag,
operational note). That config is what this file backs up, so the seat can be rebuilt without
guessing at its contract.

**Not missing:** any prior qwen output. `docs/ai-workflow/AI-HANDOFF/panel-2026-08-20-design-brain/`
contains a real `QWEN-PANEL-REVIEW.md` from the 2026-08-20 panel — so a working transport existed
*somewhere* at that time (another machine, another tree, or an uncommitted local file). Its content
is preserved in that directory and in the blueprint's §6 calibration table, which records the seat's
behaviour: *"front-loaded value (taste polarity schema, layout-first argument), degraded into generic
filler after finding 3. Confirms 'never the lead voice.'"*

**Exact model recovered from the preserved output** — `QWEN-PANEL-REVIEW.md` names it in its own
header, so the rebuild does not have to guess:

```
qwen3.8:27b-mtp-q4_K_M   via Ollama (5090)
```
That run: 4832 tokens in / 5020 out, 52.5s wall, `done_reason: stop`, $0.

**Contract to rebuild against** (from the config, verbatim in shape):

```
node scripts/consult-qwen.mjs --document <path> --out <path> --remit "<text>"
```
- exit 0 and a written file at `--out` = success (the panel checks both)
- exit 2 = hit max tokens, partial reply written (surfaced, not dropped)
- no `--seed` is passed to this seat (only sol/kimi/grok receive one)
- free/local: must incur no per-token cost; runs against local Ollama

## Current behaviour with the seat absent — measured, not assumed

- `spawn` **succeeds**; node itself exits `1` with a module-not-found error. No `error` event fires,
  so the panel's `close` handler settles the seat `ok: false, error: 'exit 1 (no output)'`.
- The panel continues and reports the seat as failed. It already refuses to call itself a "full
  panel" unless every seat ran.
- The Design Brain critic (S6) resolves seats from **disk, not config** (`availableSeats()`), so an
  absent transport is never treated as a usable seat. With `qwen` gone, the free-first order falls to
  **GLM**. No behaviour change was needed and none was made.

## Impact on the S5–S10 closing panel

The worker handoff §3 specifies:

```
--seats glm,kimi,grok,qwen
```

That run will return **three of four seats** and label itself partial. It will not crash. Sean's
call whether to restore the transport first or close with three seats and record the gap.

## Sean's options (no action taken)

1. **Restore `consult-qwen.mjs`** from wherever the 2026-08-20 panel ran it, drop it in `scripts/`,
   re-run `npm run seats:check` → CLEAN.
2. **Close the panel with three seats** and record the missing perspective in the panel INDEX.
3. **Retire the seat** from the config if local Ollama is no longer part of the bench — this is the
   only option that *changes a setting*, so it is not being done without an explicit yes.

## Guard added (this is the durable part)

`scripts/consult-seats-check.mjs` parses the seat table out of `consult-panel.mjs` itself — no
second hand-maintained copy, which would be its own drift source — and reports any declared seat
with no transport on disk. It also fails loudly if it can no longer parse the table at all, because
a checker that cannot see must never report clean.

```
npm run seats:check          # report, exit 0
npm run seats:check:strict   # exit 2 on drift, for CI or a pre-panel gate
```

Run it before any panel invocation. A missing seat is cheap to see and expensive to miss.

## Known limitation — this guard is OPT-IN, not enforced

Nothing runs `consult-seats-check.mjs` automatically. No hook, no CI step, no pre-panel gate invokes
it — deliberately, because Sean's instruction for this pass was **keep the current settings**, and
wiring a hook would change one.

That leaves the guard exposed to the same failure it was built to catch: **a check nobody runs is
indistinguishable from a check that does not exist.** The qwen gap survived precisely because nothing
was watching, and a watcher that is itself unwatched inherits that weakness.

Two ways to close it when Sean wants the setting changed:

1. Add `npm run seats:check:strict` as a step in the closing-panel procedure (documentation-level —
   still relies on the operator).
2. Wire it as a `PreToolUse`/CI gate so a panel invocation naming an absent seat is blocked before it
   spends anything (enforced — requires a settings change).

Until then, the honest statement is: **the drift is now visible on demand, not prevented.** Run it
before any panel invocation.
