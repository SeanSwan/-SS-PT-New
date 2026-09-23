# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/EGRESS-REDACTOR-REVIEW-PACKET-2026-08-23.md
**Tokens:** 3029 in / 17598 out (reasoning: 15717) | total 20627
**Wall:** 262.8s

---

VERDICT:   REVISE

(Line anchors are to symbols, not line numbers — this packet is self-redacted in transit, so byte positions in the excerpt cannot be trusted. That is itself Finding 2.)

BLOCKERS:

1. **`redact-egress.mjs` — `identityPatterns()` ordering: the `<PATH>` patterns are dead code for the incident's exact shape.** The username regex runs *first*; its output `<OPERATOR>` begins with `<`, and every path char-class excludes `<` and `>` (`[^\\\s"'<>]+`, `[^/\s"'<>:,;)\]]+`). So `C:\Users\dan\OneDrive - Contoso\roadmap.xlsx` → pass 1 → `C:\Users\<OPERATOR>\OneDrive - Contoso\roadmap.xlsx` → pass 2 **cannot match past the `<`** and the entire path survives with only the username token swapped. Same for `/home/<OPERATOR>/...`; the WSL pattern is doubly dead (Finding 1). Home-directory paths — the entire incident class — never collapse; `<PATH>` only ever fires on paths that *don't* contain the operator. Employer, project names, and filenames ship. Your own telemetry proved this went unnoticed: the incident replay reported "1 → 0 occurrences" (a username grep) when the `hits` array was sitting right there showing `<PATH>×0`. Fix is a two-line reorder: path patterns before username patterns.

2. **`redact-egress.mjs` — `selfTest()` asserts absence, not output, and therefore passed while Blocker 1 existed.** Trace it: the canary's own `C:\Users\${user}\y` survives as `C:\Users\<OPERATOR>\y` (per Blocker 1), yet both checks pass because the username string is absent and the secret string is absent. A canary that passes while a primary pattern is provably dead in the canary's own input is canary theatre — the precise overclaim ("a control that returns clean without proving it can find anything") this work exists to prohibit. Assert exact expected output (`canary <PATH>/x <PATH> <REDACTED-KEY>`) and plant one live sample per pattern class. You asked in §4.1 whether the canary is theatre: yes, provably, and not for the reason you gave.

3. **`identityPatterns()` — substring username replacement with a length-3 floor corrupts payloads on common machine accounts.** `homedir()=/root` arms the string `root`: "root cause" → `<OPERATOR> cause", "project root" mangled — on any root-run container this rewrites every consult payload. CI user `runner`: "test runner" mangled. Windows `admin`/`user`: "admin panel", "end user" mangled. And substring matching corrupts unrelated tokens: username `dan` rewrites `jordan` → `jor<OPERATOR>` and `abundance` → `abun<OPERATOR>ce`. §4.3's own sentence in this packet renders as "home directory is `<PATH>` or `<PATH>` yields a common English word" — the redactor already destroyed its own documentation. The floor is the wrong mechanism: you need word boundaries plus a common-word stoplist, or restrict identity matching to path/token contexts.

4. **Wiring durability repeats the existence fallacy the packet indicts.** "15/15 wired, 0 unwired" was proven by a grep — a point-in-time census, believed. Script #16 written tomorrow ships unwired and nothing fails. The original incident was exactly this: coverage measured once and trusted. There is no choke point, no lint/CI rule forcing `consult-*.mjs` through one `sendForEgress()`. Combined with §6 (everything uncommitted, on a branch 2,226 commits behind main), the durable fix is neither durable nor landed.

FINDINGS:

1. **HIGH — `identityPatterns()`, WSL pattern is unreachable dead code**: the generic `/Users/` pattern runs before `/mnt/[a-z]/Users/` and consumes its target. An untested pattern shipped and nothing noticed.
2. **HIGH — the packet's self-redaction broke its own reviewability**: the planted canary literal is redacted in transit, so no reviewer can verify it actually matches the `sk-CANARY` prefix check or the `{12,}` shape (a source that planted the placeholder `<REDACTED-KEY>` literally would make the check vacuous forever, undetectably). Egress packets need a redaction manifest — pattern id, offsets, sha256 of original — so reviewers can distinguish mechanical redaction from authorial omission.
3. **MEDIUM — token taxonomy regression risk**: no `ghp_`/`gho_`, `AKIA`, `glpat-`, `npm_`, `dop_v1_`, `mysql://`/`mongodb://`, and no opaque `Bearer <token>` — which the *old* sanitizer had and the shared lib dropped. Only the 3 legacy scripts still cover it; deleting the "drifting copies" as intended silently regresses. Backstop with a high-entropy detector (`[A-Za-z0-9_-]{20,}` + context keywords).
4. **MEDIUM — the drift root cause was layered, not removed**: the 3 legacy sanitizers still run after the shared one. Three copies remain three copies.
5. **MEDIUM — `quiet:true` in `consult-codex.mjs`'s loop**: per-doc quiet is fine; zero aggregate audit trail is how the last control rotted. One summary line with totals.
6. **LOW — §4.6 poses a false trade-off**: regexes are immutable per process; re-running the canary adds no new proof after first success. Cache patterns, self-test once per process, throw on rebuild.
7. **LOW — `userInfo()` can throw** on hosts without a passwd entry; it fails closed but crashes opaquely. Wrap it.
8. **LOW — unhandled identity classes**: hostnames (`DESKTOP-XXXX` in stack traces), NTLM `MACHINE\user` forms, `~`-relative paths.
9. **INFO — §5: the proposed git rule is not sufficient.** `git commit -- <paths>` still races (the other agent's full commit sweeps your staged blobs in the window), silently commits *worktree* content rather than your staged intermediate, and leaves their entries staged for the next sweep. The git-native fix is a worktree per lane — the index is per-worktree. Failing that, a lockfile serializing add+commit. Forbidding commits in a shared tree is defensible; worktrees are better.
10. **INFO — §4.8**: the gate is the right layer, but the count grew 59→61 *while being measured* — generation outpaces egress defense. Redact at write time in the AI-HANDOFF generator and add a drift counter, or the loaded gun accumulates rounds.

MISSED:

- Golden-file tests asserting exact output. The 13 passing tests demonstrably do not cover ordering, WSL, root-user, OneDrive, or substring-corruption cases — three of which are broken.
- An enforcement layer making wiring a structural invariant (choke point / lint rule / CI failure), not a census.
- A negative control: run the *old* sanitizer against the new test corpus to quantify what migration dropped (would have caught Bearer).
- Idempotence property test: `redact(redact(x)) === redact(x)`.
- Verifying `hits` telemetry is consumed anywhere — Blocker 1 was visible in your own output and went unread.
- Machine hostname and git display name as identity classes; "username in paths" was accepted as the whole class space, which is how the last incident started.

ONE THING:

Convert `selfTest()` from absence-checks to an exact-output equivalence test over a fixture corpus containing one live sample per pattern class — including `C:\Users\<me>\...`, WSL, and a root-run machine. It is a change to one function; it would have caught Blockers 1, 2, and Finding 1 automatically; and it turns the artifact's central claim — "a control must prove it can find" — from slogan into mechanism.

The design is not security theatre: it caught two database URLs nobody had flagged and it does neutralize the username in the incident path (via the username pattern, which is why your replay showed 1→0). But it currently claims a `<PATH>` coverage it cannot deliver and a canary proof it does not have — which is the same species of overclaim as the control it replaced. Fix the ordering, fix the canary, land the work.
