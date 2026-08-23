# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** C:/tmp/idle-reaper-review.md
**Seed:** (none)
**Tokens:** 4486 in / 2710 out | **Cost:** ~$0.0541 | **Wall:** 35.1s | **finish_reason:** stop

---

## VERDICT
REVISE — the core discriminator is sound and the reluctance is well-designed, but a single global `idleSince` plus a deadline check that the reap path bypasses make it both capable of killing fresh work and capable of becoming the runaway it claims to avoid.

Note on house rules: none of the binding rules (styled-components, Victory, palette, touch targets, PII-to-LLM, NASM/yoga language) apply to a Node CLI with no frontend and no LLM calls. File is ~250 lines, under the 300 cap. No violations to flag.

## BLOCKERS

1. **P0 — Stale `idleSince` reaps a freshly loaded model mid-conversation.** Sequence: model A sits idle 11 min → state is `{idleSince: T-11min}`. User (or another agent) unloads A, loads model B, starts a chat. Between turns, util is 9–11%. Next `--reap` run: `observe()` sees low util, reads the *old* `idleSince`, computes `idleMinutes=11 >= grace` → status `reapable` → kills B mid-session, destroying live work. The code even captures `firstSeenModels` at state-write time and then **never compares it** — the fix data is already being recorded and ignored. Evidence: `const idleSince = state.idleSince || now;` and `firstSeenModels: models.map(...)` written but never read. This is the exact false positive the header calls "the expensive failure," and it requires no exotic conditions — just a model swap after the grace period, which is the normal case on a machine running panels.

2. **P1 — `--watch` can loop forever and spam the inbox, becoming the runaway it hunts.** If `ollama stop` fails (and `sh()` swallows all errors, returning `''`), the model stays resident, status stays `reapable`, and the loop hits `continue` — which jumps back to `observe()` **without ever reaching the `Date.now() > deadline` check**. Result: infinite reap-attempt loop until the 240-min ceiling is irrelevant, writing one Hermes memo per iteration (second-resolution timestamps mean distinct filenames). The header comment claims "The watch loop must terminate on its own" — the code does not guarantee it. Evidence: `continue; // loop once more to confirm it is actually clear` placed before the deadline check, and `sh`'s `catch { return ''; }`.

3. **P1 — TOCTOU between sample and stop.** `observe()` samples ~2.8s of util, then `reap()` shells out to `ollama stop` seconds later. A job submitted in that gap (a panel call landing exactly then) gets its model unloaded mid-first-token. Cheap fix: re-sample once immediately before each `ollama stop` and abort if util ≥ threshold.

4. **P2 — GPU 0 only.** `out.split('\n')[0]` reads the first row of nvidia-smi. On a multi-GPU machine, work on GPU 1 is invisible (false positive) and a busy GPU 0 from an unrelated process masks an idle model on GPU 1 (false negative). Single-GPU today, but the doc asks; the code should either assert one GPU or iterate all rows.

## ATTACKS

- **Correctness:**
  - *Decode-phase false positive:* `utilization.gpu` measures SM occupancy, not memory bandwidth. LLM decode is memory-bound; with partial CPU offload, small models, or long slow generations, sustained util can sit under 25% for >10 min while real paid work is happening. The 80–100% figure was measured for *this* model on *this* card during one incident — it is not a universal constant. This is the second-ranked false-positive path after blocker 1.
  - *Batch jobs with gaps > grace:* a script that calls the model every 15 min for 60s will have its model reaped in every gap. Not data loss, but 30–60s reload latency per call and needless wear; arguably working-as-designed, but the memo won't distinguish it.
  - *Non-atomic state writes / concurrent invokers:* a Stop hook firing `--check` while `--watch` is mid-write can read torn JSON. `readState`'s catch returns `{}`, which only resets the clock (fail-safe direction), so severity is low — but `writeFileSync` without write-temp-then-rename is sloppy for a file with multiple writers.
  - *`sh()` swallows everything:* `ollama stop` failing, `nvidia-smi` timing out at 15s under load, and fetch aborts all collapse to the same empty signal. The `unknown` branch handles missing nvidia-smi correctly (refuses to reap blind — good), but a *failed stop* is indistinguishable from a successful one until the next poll.
- **Security:** Minimal surface — localhost-only fetch, `execFileSync` with array args (no injection), model names from the API interpolated into a markdown memo (a maliciously named model could inject markdown/newlines into the inbox file; cosmetic, not exploitable). No secrets, no PII — the privacy claim holds.
- **Data-truth / schema drift:** `size_vram`, `expires_at` from `/api/ps` are used correctly. `expiresAt` is recorded in the memo but never used in the decision — see HIGHEST RISK. No schema drift found.

## HIGHEST RISK

Blocker 1 (stale `idleSince` across model changes) — it converts the normal "swap models between tasks" pattern into a guaranteed eventual kill of live work, precisely the failure the entire design exists to prevent. Cheapest de-risk, two lines: when writing state, store the sorted resident model names; on the next `observe()`, if the set differs, reset `idleSince = now`. The field (`firstSeenModels`) is already in the state file — compare it. Add the pre-stop re-sample (blocker 3) in the same pass.

## CONFIDENCE

- **Unverified:** whether decode-phase util on this specific 5090/Qwen setup ever sustains <25%. The doc's own measurements (idle 9–11%, inference 80–100%) suggest margin, but one incident's numbers are not a characterization. Settling evidence: log util at 1s resolution across several full real generations, including the smallest model used and any CPU-offloaded config, and confirm the min-util-during-work floor.
- **Unverified:** actual `ollama stop` failure modes (model mid-request, name mismatch) — I inferred silent failure from `sh()`'s catch, but whether Ollama blocks, errors, or queues the stop is not in the document. Settling evidence: force-stop a model mid-inference and observe exit code and `/api/ps` afterward.
- **Unverified:** the trigger question (doc Q6). The code ships modes but no scheduler; a Stop hook provably misses the walk-away case that caused the incident. The right trigger is a systemd timer / cron every 5 min running `--reap` (stateless, survives reboots, no daemon to babysit), with `--watch` reserved for explicit walk-away. Whether such a timer is installed is outside the document — if it isn't, this tool will never fire in the scenario it was built for, and the room cooks anyway. That, plus the fact that `OLLAMA_KEEP_ALIVE=5m` would have prevented the original incident with zero code (the memo itself admits this), is the honest shape verdict: the reaper is a correct *backstop*, but if it's the *mechanism*, the keep-alive setting is the bug being worked around.
