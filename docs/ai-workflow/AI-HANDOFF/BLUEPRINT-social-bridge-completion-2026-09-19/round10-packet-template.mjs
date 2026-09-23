/**
 * round10-packet-template.mjs — the round-10 packet's prose and section layout.
 *
 * MODELLED ON round9-packet-template.mjs, which was written to be reused: its own header says
 * "a future round can reuse the prose with a different artifact set". The split is by ROLE — this
 * module owns the WORDS and the section ORDER; `build-round10-packet.mjs` owns reading files and
 * hashing them. This module performs NO file reads and computes NO hashes. If it did, an inlined
 * block could disagree with its own stated sha256, which is the exact defect round 9's builder
 * carried and this round exists to prove fixed.
 *
 * WHAT IS DIFFERENT FROM ROUND 9, and why this is a separate file rather than a parameter.
 * Round 9 asked "are the round-8 defects closed?". Round 10 asks a narrower and more awkward
 * question: "are the round-9 FIXES real, and does the evidence for them hold up?" Round 9's own
 * packet contained a claim that turned out to be FALSE — that its finding-2 fix released the body —
 * because the fix was written, reviewed, and shipped without anyone noticing that `body.cancel()`
 * throws on a locked stream. Round 10 is therefore built around the possibility that its author is
 * wrong in the same way again.
 */

