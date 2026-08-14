---
originating_model: claude-opus-5
co_reviewers: none (paid Kimi K3 review preflighted, NOT yet run — awaiting owner approval)
captured: 2026-08-14
surface: marketing fuzzy-variable harness + speed-to-lead readiness tests
boards: SWA-40 (not updated — no Linear tool loaded)
status: shipped to branch claude/marketing-readiness-s2l-2026-08-14 — NOT pushed, NOT merged
models_used:
  - model: claude-opus-5
    role: builder + hostile reviewer + final decider
    did: built the fuzzy-variable validator/generator seam, ran a 6-round dry loop, then found its own committed PII violation while sanitizing a paid-review packet
    cost: subscription (flat rate)
skills_touched:
  - id: rule-8 (zero PII to LLMs)
    change: gap-found
    motivated_by: a real personal email used as a test FIXTURE passed a full 6-round hostile loop, a pre-commit secret scanner, and a repo-wide grep for secret SHAPES — because it is neither a secret nor in production code
  - id: opus-kimi-consensus launcher
    change: defect-found
    motivated_by: run-newsroom-top-ai-panel.ps1 hardcodes three model remits for a DIFFERENT project with no override param; invoking it for any other review spends money on irrelevant output
---

# Sanitization caught what the hostile loop missed

---

## 1. A hostile loop optimized for correctness will not find a privacy defect

I ran six dry-loop rounds against this slice. Rounds attacked logic, mount truth, cross-test
pollution, rendering, and consumer breakage. All passed. A pre-commit secret scanner passed on
every commit. A repo-wide grep for secret shapes passed.

Then I built a packet to send to a paid external reviewer, ran the sanitization step, and found
a real personal email address sitting in a committed test file — used by me, four times, as the
"off-domain from-address" fixture.

Every gate missed it for the same reason: **it is not a secret and it is not in production code.**
Secret scanners hunt key shapes. Hostile review hunts wrong behaviour. A real email in a test
fixture is neither — it is correct-looking test data that happens to be a live human identifier.

The gate that caught it was the one that asks a different question: *is this safe to send
somewhere else?* That question has no overlap with *is this correct?*

**The transferable rule:** run the packet-sanitization question against your own work even when
you are not sending a packet. "Would I be comfortable shipping this file to an external party"
finds a class that correctness review structurally cannot.

## 2. The negative case is where real data hides best

The fixture appeared inside a test asserting the payload **never leaks a from-address**. I was
proving non-leakage using a real address as the thing not leaked.

That is precisely why it survived. In a positive assertion, real data looks obviously wrong. In a
negative assertion it reads as rigor — "I proved it does not leak *the actual address*" feels
stronger than proving it does not leak a placeholder. It is not stronger. It is identical in
proof value and strictly worse in exposure, because the string now lives in git history whether
or not the assertion ever fails.

**The transferable rule:** never use real contact data as a fixture, *especially* as the negative
case. Use an RFC 2606 reserved domain (`.test`, `.invalid`, `example.com`) so the value cannot
resolve and cannot be mistaken for live data by a future reader or scanner.

## 3. Read a paid tool's actual prompt payload before spending

The panel launcher this repo provides for paid multi-model review has all three model remits
hardcoded for a different project, and no override parameter. Its NAME describes a generic panel;
its PAYLOAD describes one specific app. Invoking it for anything else pays three models to answer
a question nobody asked.

**The transferable rule:** before any paid call, read the prompt that will actually be sent, not
the tool's name or docstring. Cost gates protect against *overspend*; nothing protects against
*correctly-priced irrelevance*.

## 4. Derive a guard from the failure shape, not a proxy for it

My clause validator rejected list-like output via `hasComma && wordCount > 6`. Writing the test
case showed a 5-word enumeration passing cleanly. Word count was a proxy for "this is a list";
comma count is the actual signal. One comma is a subordinate clause, two or more is an
enumeration.

**The transferable rule:** when a guard uses a proxy metric, write the case that separates the
proxy from the real property. If you cannot think of one, the proxy is probably fine; if you can,
the guard is already wrong.

## Who did what

**claude-opus-5** did all of it and produced every error below. No external model has reviewed
this code — the Kimi K3 pass is preflighted and unspent, so treat the validator's coverage as
one model's adversarial imagination, not a verified bypass audit. That distinction matters most
for the unicode/homoglyph class, which I did NOT test and which is exactly what a second lens
was commissioned to find.

## Skills created or changed

No new skill. Two defects recorded against existing tooling: rule 8's enforcement has a blind
spot for non-secret PII in fixtures, and the paid-panel launcher needs either a `-Remit`
parameter or a rename that admits its scope.

## Mistakes I made

- Committed a real personal email as a test fixture; caught at packet sanitization, after a full
  hostile loop → rule 8, extended: fixtures are PII surface too.
- Built a guard on a proxy metric (word count) instead of the failure shape (comma count) →
  caught by my own test case.
- Nearly spent on a paid panel whose remits target a different project → caught by reading the
  param block before invoking.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before? | What actually stopped it |
|---|---|---|---|
| PII in a committed artifact | 1 | No — prior write-ups cover secrets and PII-to-LLM, not PII-as-fixture | Packet sanitization. Procedural fix: add fixture-shaped identifiers (real-looking emails/phones in `__tests__`) to the pre-commit scan, or the next agent repeats this exactly. |
| Guard built on a proxy metric | 1 | No | Writing the separating test case before trusting the rule. |
| Trusting a tool's name over its payload | 1 | Partially — the "validate the instrument before believing it" memory covers probes, not paid prompts | Reading the param block. Same root class as the probe-validation memory; the memory should be widened from "probes" to "any instrument, including paid prompts". |

Nothing here is a repeat of a documented lesson — which is the one good sign in this ledger. The
PII-as-fixture class is new to the corpus, so its value depends entirely on the procedural fix
above landing in the pre-commit scan rather than living only in this file.

## External-model calibration

No paid model was consulted. Kimi K3 preflight: packet 16,266 bytes, worst case $0.95 against a
$3.00 cap, 0 calls made. Recorded so the eventual run can be scored against this baseline —
specifically, whether it finds unicode/homoglyph bypasses that solo review did not.
