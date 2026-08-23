# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Document:** C:/tmp/idle-reaper-review.md
**Seed:** (none)
**Tokens:** 4512 in / 5058 out · **Cost:** ~$0.0000 · **Wall:** 172.3s · **finish:** stop

---

## VERDICT
REVISE — the discriminator idea is sound and the code is honest about its limits, but there are concrete paths where telemetry poisoning (NaN), multi-GPU blindness, and a global idle-clock let it destroy live work, and the root cause (keep-alive) is a one-line env var away.

## BLOCKERS

1. **P1 — NaN poisons the busy-guard and forces a reap.** `nvidia-smi` on Windows/WDDM (and some driver states) returns `N/A` for `utilization.gpu`. `Number("N/A")` → `NaN`; `gpu.maxUtil >= CFG.busyPercent` is `false` for any NaN, so the model falls through to the idle branch and the grace clock starts on a *working* model. Same failure via config: `SWAN_GPU_BUSY_PCT=junk` → `NaN` threshold → every comparison false → everything is "idle." Evidence: `sampleGpu()` parsing (`const [util, mem, temp] = out.split('\n')[0].split(',').map(Number)`) and `if (gpu.maxUtil >= CFG.busyPercent)` in `observe()`. There is no `Number.isFinite` guard anywhere.

2. **P1 — Multi-GPU machines: only GPU 0's first CSV line is read.** `out.split('\n')[0]` discards every other GPU. Ollama routinely splits layers across GPUs; a model whose layers sit mostly on GPU 1 can show GPU 0 near-idle while real inference runs. Sequence: two-GPU box, layer split 20/80, inference streaming → GPU 0 samples 8–12% for 10+ min → `reapable` → `ollama stop` kills a live job. The document itself flags this in its attack list; the code does not address it.

3. **P1 — Ollama API failure is indistinguishable from "nothing resident," so `--watch` quits early.** `residentModels()` catches *everything* (timeout, ECONNREFUSED, non-OK) and returns `[]`, which `observe()` maps to `status: 'clear'`. Sequence: model mid-inference at 90% util, Ollama API momentarily slow (>8s, which correlates with heavy load — exactly when you must not quit) → `AbortSignal.timeout(8000)` fires → `[]` → `[idle-reaper] nothing left to watch — exiting.` The watchdog abandons its post precisely under load and reports "GPU is clear" while the room cooks. Worst-ranked false negative in the file.

4. **P1 — Global `idleSince` is not bound to model identity, so a freshly loaded model inherits a stale clock.** `firstSeenModels` is written and never read — dead field. Sequence: model A sits idle 9 minutes (clock ticking, not yet reapable); user starts a new job that swaps in model B; the load's util spike is shorter than the ~2.8s sampling window (small model, warm cache) or lands between polls in `--watch`; `state.idleSince` survives → model B is `reapable` minutes into legitimate work. Comparing current model names to `firstSeenModels` and resetting on mismatch is the missing ten-line fix.

5. **P2 — `reap()` never verifies success but the Hermes memo asserts it did.** `sh()` swallows `ollama stop` failures; `freedGiB` is summed from `/api/ps` numbers, not measured post-stop. If `stop` fails (name mismatch, version lacking `stop`), you get a memo claiming "~17 GiB freed" while the model stays resident — and since `writeState({})` resets the clock, it retries every `graceMinutes`, writing a false-success memo each cycle (~24 over the watch ceiling). The log channel the whole design depends on becomes a liar.

## ATTACKS

**Correctness**
- TOCTOU: last GPU sample → `ollama stop` gap is unguarded; a request arriving in that window loses its model mid-turn. No immediate re-check before acting.
- `CFG.samples = 0` (env) → `readings[-1].mem` throws TypeError → swallowed by the top-level catch → exit 0, silent no-op forever.
- `--check` is documented "one-shot report, never acts" but `observe()` *writes* state (`writeState({ idleSince, ... })`, `writeState({})` on busy/clear). Two concurrent `--check`s plus a `--watch` race on the state file, last-writer-wins; a hook-fired check can clobber the watch's clock in either direction.
- Sampling covers ~2.8s per 60s poll in `--watch`: ~4.7% duty cycle. Short bursts are invisible — which conveniently means "any spike resets the clock" is weaker than advertised, cutting both ways.

**Security**
- Low risk surface (localhost, no input handling), but: state file and Hermes inbox paths are fixed relative to the script; anything that can write `gpu-idle-state.json` controls reap timing (can force perpetual false-negatives by rewriting `idleSince`). No locking, no fsync. Acceptable for a single-user dev box; worth stating as an assumption.
- `execFileSync` with fixed args — no injection. `fetch` to hardcoded localhost — no SSRF. Fine.

**Data-truth / schema drift**
- The memo's filename convention comment (`<UTC-YYYYMMDDThhmmssZ>-<surface>-<slug>`) doesn't match what's written (`${stamp}-gpu-idle-reaped.md` has no surface segment) — the comment says stripping dashes makes files sort together, but the produced name omits a field the convention requires. Two reaps in the same second collide and overwrite.
- `expiresAt` is surfaced from `/api/ps` and then ignored — the API literally hands you the unload time and the code substitutes a worse, self-derived signal.

House rules: this is a Node CLI, not frontend — styled-components/Victory/palette/touch-target rules don't bind. Checked anyway: no yoga/meditation language, no credential phrasing, no PII beyond model names (which are identifiers, compliant). File is under 300 lines. No violations.

## HIGHEST RISK
The false positive cluster (Blockers 1, 2, 4): three independent paths where a working model looks idle, and the entire safety argument rests on the busy-guard being trustworthy. Cheapest de-risk before ship, in order: (a) reject any non-finite utilisation reading as `status: 'unknown'` — one `Number.isFinite` check converts the worst failure into the safe one; (b) reset the clock whenever the resident model set differs from `firstSeenModels`; (c) parse *all* nvidia-smi lines and require *every* GPU below threshold. All three are under twenty lines total. Then set `OLLAMA_KEEP_ALIVE=10m` so the reaper almost never fires at all.

## CONFIDENCE
I could not verify from the document: (1) whether the target machine's driver ever emits `N/A` utilisation — one manual `nvidia-smi --query-gpu=utilization.gpu` run during load, idle, and on Windows settles Blocker 1; (2) whether `ollama stop` accepts names exactly as `/api/ps` returns them and exists in the installed Ollama version — one manual invocation settles Blocker 5; (3) the actual GPU topology (single 5090 assumed from the narrative, but nothing enforces it); (4) whether the 9–11% idle baseline replicates — many consumer cards idle at 0–1%, and if so the 25% threshold's "far above observed idle" justification is measuring one afternoon; (5) whether `Atomics.wait` sleep behaves identically across the Node versions that will run this (it's legal in Node, unlike browsers, but it's an exotic way to spell `setTimeout` and I'd want one CI run to confirm). My confidence in the NaN and API-failure blockers is high — they're visible in the code alone. My confidence in the multi-GPU blocker's *practical* trigger probability is moderate; the code defect is certain, the exploit frequency depends on hardware I can't see.