export function renderRound10Packet({ sources, tests, commits, round9Review, mutationRecord, builtUtc, targetCommit }) {
  return `---
title: "Round 10 review packet — are the round-9 FIXES real? (adversarial pass)"
purpose: >
  Adjudicate the fixes that round 9 produced, at source level, with every artifact inlined. Round 9
  shipped a fix that did not work; this packet is built on the assumption that round 10's author is
  as capable of the same error as round 9's.
predecessor: Z:/HostileReviews/2026-09-21-212053-social-bridge-spotlight-round-9-astra-classifier.md
target_commit: ${targetCommit}
repo: SS-PT
branch: creator-brains-engine-r2-20260915
built_utc: ${builtUtc}
built_by: build-round10-packet.mjs
---

# Round 10 review packet — are the round-9 FIXES real?

## §0 — Read this first: the unusual thing about this round

Round 9 returned \`DEFECTS-FOUND\` — 0 critical / 0 high / 3 medium / 2 low, 5 unproven — and the
three medium findings were fixed. **Then one of the fixes turned out not to work.**

The finding-2 fix called \`response.body.cancel()\` to release the response body on the error path.
It throws:

\`\`\`
Invalid state: ReadableStream is locked
\`\`\`

because \`getReader()\` had already taken the lock, and an empty \`catch\` swallowed the throw. The fix
was written, reviewed, committed as \`7a23939cf\`, and described as complete — **and it did nothing.**
It was caught only because finding 3 forced settlement to be recorded *after* the await, which is a
different finding entirely.

**That is the defect class this round exists to hunt.** Not "is the code wrong", but: *does the
evidence supporting "the code is right" actually entail it?* Round 8 found it (R6-01), round 9 found
it in itself, and the loop keeps finding it, so assume it is here again.

**What you are being asked to do:** falsify the claims in §2. In particular, do not accept the
mutation records as proof — ask whether the recorded mutations are the ones that would *matter*,
and whether the assertions are written to catch them.

**Nothing below is cited by reference.** Every source, every test, every commit and both reviews are
embedded in full, each with its sha256 computed from the same bytes you are reading.

**What you can and cannot do.** You are read-only and shell-less: you **cannot execute** anything.
Do not attempt socket tests or mutation runs. Their absence is expected and is accounted for in §5.

---

## §1 — Remit

Adversarial pass. Your job is to **falsify** the claims below, not to endorse them. For each claim
return \`CONFIRMED\`, \`FALSIFIED\`, or \`BLOCKED / unproven\`, naming the line of source that supports
your verdict. A \`CONFIRMED\` must name what you read.

- **PART A — C1–C8: is each round-9 fix real?** A fix is real only if the *mechanism* is gone, not
  if the symptom is quiet. Round 9's own packet is the cautionary example.
- **PART B — the honesty audit.** Round 8 falsified two overclaiming comments; round 9 corrected
  them. Re-check every comment that asserts what the code does. **Comments are claims.** This
  includes the comments round 9 *added* while correcting round 8.
- **PART C — the mutation records.** Round 9 reports six mutations, all now detected, zero
  survivors. That is a strong claim about test quality and the highest-value thing to attack. Ask
  which mutation would *still* survive, and whether a surviving mutation could be invisible in a
  record that only contains the tidy outcome.
- **PART D — scope and verdict**, including whether any claim is *unfalsifiable as stated*.

**Grade in both directions.** Do not inflate a residual into a vulnerability; do not deflate one you
could not reach. If a claim's truth depends on a runtime fact you cannot measure, name the fact and
mark it \`BLOCKED\`, not \`FALSIFIED\`.

---

## §2 — PART A: the claims

| # | Claim | Decidable by reading? |
|---|---|---|
| **C1** | The classifier now fails closed STRUCTURALLY: every spelling of one address yields one classification, because validation happens before parsing and embedded IPv4 is decoded by BIT POSITION, not string shape | **yes, fully** |
| **C2** | The finding-2 fix uses the call that actually releases a LOCKED stream (\`reader.cancel()\`), not the one that throws (\`body.cancel()\`) | **yes, fully** |
| **C3** | That fix is load-bearing: reverting it makes a named test fail, and that test asserts release, not merely invocation | **yes** — the assertion is quoted in §3.6 |
| **C4** | Settlement is recorded AFTER the await, so the harness distinguishes "cancelled" from "cancellation attempted" | **yes, fully** |
| **C5** | Six mutations, all detected, zero survivors — and the three that initially SURVIVED are recorded rather than tidied | reading + the mutation record |
| **C6** | No existing security guard or test was removed to make these fixes land | **yes** — the commits are below, in full |
| **C7** | The source's own comments do not overclaim — including the comments added in round 9 while fixing round 8's overclaims | **yes, fully** |
| **C8** | Ban #50 is met by SPLITTING, not by trimming: no source file reaches 300 lines, and the extracted modules preserve import compatibility for their consumers | **yes, fully** |

### C5 note, stated up front

This is the claim most likely to be softer than it looks. "All six mutations detected" is a claim
about a *test suite's* sensitivity, and a mutation record can be fabricated as easily as written.
You cannot re-run them. What you *can* do is check that the recorded mutations target the mechanisms
the claims depend on, and that the assertion which goes RED is the right assertion.

**Three of the six initially SURVIVED** (M1, M2, M6), and each exposed a real gap in the author's
own tests — M6 most seriously: dropping the \`2000::/3\` allowlist made \`4000::1\`, \`8000::1\` and
\`e000::1\` classify PUBLIC with the suite still green. A record containing only successes would be
the thing to distrust. Judge whether the record is honest *and* whether honest is enough.

---

## §3 — The artifacts, inlined

### 3.1 The sources under review

${sources}

### 3.2 The tests

${tests}

### 3.3 The commits under review, in full

${commits}

### 3.4 The round-9 review being remediated

${round9Review}

### 3.5 The mutation records — the author's evidence for C5

${mutationRecord}

### 3.6 The assertion that makes C3 real

Quoted here so the claim can be checked without hunting through the inlined file. The test that
goes RED when the release is reverted:

\`\`\`js
expect(timeline).not.toContain('body-cancel-locked');
\`\`\`

The harness records \`body-cancel-locked\` **only** when the cancel call is REFUSED. Three distinct
events are possible, and the distinction is the whole point:

| Event | Meaning |
|---|---|
| \`body-settled\` | cancel completed ordinarily |
| \`body-settled-after-error\` | the stream had already failed; cancel still ran to completion |
| \`body-cancel-locked\` | **the cancel was refused — a real leak** |

An earlier version recorded settlement BEFORE the await, which could not tell these apart. That is
why C4 is a separate claim from C3: the fix and the instrument that detects the fix failed for
different reasons.

---

## §4 — Author-run measurements, labelled as such

Everything in this section was run by the AUTHOR on this machine. Treat it as claims, not evidence:
you cannot reproduce any of it.

| Measurement | Result |
|---|---|
| \`vitest run\` — the six round-9 suites | **6 files, 126 tests, all passing** |
| C3 mutation — revert \`reader.cancel\` to \`body.cancel\` | **1 RED** — \`AssertionError: expected [...] to not include 'body-cancel-locked'\` (1 failed \\| 6 passed) |
| Packet self-verification (\`verify-r9-packet.mjs\`) | **11 verified, 0 mismatched, 0 absent** — of which 1 verifies only under the documented path redaction |
| ban #50 (no source file >= 300 lines) | 138 / 199 / 99 / 237 / 296 / 286 / 189 / 135 / 146 / 171 / 147 / 265 — all under |

**A correction carried into this round.** The round-9 packet's per-block \`sha256\` headers were
computed on the UNSTRIPPED file text while the fenced body was embedded STRIPPED, so every header
described a byte-string that appears nowhere in the packet and \`verify-r9-packet.mjs\` reported 11
of 11 as MISMATCH. The content was always correct — the headers were not. Fixed by normalising once
and hashing what is embedded; proven by reverting only the header, which reproduces the failure.
**This is stated here because it is the same defect class as §0**: a claim about the artifact that
the artifact did not support.

---

## §5 — What this packet cannot give you, and does not pretend to

- **You cannot re-run the mutations**, so C5 rests on an author-supplied record. The record is
  honest (it contains three failures) but it is still the author's.
- **You cannot measure the socket or stream layer.** C3's evidence is a recorded timeline, not a
  live read. The assertion is quoted in §3.6 precisely so you can judge it as text.
- **You cannot verify the hashes are of the bytes you are reading** — a packet cannot prove its own
  integrity to a shell-less reader. What you *can* do is note the sha256 above each block and check
  the bodies are self-consistent with their descriptions.
- **The repo's object store is damaged and history has moved under this work.** Two earlier fix
  commits (\`67de00ee0\`, \`7a23939cf\`) and their parent (\`6cca20594\`) are ABSENT from the store.
  The fixes were re-landed as the commit below; the original commits cannot be shown, and their
  absence is stated here rather than papered over. See §3.3.
- **C1's structural claim is decidable by reading; its runtime consequence is not.** The claim is
  that representation cannot reach the answer. That is a property of the code's shape, which you
  can check. It is not a claim that no address is misclassified in production.
`;
}
