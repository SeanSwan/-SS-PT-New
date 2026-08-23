# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** docs/ai-workflow/AI-HANDOFF/PANEL-PACKET-R9-2026-08-23.md
**Tokens (Ollama):** 5625 in / 720 out | **Wall:** 8.8s | **done_reason:** stop

---
## VERDICT
APPROVE — The round-8 regression is fully closed, the invariant holds for all reachable paths, and no new defects were introduced by the fixes.

## BLOCKERS
None.

## ATTACKS
- **Correctness**: 
    - *Non-ASCII Whitespace*: The regex `/[^\S \t\n\r\f\v]/` correctly identifies non-ASCII whitespace (like U+00A0) by negating the ASCII whitespace set. This prevents the "phantom MISSING" bug where a shell would treat `a<NBSP>b.mjs` as one token, but a naive split would see `b.mjs`. Declining to verify is the correct, safe behavior.
    - *Realpath Containment*: The logic `if (real !== null) { ... }` is sound. If `realpathSync` throws (ENOENT), `real` remains `null`, and the code skips the symlink containment check, falling through to `statSync`. Since the file doesn't exist, it cannot be a symlink escaping the root. This correctly fixes the Round 8 regression where a missing file was demoted to UNVERIFIED on symlinked roots.
    - *Hooks Null Check*: Using `'hooks' in cfg` correctly distinguishes between `hooks` being absent (legitimate) and `hooks: null` (invalid config). This prevents the silent skip of null values.
    - *Exit Code*: `process.exitCode = 0` is explicitly documented as intentional for a SessionStart hook to avoid blocking the session. The signal is stdout. This is a valid architectural choice for this specific hook type.

- **Security**: 
    - *Path Traversal*: The `inside` function correctly handles the root separator edge case (`parent.endsWith(sep)`). The `realpathSync` check ensures symlinks cannot escape the repo root. Absolute paths are declined, preventing cross-machine assumptions.
    - *Injection*: No shell execution occurs. The code only reads files and stats paths. No injection risk.

- **Data-truth / schema drift**: 
    - The code correctly handles `settings.json` and `settings.local.json`. It validates the JSON structure (root object, hooks object, groups array, hooks array) before processing. This prevents crashes on malformed configs.

## HIGHEST RISK
The highest risk is the **decline-to-verify** behavior for non-ASCII whitespace and absolute paths. While safe, it means some valid registrations (e.g., `node ./a<NBSP>b.mjs` if the shell *did* split it, or absolute paths in CI) will be reported as UNVERIFIED rather than OK/MISSING. This is a conservative choice that prioritizes avoiding false negatives (phantom MISSING) over false positives (phantom OK). The cheapest way to de-risk is to document this behavior clearly in the `scopeNote` or `why` messages, which the code already does.

## CONFIDENCE
I could not verify the behavior of `realpathSync` on all possible filesystems (e.g., Windows junctions vs. symlinks), but the code's logic is sound for the common cases (macOS `/tmp`, Linux symlinks). The evidence that the Round 8 regression is fixed is strong: the code explicitly checks `real !== null` before applying the containment check, which is the correct fix. I am confident in the correctness of the fixes.
