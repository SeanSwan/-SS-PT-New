# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/PANEL-PACKET-R8-2026-08-23.md
**Seed:** (none)
**Tokens:** 4830 in / 20113 out · **Cost:** ~$0.1301 · **Wall:** 370.1s · **finish:** stop

---

## VERDICT
REVISE — round-7 closed equals-form / root-shape / dropped-`scopeNote`, but the new `realpathSync` containment check compares a lexical fallback path to a real root and mis-verdicts the exact absence case this module exists to catch.

## BLOCKERS
1. **P1** — `root` is a symlink (macOS `/tmp`→`/private/tmp`, `/var`→`/private/var`, Docker/GHA workspaces, any `realpath(root) !== resolve(root)`): a registered relative hook whose file is absent does **not** return `MISSING`. `realpathSync(abs)` throws, `real` stays lexical (`/tmp/proj/hooks/x.mjs`), `rootReal` is canonical (`/private/tmp/proj`), `real.startsWith(rootReal + sep)` is false → `UNVERIFIED`. Input: `cmd = "node ./hooks/x.mjs"`, `root` symlink, `./hooks/x.mjs` ENOENT. Output: “could NOT be verified” instead of “DO NOT EXIST / phantom guard”. The 2026-08-22 alarm is demoted, not silenced. Same fallback also does the inverse when an intermediate dir is a symlink *out* of the repo and the leaf is absent: lexical `real` stays inside → `statSync` ENOENT → `MISSING` for a target they refuse to judge when it exists. Comment at 111 (“absent — the lexical check below still applies”) does not match the `||` at 112, which still requires the real-prefix test. Evidence: `scripts/lib/hook-registration.mjs:108-126`.

## ATTACKS
- Correctness: `classifyCommand` is total on the paths written — I did not find a registered entry that returns nothing. Equals-form `tok.startsWith('-')` is sound (no more phantom `MISSING` on `--import=./x.mjs`). `FLAG_TAKES_FILE` still lists `--inspect-brk` and `-c`, which do **not** take a file operand for node; `node --inspect-brk ./guard.mjs` and `node -c ./guard.mjs` become `UNVERIFIED` while `--inspect-brk=9229 ./guard.mjs` can be `OK`. `statSync(abs)` after a successful outside-escaping realpath is unreachable; after a *failed* realpath it is not (blocker above). Gate emit always sets `process.exitCode = 0` (warn-only “gate”); if anything earlier set a non-zero code, this tail wipes it — confirm that is still the product contract.
- Security: containment is the security-relevant bit and is only half-enforced (exists+symlink-out → `UNVERIFIED`; missing+symlink-out → `MISSING`). `startsWith(prefix + sep)` is an acceptable prefix check when both sides are canonical; it is not when one side is lexical. Findings interpolate JSON event names and a 90-char command `brief` into stdout (ANSI/newline shaping); low severity. No authn/IDOR/SSRF surface here.
- Data-truth / schema drift: Claude `type: "prompt"` (or any hook with no `command`) is always `UNVERIFIED`, not skipped — noisy if that schema is in use. `scopeNote` is appended as an extra `findings` element, so the printed “N drift finding(s)” count is off-by-one whenever check 7 fires (`drift-check-gate.mjs` emit block). No PascalCase/column drift in these files. House rules (styled-components, Victory, palette, 44px, ≤300 lines, no “NASM-certified”, no yoga-speak, no PII-to-LLM): nothing in this pair violates them; `hook-registration.mjs` is 226 lines.

## HIGHEST RISK
Symlink-root turns certain `MISSING` into `UNVERIFIED`, so the phantom-guard wording never appears in the environments most likely to run the tests (`os.tmpdir()` on macOS) or some CI checkouts. Cheapest de-risk: when `realpathSync(abs)` fails, `realpathSync(dirname(abs))` + `basename` (else skip the real-prefix predicate entirely — do **not** compare lexical `abs` to `rootReal`); keep the lexical `abs.startsWith(resolve(root)+sep)` check either way. Fixture: `root` is a symlink, leaf absent → must be `MISSING`; `root/sub` symlink to `/etc`, leaf absent → must be `UNVERIFIED`; `root/sub` symlink to `/etc`, leaf present → `UNVERIFIED`.

## CONFIDENCE
Could not verify how `SS_PT` is computed. If the caller already `realpathSync`s the repo root, the P1 does not fire in production and only remains a library footgun for tests/`root='.'`. No test file was in this packet, so I cannot see whether fuzzing asserts “exactly one verdict” without asserting *which* verdict, or whether tmpdir fixtures already lock in `UNVERIFIED`. The gate file is a tail only — cannot confirm earlier checks, whether stdout is the harness’s fail signal, or `await import` sits under TLA. Evidence that would settle it: the `SS_PT` assignment, the hook-registration test (especially tmpdir + missing leaf), and one live run with `root` → other path and a deliberately absent registration.
