# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/SWAN-OPS-SLICE01-REVIEW-PACKET-R6-2026-08-21.md
**Tokens:** 11885 in / 21496 out (reasoning: 20522) | total 33381
**Wall:** 338.9s

---

## Q1 — the round-5 fix: correct, complete, behaviour-neutral

**Correct.** The .NET claims check out: `Encoding.UTF8.GetString` uses `ReplacementFallback` by default (bad bytes → U+FFFD, never throws, never returns null), and `Unicode.GetString`/`BigEndianUnicode.GetString` silently ignore a trailing odd byte rather than throwing. The old `$null` contract was provably fictional, so the docstring rewrite ("ALWAYS returns a string") now states the real contract, and the call-site comment ("No null check...") closes the trap for the next maintainer.

**Complete.** The replacement fail-closed mechanism is real and now pinned: BOM-less UTF-16 falls through to the UTF-8 branch, decodes to `R\0U\0N\0…`, and `^[ \t]*RUN_VERDICT[ \t]*:` cannot match an interleaved NUL after the first `R` — so the report quarantines as "verdict block not found in the first 40 lines". The test measures the mechanism, not an assertion about it.

**Behaviour change from the deletion: none.** The condition could never be true for any input, so control flow is identical for every possible file; the deleted reason string 'report could not be decoded' was unprintable and is now absent from source, consistent with the packet.

## Q2 — one remaining documentation/behaviour disagreement

The tripwire's emphasis bound contradicts two of its own documented claims.

The code: `[*_]{0,2}INJECTION ATTEMPT OBSERVED`.

The claims, both in the comment above it:
- "Only indentation, blockquote markers, list markers and emphasis may precede it"
- "The prefix class must cover every way an agent might legitimately render a record line, or the tripwire leaks" — and, above that, "What must never publish quietly is a DISCREPANCY".

The counterexample: a record rendered in bold-italic — `***INJECTION ATTEMPT OBSERVED: https://x` at line start (likewise `___`, `**_`, `_*` and any 3-char emphasis opening). Engine trace on `***`: the optional list branch fails (no space after the first `*`), `[*_]{0,2}` greedily consumes `**`, the literal `INJECTION` then meets the third `*` and fails at every backtrack. No match. With an honest `INJECTION_OBSERVED: NO` header, that report publishes **clean — no flag** — violating "must never publish quietly."

This is precisely the round-3 self-attack class re-appearing one character wider: the round-3 sweep found blockquote, numbered list, and bold (2 chars) and fixed them; bold-italic (3 chars) is the fourth natural form, and the test file pins the three but contains no 3-char case (grep confirms no `***INJECTION` anywhere in tests). Not padding: one PowerShell expression falsifies the documented invariant, and both quoted sentences grep against source.

Suggested repair: `[*_]{0,3}`, pinned by `***INJECTION ATTEMPT OBSERVED` + `NO` header → FLAGGED. This cannot reopen the DoS — the worst case is a FLAG, which round 3 already accepts as the floor for attacker-shaped text (the 'GLM R3-a' and 'attacker text never blocks publication' cases pin FLAGGED, not PUBLISHED), and every existing decoration/mid-line test is unaffected since the anchor stays at line start.

Everything else swept clean: the BOM ladder branches (including BOM-as-U+FEFF stripped by the final replace), the 40-line boundary at both edges, contiguity/order enforcement, exit-code interplay, all tripwire true/false-positive cases, stale-flag cleanup, millisecond collision naming, sidecar write-failure handling, scalar-string returns for all five statuses, the 46-assertion count, and every docstring claim. Two things examined and deliberately **not** flagged: the quarantine note's prose enumeration omits the `gate error` reason class (a gloss — the authoritative Reasons list is printed directly above it), and "inherit an inherited warning" is a duplicated word, cosmetic only.

## Q3 — is the loop dry?

**Not dry.** One live finding remains — the emphasis bound above. It is narrow (a missed flag, not an opened gate and not a DoS), fully specified, and greppable; after it is fixed and pinned, I would expect the loop to close.

REVISE
