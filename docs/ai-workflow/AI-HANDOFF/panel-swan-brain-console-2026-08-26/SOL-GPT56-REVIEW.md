# ChatGPT GPT-5.6 Sol — Hostile Review (human-relayed, filesystem access)

**Verdict: REJECT.** Relayed by Sean under the `seat-relay` protocol.

## Opus arbitration — every blocker independently verified

| # | Sol's claim | Opus verification | Status |
|---|---|---|---|
| B1 | Analysis ran against a stale snapshot; `origin/main` has 23 src files and a **fail-closed** engine that refuses durable work pending signed authority, trusted time, revocation, legal/IAM/key-management gates | `git show origin/main:scripts/design-brain/README.md` confirms verbatim. Local `src/` = **11** files; main = **23** | **UPHELD** |
| B2 | 17m24s does not support ~2.9 min/claim | `writes.jsonl` — batch FIRST written `00:39:44.381Z` (2156 B), REWRITTEN `01:16:33.898Z` (2244 B), adjudicated `01:33:57.189Z`. So 54m13s from first availability, or 17m23s from an unexplained rewrite. No human start time exists | **UPHELD → `[UNKNOWN]`** |
| B3 | D1 is not unruled — `D1 (Mobbin ToS) = GO, documented` | `NEXT-CHAT-PROMPT-brain-and-completion-2026-07-21.md:60`. And main's `external-reference-mcp.md` gates activation far more broadly | **UPHELD** |
| B4 | FABLE GATE is purpose-blind and bypassable: "blueprint executable verbatim" is a label-loophole; `spend-guard-gate.mjs` checks cost, fails open, never validates purpose | Correct as written | **UPHELD** |
| B5 | `consult-fable.mjs:58` loads `--seed` with raw `readFileSync` while the document goes through `readForEgress` — PII can egress via seed | True **on this branch**. See correction below | **UPHELD, severity corrected** |
| F1 | One pilot run proven; "stalled because D1 unruled" not proven | Consistent with B1/B3 | **UPHELD** |
| F2 | Parking Doctrine/Seats/Studio/Library behind an organic-batch gate is overcorrection — only the Desk depends on intake | Correct. I over-corrected after being wrong | **UPHELD** |
| F3 | Blueprint frontmatter still says `Build` / `status: open`; both docs say `supersedes: none` — a future agent can pick the wrong governing decision (Rule 75) | Confirmed | **UPHELD** |
| F4 | Distro is `Ubuntu-22.04`, not the `Ubuntu` alias — hard-coding `\wsl$\Ubuntu` recreates the false-absence bug | `wsl.exe -l -v` → `Ubuntu-22.04` | **UPHELD** |

## One correction — which reinforces Sol's own MISSED

**B5 is a stale-branch artifact, not a live hole.** On `origin/main`, `consult-fable.mjs` is a **22-line shim** delegating to `scripts/context-gateway/src/consult.mjs`, where document *and* seed both pass through the same redaction path and a secret-file guard. That file carries the comment:

> `// provider (Kimi) would accept a sensitive --seed (hostile pass 5, finding 1: seed bypass).`

The bypass was found and fixed by a prior hostile pass. The 138-line local copy is dead code on a stale branch.

**This does not weaken Sol's verdict — it proves it.** Sol reviewed the stale branch because that is the branch I pointed it at, so even the *bugs* it found are stale. Its MISSED applies to itself, and the fix is the same either way: **rebuild the state of the world from `origin/main` before ruling anything.**

## Review chain, closed

| Seat | Verdict | Findings | Real | Cost |
|---|---|---|---|---|
| Ox Alpha | REVISE | 10 | 10 | $0.0000 |
| GLM 5.3 | REVISE | 14 | 14 | $0.0000 |
| Fable 5 | REVISE | 6 | 6 | 1 review call |
| **GPT-5.6 Sol** | **REJECT** | 9 | **9** (1 severity-corrected) | Sean's subscription |

**39 findings, zero disproven, one severity correction.** Four seats, four different failure classes caught — and **all four inherited the same stale baseline**, because that is what the packet pointed at. The packet's baseline is the author's job.
