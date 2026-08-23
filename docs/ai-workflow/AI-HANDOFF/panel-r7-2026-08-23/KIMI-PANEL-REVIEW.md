# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/PANEL-PACKET-R7-2026-08-23.md
**Seed:** (none)
**Tokens:** 3815 in / 2704 out | **Cost:** ~$0.0520 | **Wall:** 41.9s | **finish_reason:** stop

---

## VERDICT
REVISE — the round-6 loader-operand fix is bypassable via the `--flag=operand` form, re-opening the exact silent-clean class the module exists to close, and a top-level non-object settings file still yields zero verdicts one layer up.

## BLOCKERS

1. **P1 — `--loader=./x.mjs` / `--require=./x.mjs` (equals-form) bypasses the loader-operand guard → silent clean.** Input: `node --import=./preload.mjs ./guard` (or `-r./preload.mjs`). `SCRIPT_EXT` matches the whole word `--import=./preload.mjs` (it ends in `.mjs`), so it becomes the single candidate. The guard at `hook-registration.mjs` (~line 95, `if (idx > 0 && FLAG_TAKES_FILE.test(words[idx - 1]))`) inspects `words[idx-1]`, which is `node` — not a flag — so classification proceeds, `statSync` on the preload succeeds, verdict is **OK**, and the real extensionless entrypoint is never inspected. This is byte-for-byte the round-6 failure the comment block claims to close ("the only .mjs is the LOADER and the real entrypoint is extensionless"); only the space-separated subset was fixed. `FLAG_TAKES_FILE` (~line 47) has no `=`-form or joined-short-form handling.

2. **P1 — top-level non-object JSON config yields zero findings (silent clean one layer above the hooks).** Input: `.claude/settings.json` containing `"just a string"`, `[1,2,3]`, or `42`. `JSON.parse` succeeds; `cfg.hooks` is `undefined`, so the `cfg.hooks != null` shape guard (~line 152) passes, `Object.entries(cfg.hooks || {})` iterates zero times, and `auditHookRegistrations` returns `findings: []`. The module's own invariant — "no path returns nothing" — is enforced for hook *entries* but not for the *document*; a structurally invalid config in which the harness registers nothing reads as fully clean. The non-object-`hooks` case was handled; the non-object-`cfg` case is the same defect one level up, unhandled.

3. **P2 — root-escape check is lexical, not realpath; symlinked directories defeat it.** Input: `.claude/hooks` is a symlink to `/etc/outside`, and a hook registers `.claude/hooks/guard.mjs`. `resolve(root, tok)` (~line 108) stays lexically inside root, `statSync` follows the symlink, and a file existing at the external target returns OK — a verdict about a file outside the repo, which the `..` decline (same block) explicitly refuses to make. The containment guarantee is inconsistent: declined for `..`, permitted via symlink.

## ATTACKS

- **Correctness:** `words.indexOf(candidates[0])` is safe only because duplicate identical tokens force `candidates.length > 1` → UNVERIFIED; that coupling is implicit and fragile — a future "dedupe candidates" refactor silently breaks the flag-operand lookup. `resolve(root) + sep` misbehaves when `root` is a filesystem root (`/` → prefix `//`, everything declines) — fail-closed, so acceptable, but undocumented. TOCTOU between `statSync` and harness execution exists but is out of scope for a static gate.
- **Security:** the gate always sets `process.exitCode = 0`, including when MISSING findings exist. If any CI or harness treats exit status as the signal, this "gate" never blocks — it only prints. The document frames it as a warning emitter, so this may be intentional, but the name "gate" invites the misreading; it should be asserted in a comment or the caller should be confirmed to parse stdout.
- **Data-truth / schema drift:** the audit assumes the harness's settings schema (`hooks` → event → groups[] → `hooks[]` → `command`). If the harness ever accepts a string-valued group, a top-level `command`, or an alternate key (`cmd`, `script`), those entries fall into the "no hooks array" shape bucket only if the group is non-array-shaped — a group like `{command: "..."}` (no `hooks` key) is flagged, good — but any *new* registration shape the harness adds later is silently un-audited. There is no canary for "schema version we don't recognise."

## HIGHEST RISK

Blocker 1 (equals-form loader bypass). It is the cheapest possible operator error — `--import=` is the *idiomatic* form in modern Node docs — and it produces the precise failure the entire module was built to prevent: OK asserted for a loader while the registered guard goes unverified, reading as clean. Cheapest de-risk: before the `FLAG_TAKES_FILE` check, normalize each word — if a candidate matches `/^(-{1,2}[\w-]+)=([^\s]+)$/`, treat capture group 2 as the candidate path and group 1 as its preceding flag (declining if group 1 ∈ FLAG_TAKES_FILE); also decline joined short forms (`-r./x.mjs`) via `/^-[a-zA-Z]\S/`. Add both to the fuzz corpus as must-decline cases. ~10 lines.

## CONFIDENCE

I could not verify: (a) whether the harness ever emits `--flag=value` or joined short flags in practice — if no registration in the wild uses them, Blocker 1 is latent rather than live; a `grep -rE '\-\-(loader|require|import)=' .claude/` settles it in one command. (b) Whether exit 0-with-findings is the intended contract — that depends on the harness's hook protocol, which is not in the packet; the SKILL.md referenced in the emit block would settle it. (c) Whether the fuzz test actually covers the equals-form and top-level-array cases — the test file is not included, only described ("fuzzes for completeness"); if the fuzzer generates only space-separated tokens, it cannot find Blocker 1, which is exactly how round 5's passing test codified the outage. (d) House-rule compliance (styled-components, Victory, palette, 44px, NASM phrasing) — this packet contains no UI, chart, copy, or credential text, so those rules are not exercisable here; no violations to flag.
