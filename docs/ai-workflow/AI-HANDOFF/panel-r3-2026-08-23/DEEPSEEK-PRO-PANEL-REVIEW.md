# DeepSeek V4 Pro — Hostile Gate Review

**Reviewer:** OpenRouter `deepseek/deepseek-v4-pro` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/PANEL-PACKET-R3-2026-08-23.md
**Seed:** (none)
**Tokens:** 5391 in / 7422 out · **Cost:** ~$0.0082 · **Wall:** 126.7s · **finish:** stop

---

## VERDICT
REVISE — the drift‑check gate still has a directory‑is‑a‑file false‑negative that would let a missing guard go silent, and the zero‑runnable‑seats exit‑code fix is unverifiable from the truncated snippet.

## BLOCKERS
1. **P1** – **Directory posing as script bypasses the check.**  
   `existsSync(abs)` returns `true` for directories. If a registered hook path ends in (e.g.) `script.sh` but that path is a *directory* instead of a file, the check reports healthy while the guard cannot run — silence‑means‑clean reinstated.  
   File: `scripts/hooks/drift-check-gate.mjs`, line using `existsSync(abs)` inside the token loop.  
   Fix: `existsSync(abs) && statSync(abs).isFile()` (or `fs.statSync`).

2. **P2** – **Zero‑runnable‑seats exit code not confirmed in provided source.**  
   Round‑2 fix mandated `exit 1` when `seatsToRun` is empty. The snippet stops after `if (skipped.length) { … }`; the actual seat‑execution logic and exit path are cut off. If the fix is missing, the process will exit 0 when all paid seats are skipped and no free seats run, violating the round‑2 correction.  
   File: `scripts/consult-panel.mjs` (truncated before run loop).

## ATTACKS
- **Correctness**  
  - Drift‑check tokeniser: a non‑script argument that ends in a script extension (e.g., `echo "backup.sh"`) becomes a **false positive**, training operators to ignore the gate.  
  - The tokeniser strips quotes, then replaces backslashes with forward slashes globally (`rawTok.replace(/\\/g, '/')`). A backslash‑escape inside a quoted string (like `"hello\nworld.sh"`) would be mangled to `hello/nworld.sh`, possibly creating a phantom missing‑file alert.  
  - SCRIPT_EXT test does not exclude tokens that look like scripts but are part of command‑substitution output (`$(echo scripts/hooks)/script.mjs` → the literal token `scripts/hooks)/script.mjs` is checked, not the resolved path). This yields a false positive on a healthy hook.  
  - UNC paths (`\\server\share`) are converted to `//server/share`; `startsWith('/')` will match them, so `existsSync` on the UNC path is attempted. It may work on some Windows systems but is not guaranteed; in any case it should be an explicit UNC check.

- **Security**  
  - API key travels in `x-goog-api-key` header – correct.  
  - Redaction of document, seed, and remit is complete before constructing the prompt string. No un‑redacted paths visible in the wire‑bound data.

- **Data‑truth / schema drift**  
  - Not applicable in this context.

## HIGHEST RISK
The **directory‑as‑file false negative** is the most dangerous: a registration pointing to a directory that was accidentally created (e.g., from a checkout that turns a file into a folder) would pass the gate, leaving the hook silently inactive — exactly the outage pattern the check is meant to prevent.  
Cheapest de‑risk: add `&& statSync(abs).isFile()` to the existence check and write a unit test with a directory named `sentry.sh` to prove the gate catches it.

## CONFIDENCE
I could **not** verify that the zero‑runnable‑seats exit path exists as described. The provided `consult-panel.mjs` snippet ends after the “SKIPPING paid seats” log; the run‑loop and final exit are missing. I need the full file (or at least the fragment from the skipped section to the process exit) to confirm that `seatsToRun.length === 0` triggers `process.exit(1)`. Without that, I cannot attest that the round‑2 fix is actually ship‑ready.
